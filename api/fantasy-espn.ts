export const config = {
  maxDuration: 60,
};

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

type Position = "GK" | "DEF" | "MID" | "FW";
type RoundCode = "QF" | "SF" | "FINAL";

type EspnTeam = {
  id?: string;
  displayName?: string;
  abbreviation?: string;
  logo?: string;
};

type EspnCompetitor = {
  id?: string;
  score?: string;
  winner?: boolean;
  team?: EspnTeam;
};

type EspnCompetition = {
  competitors?: EspnCompetitor[];
  notes?: Array<{ headline?: string }>;
  status?: {
    period?: number;
    clock?: number;
    type?: {
      completed?: boolean;
      state?: string;
      description?: string;
      shortDetail?: string;
    };
  };
  type?: { text?: string; abbreviation?: string };
  altGameNote?: string;
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: EspnCompetition["status"];
  competitions?: EspnCompetition[];
};

type AggregatedPlayer = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  position: Position;
  headshotUrl: string | null;
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  fantasyPoints: number;
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const TOURNAMENT_RANGE = "20260611-20260719";
const REQUEST_TIMEOUT_MS = 8_000;
const SUMMARY_CONCURRENCY = 8;

const KNOWN_QF_TEAM_NAMES = new Set([
  "France",
  "Morocco",
  "Spain",
  "Belgium",
  "Norway",
  "England",
  "Argentina",
  "Switzerland",
]);

const positionBasePrice: Record<Position, number> = {
  GK: 4.5,
  DEF: 5,
  MID: 6,
  FW: 6.5,
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Fan26-Fantasy/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ESPN request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const mapLimit = async <T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(values.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  });

  await Promise.all(workers);
  return results;
};

const stageText = (event: EspnEvent) => {
  const competition = event.competitions?.[0];
  return [
    event.name,
    event.shortName,
    competition?.altGameNote,
    competition?.type?.text,
    competition?.type?.abbreviation,
    ...(competition?.notes?.map((note) => note.headline) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const eventRound = (event: EspnEvent): RoundCode | null => {
  const text = stageText(event);
  if (/quarter.?final|quarterfinal/.test(text)) return "QF";
  if (/semi.?final|semifinal/.test(text)) return "SF";
  if (/third.?place|3rd.?place|final/.test(text)) return "FINAL";
  return null;
};

const isCompleted = (event: EspnEvent) =>
  Boolean(
    event.status?.type?.completed ??
      event.competitions?.[0]?.status?.type?.completed,
  );

const isRealTeam = (team: EspnTeam | undefined) => {
  const name = team?.displayName?.trim() ?? "";
  return Boolean(
    team?.id &&
      name &&
      !/tbd|winner of|loser of|to be determined/i.test(name),
  );
};

const isKnownQuarterfinalTeam = (team: EspnTeam | undefined) =>
  Boolean(team?.displayName && KNOWN_QF_TEAM_NAMES.has(team.displayName));

const determineCurrentRound = (events: EspnEvent[]): RoundCode => {
  const quarterfinals = events.filter((event) => eventRound(event) === "QF");
  const semifinals = events.filter((event) => eventRound(event) === "SF");

  if (quarterfinals.length === 0 || quarterfinals.some((event) => !isCompleted(event))) {
    return "QF";
  }

  if (semifinals.length === 0 || semifinals.some((event) => !isCompleted(event))) {
    return "SF";
  }

  return "FINAL";
};

const budgetForRound = (round: RoundCode) =>
  round === "QF" ? 105 : round === "SF" ? 125 : 135;

const roundName = (round: RoundCode) =>
  round === "QF" ? "Quarter-finals" : round === "SF" ? "Semi-finals" : "Final";

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const statValue = (
  stats: Array<Record<string, unknown>> | undefined,
  aliases: string[],
) => {
  const lowerAliases = aliases.map((alias) => alias.toLowerCase());
  const stat = stats?.find((item) => {
    const name = String(item.name ?? item.label ?? item.abbreviation ?? "").toLowerCase();
    return lowerAliases.includes(name);
  });

  return parseNumber(stat?.value ?? stat?.displayValue);
};

const textFromPositionValue = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textFromPositionValue).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      record.abbreviation,
      record.name,
      record.displayName,
      record.shortName,
      record.type,
      record.text,
      record.position,
    ]
      .map(textFromPositionValue)
      .filter(Boolean)
      .join(" ");
  }
  return "";
};

const normalizePosition = (...values: unknown[]): Position | null => {
  const text = values.map(textFromPositionValue).join(" ").toLowerCase();
  if (!text.trim()) return null;

  if (/\b(gk|g|goalkeeper|keeper|goalie)\b/.test(text)) return "GK";
  if (
    /\b(def|df|d|defender|defence|defense|back|centre-back|center-back|center back|centre back|fullback|full back|left back|right back|cb|lb|rb|lcb|rcb|rwb|lwb)\b/.test(text)
  ) {
    return "DEF";
  }
  if (
    /\b(mid|mf|m|midfielder|midfield|centre-midfield|center-midfield|central midfield|defensive midfield|attacking midfield|cm|dm|cdm|am|cam|lm|rm|lcm|rcm)\b/.test(text)
  ) {
    return "MID";
  }
  if (
    /\b(fw|f|forward|striker|attacker|attack|winger|left wing|right wing|centre-forward|center-forward|cf|st|lw|rw|lf|rf)\b/.test(text)
  ) {
    return "FW";
  }
  return null;
};

const substitutionMinute = (value: unknown) => {
  if (typeof value === "object" && value) {
    const record = value as Record<string, unknown>;
    const clock = record.clock as Record<string, unknown> | undefined;
    return parseNumber(clock?.displayValue ?? clock?.value) || null;
  }
  return null;
};

const didSub = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "object" && value) {
    const record = value as Record<string, unknown>;
    return Boolean(record.didSub ?? record.happened ?? true);
  }
  return false;
};

const estimateMinutes = (rosterEntry: Record<string, unknown>) => {
  const stats = rosterEntry.stats as Array<Record<string, unknown>> | undefined;
  const direct = statValue(stats, ["minutes", "minutesplayed", "mins"]);
  if (direct > 0) return Math.min(120, direct);

  const starter = Boolean(rosterEntry.starter);
  const subbedIn = didSub(rosterEntry.subbedIn);
  const subbedOut = didSub(rosterEntry.subbedOut);
  const inMinute = substitutionMinute(rosterEntry.subbedIn);
  const outMinute = substitutionMinute(rosterEntry.subbedOut);

  if (starter && subbedOut) return Math.min(120, outMinute ?? 70);
  if (starter) return 90;
  if (subbedIn && subbedOut) {
    return Math.max(1, (outMinute ?? 85) - (inMinute ?? 60));
  }
  if (subbedIn) return Math.max(1, 90 - (inMinute ?? 60));
  return 0;
};

const roundHalf = (value: number) => Math.round(value * 2) / 2;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const calculatePrice = (player: AggregatedPlayer) => {
  const appearanceRate = player.matches > 0 ? player.starts / player.matches : 0;
  const performanceBoost = Math.max(-1, player.fantasyPoints) * 0.09;
  const minutesBoost = Math.min(1.25, player.minutes / 450);
  const reliabilityBoost = appearanceRate * 0.75;

  return roundHalf(
    clamp(
      positionBasePrice[player.position] +
        performanceBoost +
        minutesBoost +
        reliabilityBoost,
      4,
      12,
    ),
  );
};

const athleteIdFromRef = (value: unknown) => {
  const ref = typeof value === "string" ? value : "";
  const match = ref.match(/athletes\/(\d+)/i);
  return match?.[1] ?? "";
};

const collectRosterCandidates = (value: unknown): Array<Record<string, unknown>> => {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const rows: Array<Record<string, unknown>> = [];

  const pushCandidate = (candidate: unknown, inheritedPosition?: unknown) => {
    if (!candidate || typeof candidate !== "object") return;
    const next = candidate as Record<string, unknown>;
    rows.push(
      inheritedPosition && !next.position
        ? { ...next, position: inheritedPosition }
        : next,
    );
  };

  const readArray = (items: unknown, inheritedPosition?: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const itemRecord = item as Record<string, unknown>;
      if (Array.isArray(itemRecord.items)) {
        readArray(itemRecord.items, itemRecord.position ?? itemRecord.displayName ?? itemRecord.name ?? inheritedPosition);
      } else if (Array.isArray(itemRecord.athletes)) {
        readArray(itemRecord.athletes, itemRecord.position ?? itemRecord.displayName ?? itemRecord.name ?? inheritedPosition);
      } else {
        pushCandidate(item, inheritedPosition);
      }
    }
  };

  readArray(record.athletes);
  readArray(record.items);
  readArray(record.roster);

  const team = record.team as Record<string, unknown> | undefined;
  readArray(team?.athletes);
  readArray(team?.roster);

  return rows;
};

const fetchRosterItem = async (item: Record<string, unknown>) => {
  const ref = typeof item.$ref === "string" ? item.$ref : null;
  if (!ref) return item;
  try {
    return await fetchJson<Record<string, unknown>>(ref);
  } catch {
    return item;
  }
};

const rosterUrlsForTeam = (teamId: string) => [
  `${ESPN_BASE}/teams/${encodeURIComponent(teamId)}/roster`,
  `${ESPN_BASE}/teams/${encodeURIComponent(teamId)}/athletes`,
  `https://site.web.api.espn.com/apis/common/v3/sports/soccer/fifa.world/teams/${encodeURIComponent(teamId)}/roster`,
  `https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/teams/${encodeURIComponent(teamId)}/athletes?limit=200`,
];

const mergeRosterPlayers = async (
  teamMap: Map<string, EspnTeam>,
  players: Map<string, AggregatedPlayer>,
) => {
  await mapLimit(Array.from(teamMap.entries()), 4, async ([teamId, team]) => {
    for (const url of rosterUrlsForTeam(teamId)) {
      try {
        const rosterData = await fetchJson<Record<string, unknown>>(url);
        const candidates = collectRosterCandidates(rosterData);
        if (candidates.length === 0) continue;

        const resolved = await mapLimit(candidates, 6, fetchRosterItem);
        let addedForTeam = 0;

        for (const item of resolved) {
          const athlete = (item.athlete as Record<string, unknown> | undefined) ?? item;
          const playerId = String(
            athlete.id ?? item.id ?? athleteIdFromRef(item.$ref) ?? "",
          );
          const playerName = String(
            athlete.displayName ?? athlete.fullName ?? athlete.name ?? item.displayName ?? item.fullName ?? item.name ?? "",
          ).trim();
          const position = normalizePosition(
            item.position,
            item.displayPosition,
            item.lineupSlot,
            item.slot,
            athlete.position,
            athlete.defaultPosition,
          );

          if (!playerId || !playerName || !position) continue;

          const headshotValue =
            (athlete.headshot as Record<string, unknown> | undefined)?.href ??
            (athlete.headshot as Record<string, unknown> | undefined)?.url ??
            (item.headshot as Record<string, unknown> | undefined)?.href ??
            (item.headshot as Record<string, unknown> | undefined)?.url;

          const existing = players.get(playerId) ?? {
            id: playerId,
            name: playerName,
            teamId,
            teamName: String(team.displayName ?? "Unknown team"),
            teamAbbreviation: String(team.abbreviation ?? ""),
            position,
            headshotUrl: typeof headshotValue === "string" ? headshotValue : null,
            matches: 0,
            starts: 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            saves: 0,
            cleanSheets: 0,
            yellowCards: 0,
            redCards: 0,
            fantasyPoints: 0,
          };

          existing.position = position;
          existing.teamId = teamId;
          existing.teamName = String(team.displayName ?? existing.teamName);
          existing.teamAbbreviation = String(team.abbreviation ?? existing.teamAbbreviation);
          if (!existing.headshotUrl && typeof headshotValue === "string") {
            existing.headshotUrl = headshotValue;
          }

          players.set(playerId, existing);
          addedForTeam += 1;
        }

        if (addedForTeam > 0) return;
      } catch {
        // Try the next ESPN roster shape. Their endpoints are not exactly a monument to stability.
      }
    }
  });
};

const statusPeriod = (event: EspnEvent) =>
  event.status?.period ?? event.competitions?.[0]?.status?.period ?? 0;

const buildRoundInfo = (events: EspnEvent[], round: RoundCode) => {
  const roundEvents = events
    .filter((event) => eventRound(event) === round && event.date)
    .sort((a, b) => Date.parse(a.date ?? "") - Date.parse(b.date ?? ""));
  const first = roundEvents[0];
  const firstPeriod = first ? statusPeriod(first) : 0;
  const firstStatus = [
    first?.status?.type?.description,
    first?.status?.type?.shortDetail,
    first?.competitions?.[0]?.status?.type?.description,
    first?.competitions?.[0]?.status?.type?.shortDetail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const firstCompleted = first ? isCompleted(first) : false;
  const halftimeOrLater =
    firstCompleted ||
    firstPeriod >= 2 ||
    /half.?time|second half|extra time|full time/.test(firstStatus);
  const kickoff = first?.date ?? null;
  const lockAt = kickoff
    ? new Date(Date.parse(kickoff) + 60 * 60 * 1000).toISOString()
    : null;

  return {
    code: round,
    name: roundName(round),
    budget: budgetForRound(round),
    completedMatches: roundEvents.filter(isCompleted).length,
    firstMatchId: first?.id ?? null,
    firstMatchKickoff: kickoff,
    lockAt,
    locked: halftimeOrLater,
    lockMessage: halftimeOrLater
      ? `${roundName(round)} squads are locked.`
      : "Changes remain open until halftime of the first match in this round.",
  };
};

const buildPlayerPool = async (events: EspnEvent[], round: RoundCode) => {
  const currentRoundEvents = events.filter((event) => eventRound(event) === round);
  const teamMap = new Map<string, EspnTeam>();

  for (const event of currentRoundEvents) {
    for (const competitor of event.competitions?.[0]?.competitors ?? []) {
      if (isRealTeam(competitor.team)) {
        teamMap.set(String(competitor.team?.id), competitor.team ?? {});
      }
    }
  }

  // ESPN sometimes publishes the knockout labels later than the participant names.
  // For the live Quarter-final update, keep the confirmed eight teams available
  // even if the stage text is temporarily incomplete.
  if (round === "QF" && teamMap.size < 8) {
    for (const event of events) {
      for (const competitor of event.competitions?.[0]?.competitors ?? []) {
        if (isRealTeam(competitor.team) && isKnownQuarterfinalTeam(competitor.team)) {
          teamMap.set(String(competitor.team?.id), competitor.team ?? {});
        }
      }
    }
  }

  const teamIds = new Set(teamMap.keys());
  const relevantCompletedEvents = events.filter((event) => {
    if (!event.id || !isCompleted(event)) return false;
    return (event.competitions?.[0]?.competitors ?? []).some((competitor) =>
      teamIds.has(String(competitor.team?.id ?? "")),
    );
  });

  const summaries = await mapLimit(
    relevantCompletedEvents,
    SUMMARY_CONCURRENCY,
    async (event) => ({
      event,
      summary: await fetchJson<Record<string, unknown>>(
        `${ESPN_BASE}/summary?event=${encodeURIComponent(String(event.id))}`,
      ),
    }),
  );

  const players = new Map<string, AggregatedPlayer>();

  for (const { event, summary } of summaries) {
    const competition = event.competitions?.[0];
    const scores = new Map<string, number>();
    for (const competitor of competition?.competitors ?? []) {
      if (competitor.team?.id) {
        scores.set(String(competitor.team.id), parseNumber(competitor.score));
      }
    }

    const rosterGroups = Array.isArray(summary.rosters)
      ? (summary.rosters as Array<Record<string, unknown>>)
      : [];

    for (const rosterGroup of rosterGroups) {
      const team = rosterGroup.team as EspnTeam | undefined;
      const teamId = String(team?.id ?? "");
      if (!teamIds.has(teamId)) continue;

      const opponent = (competition?.competitors ?? []).find(
        (competitor) => String(competitor.team?.id ?? "") !== teamId,
      );
      const opponentGoals = scores.get(String(opponent?.team?.id ?? "")) ?? 0;
      const roster = Array.isArray(rosterGroup.roster)
        ? (rosterGroup.roster as Array<Record<string, unknown>>)
        : [];

      for (const entry of roster) {
        const athlete = entry.athlete as Record<string, unknown> | undefined;
        const position = normalizePosition(
          entry.position,
          entry.displayPosition,
          entry.lineupSlot,
          entry.slot,
          athlete?.position,
          athlete?.defaultPosition,
        );
        const playerId = String(athlete?.id ?? "");
        const playerName = String(athlete?.displayName ?? athlete?.fullName ?? "").trim();
        if (!playerId || !playerName || !position) continue;

        const minutes = estimateMinutes(entry);

        const stats = entry.stats as Array<Record<string, unknown>> | undefined;
        const goals = statValue(stats, ["totalgoals", "goals"]);
        const assists = statValue(stats, ["goalassists", "assists"]);
        const saves = statValue(stats, ["saves", "totalsaves"]);
        const yellowCards = statValue(stats, ["yellowcards", "yellowcard"]);
        const redCards = statValue(stats, ["redcards", "redcard"]);
        const appeared = minutes > 0;
        const cleanSheet =
          appeared && opponentGoals === 0 && minutes >= 60 && position !== "FW" ? 1 : 0;
        const appearancePoints = appeared ? (minutes >= 60 ? 2 : 1) : 0;
        const cleanSheetPoints =
          cleanSheet === 0 ? 0 : position === "MID" ? 1 : position === "FW" ? 0 : 4;
        const concededPenalty =
          !appeared
            ? 0
            : position === "GK"
              ? Math.floor(opponentGoals / 2) * -2
              : position === "DEF"
                ? Math.floor(opponentGoals / 2) * -1
                : 0;
        const matchFantasyPoints =
          appearancePoints +
          goals * 5 +
          assists * 3 +
          cleanSheetPoints +
          Math.floor(saves / 3) * (position === "GK" ? 2 : 0) +
          concededPenalty -
          yellowCards -
          redCards * 3;

        const existing = players.get(playerId) ?? {
          id: playerId,
          name: playerName,
          teamId,
          teamName: String(team?.displayName ?? "Unknown team"),
          teamAbbreviation: String(team?.abbreviation ?? ""),
          position,
          headshotUrl:
            typeof (athlete?.headshot as Record<string, unknown> | undefined)?.href ===
            "string"
              ? String((athlete?.headshot as Record<string, unknown>).href)
              : null,
          matches: 0,
          starts: 0,
          minutes: 0,
          goals: 0,
          assists: 0,
          saves: 0,
          cleanSheets: 0,
          yellowCards: 0,
          redCards: 0,
          fantasyPoints: 0,
        };

        if (appeared) {
          existing.matches += 1;
          existing.starts += entry.starter ? 1 : 0;
          existing.minutes += minutes;
          existing.goals += goals;
          existing.assists += assists;
          existing.saves += saves;
          existing.cleanSheets += cleanSheet;
          existing.yellowCards += yellowCards;
          existing.redCards += redCards;
          existing.fantasyPoints += matchFantasyPoints;
        }
        players.set(playerId, existing);
      }
    }
  }

  await mergeRosterPlayers(teamMap, players);

  const playerRows = Array.from(players.values())
    .map((player) => ({
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      teamName: player.teamName,
      teamAbbreviation: player.teamAbbreviation,
      position: player.position,
      price: calculatePrice(player),
      headshotUrl: player.headshotUrl,
      stats: {
        matches: player.matches,
        starts: player.starts,
        minutes: Math.round(player.minutes),
        goals: player.goals,
        assists: player.assists,
        saves: player.saves,
        cleanSheets: player.cleanSheets,
        yellowCards: player.yellowCards,
        redCards: player.redCards,
        fantasyPoints: player.fantasyPoints,
      },
    }))
    .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));

  return {
    teams: Array.from(teamMap.values())
      .filter(isRealTeam)
      .map((team) => ({
        id: String(team.id),
        name: String(team.displayName),
        abbreviation: String(team.abbreviation ?? ""),
        logo: typeof team.logo === "string" ? team.logo : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    players: playerRows,
  };
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== "GET") {
    response.status(405).json({ error: "Only GET requests are supported." });
    return;
  }

  try {
    const scoreboard = await fetchJson<{ events?: EspnEvent[] }>(
      `${ESPN_BASE}/scoreboard?dates=${TOURNAMENT_RANGE}&limit=200`,
    );
    const events = scoreboard.events ?? [];

    if (events.length === 0) {
      throw new Error("ESPN returned no World Cup events.");
    }

    const round = determineCurrentRound(events);
    const pool = await buildPlayerPool(events, round);
    const warnings: string[] = [];

    if (pool.teams.length < (round === "QF" ? 8 : round === "SF" ? 4 : 4)) {
      warnings.push(
        "Some round participants are not confirmed yet. The player pool will expand automatically when ESPN confirms the remaining teams.",
      );
    }

    if (pool.players.length === 0) {
      warnings.push("ESPN has not published usable roster details for the current player pool yet.");
    }

    const positionCounts = pool.players.reduce(
      (counts, player) => ({
        ...counts,
        [player.position]: (counts[player.position] ?? 0) + 1,
      }),
      {} as Record<Position, number>,
    );

    for (const position of ["GK", "DEF", "MID", "FW"] as Position[]) {
      if ((positionCounts[position] ?? 0) < 3) {
        warnings.push(`ESPN returned a very small ${position} pool. Refresh again after the squad feed updates.`);
      }
    }

    response.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=3600",
    );
    response.status(200).json({
      source: "ESPN",
      generatedAt: new Date().toISOString(),
      round: buildRoundInfo(events, round),
      teams: pool.teams,
      players: pool.players,
      warnings,
    });
  } catch (error) {
    console.error("Fantasy ESPN sync failed", error);
    response.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Could not load ESPN fantasy data.",
    });
  }
}
