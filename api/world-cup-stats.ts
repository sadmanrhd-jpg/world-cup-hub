/* eslint-disable @typescript-eslint/no-explicit-any */
import { PLAYER_STAT_OVERRIDES } from "./player-stat-overrides";
import {
  TEAMS,
  normalize,
  playerKey,
  resolveTeam,
  type TeamDefinition,
} from "./_lib/world-cup-data";

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type StatCategory = "goals" | "assists" | "yellowCards" | "redCards";

type StatRow = {
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  tackles: number;
  interceptions: number;
  saves: number;
  cleanSheets: number;
  source: "api" | "manual" | "hybrid";
  updatedAt: string;
};

type PlayerAccumulator = StatRow & {
  name: string;
  teamSlug: string;
  country: string;
  countryCode: string;
};

type Coverage = Record<StatCategory, boolean>;

const TOURNAMENT_START = new Date("2026-06-11T00:00:00.000Z");
const TOURNAMENT_END = new Date("2026-07-20T00:00:00.000Z");

const COUNTRY_CODES: Record<string, string> = {
  mexico: "MEX",
  "south-africa": "RSA",
  "korea-republic": "KOR",
  czechia: "CZE",
  canada: "CAN",
  "bosnia-herzegovina": "BIH",
  qatar: "QAT",
  switzerland: "SUI",
  haiti: "HAI",
  scotland: "SCO",
  brazil: "BRA",
  morocco: "MAR",
  usa: "USA",
  paraguay: "PAR",
  australia: "AUS",
  turkiye: "TUR",
  "cote-divoire": "CIV",
  ecuador: "ECU",
  germany: "GER",
  curacao: "CUW",
  netherlands: "NED",
  japan: "JPN",
  sweden: "SWE",
  tunisia: "TUN",
  iran: "IRN",
  "new-zealand": "NZL",
  belgium: "BEL",
  egypt: "EGY",
  "saudi-arabia": "KSA",
  uruguay: "URU",
  spain: "ESP",
  "cabo-verde": "CPV",
  france: "FRA",
  senegal: "SEN",
  iraq: "IRQ",
  norway: "NOR",
  argentina: "ARG",
  algeria: "ALG",
  austria: "AUT",
  jordan: "JOR",
  portugal: "POR",
  "congo-dr": "COD",
  uzbekistan: "UZB",
  colombia: "COL",
  ghana: "GHA",
  panama: "PAN",
  england: "ENG",
  croatia: "CRO",
};

const STAT_ALIASES: Record<StatCategory | "minutes" | "tackles" | "interceptions" | "saves", string[]> = {
  goals: ["G", "GL", "GLS", "GOAL", "GOALS"],
  assists: ["A", "AST", "ASSIST", "ASSISTS", "GOALASSISTS"],
  yellowCards: ["YC", "YELLOW", "YELLOWCARD", "YELLOWCARDS"],
  redCards: ["RC", "RED", "REDCARD", "REDCARDS"],
  minutes: ["MIN", "MINS", "MINUTES", "MINUTESPLAYED", "TIMEPLAYED"],
  tackles: ["TK", "TKL", "TACKLE", "TACKLES", "TOTALTACKLE", "TOTALTACKLES"],
  interceptions: ["INT", "INTERCEPTION", "INTERCEPTIONS"],
  saves: ["SV", "SVS", "SAVE", "SAVES", "GOALKEEPERSAVES"],
};

const compactDate = (date: Date) =>
  date.toISOString().slice(0, 10).replace(/-/g, "");

const addUtcDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const scoreboardEndpoint = (dates: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dates}&limit=500`;

const summaryEndpoint = (eventId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;

const fetchJson = async (url: string) => {
  const upstream = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Fan26TournamentStats/4.0",
    },
  });

  if (!upstream.ok) {
    throw new Error(`${url} returned ${upstream.status}`);
  }

  return upstream.json() as Promise<any>;
};

const numeric = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const text = String(value ?? "").trim();
  const minuteMatch = text.match(/^(\d{1,3})(?::\d{2}|\+\d{1,2})$/);
  if (minuteMatch) return Number(minuteMatch[1]);

  const parsed = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const statKey = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const blankStats = (): StatRow => ({
  appearances: 0,
  starts: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  tackles: 0,
  interceptions: 0,
  saves: 0,
  cleanSheets: 0,
  source: "api",
  updatedAt: new Date().toISOString(),
});

const countryCode = (team: TeamDefinition) =>
  COUNTRY_CODES[team.slug] ?? team.name.slice(0, 3).toUpperCase();

const getOrCreate = (
  stats: Map<string, PlayerAccumulator>,
  team: TeamDefinition,
  name: string,
) => {
  const key = playerKey(team.slug, name);
  const existing = stats.get(key);
  if (existing) return existing;

  const created: PlayerAccumulator = {
    ...blankStats(),
    name: name.trim(),
    teamSlug: team.slug,
    country: team.name,
    countryCode: countryCode(team),
  };

  stats.set(key, created);
  return created;
};

const athleteName = (item: any) =>
  item?.athlete?.displayName ??
  item?.athlete?.fullName ??
  item?.athlete?.shortName ??
  item?.displayName ??
  item?.fullName ??
  item?.shortName ??
  item?.name ??
  "";

const athletePosition = (item: any) =>
  String(
    item?.athlete?.position?.abbreviation ??
      item?.athlete?.position?.name ??
      item?.position?.abbreviation ??
      item?.position?.name ??
      "",
  ).toUpperCase();

const teamNameFromBlock = (teamBlock: any) =>
  teamBlock?.team?.displayName ??
  teamBlock?.team?.shortDisplayName ??
  teamBlock?.team?.name ??
  "";

const buildObjectStatMap = (statsList: unknown[]) => {
  const map = new Map<string, number>();

  for (const item of statsList) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const stat = item as Record<string, unknown>;
    const value = stat.value ?? stat.displayValue;

    for (const label of [stat.abbreviation, stat.name, stat.label, stat.shortDisplayName]) {
      const key = statKey(label);
      if (key) map.set(key, numeric(value));
    }
  }

  return map;
};

const buildFlatStatMap = (labels: unknown[], values: unknown[]) => {
  const map = new Map<string, number>();
  labels.forEach((label, index) => {
    const key = statKey(label);
    if (key) map.set(key, numeric(values[index]));
  });
  return map;
};

const hasAlias = (map: Map<string, number>, aliases: string[]) =>
  aliases.some((alias) => map.has(statKey(alias)));

const readAlias = (map: Map<string, number>, aliases: string[]) => {
  for (const alias of aliases) {
    const key = statKey(alias);
    if (map.has(key)) return map.get(key) ?? 0;
  }
  return 0;
};

const applyStatMap = (
  row: PlayerAccumulator,
  map: Map<string, number>,
  coverage: Coverage,
) => {
  for (const category of ["goals", "assists", "yellowCards", "redCards"] as StatCategory[]) {
    const aliases = STAT_ALIASES[category];
    if (hasAlias(map, aliases)) coverage[category] = true;
    row[category] += readAlias(map, aliases);
  }

  row.minutes += readAlias(map, STAT_ALIASES.minutes);
  row.tackles += readAlias(map, STAT_ALIASES.tackles);
  row.interceptions += readAlias(map, STAT_ALIASES.interceptions);
  row.saves += readAlias(map, STAT_ALIASES.saves);
};

const playerAppeared = (entry: any, map: Map<string, number>) => {
  if (entry?.starter === true) return true;
  if (numeric(entry?.subbedIn) > 0) return true;
  if (readAlias(map, STAT_ALIASES.minutes) > 0) return true;

  return [
    "goals",
    "assists",
    "yellowCards",
    "redCards",
  ].some((category) => readAlias(map, STAT_ALIASES[category as StatCategory]) > 0);
};

const parseRosters = (
  summary: any,
  stats: Map<string, PlayerAccumulator>,
  coverage: Coverage,
) => {
  const startingGoalkeepers = new Map<string, string>();

  for (const teamBlock of summary?.rosters ?? []) {
    const team = resolveTeam(teamNameFromBlock(teamBlock));
    if (!team) continue;

    for (const entry of teamBlock?.roster ?? []) {
      const name = athleteName(entry);
      if (!name) continue;

      const map = buildObjectStatMap(entry?.stats ?? []);
      if (map.size === 0) continue;

      const row = getOrCreate(stats, team, name);
      applyStatMap(row, map, coverage);

      if (playerAppeared(entry, map)) row.appearances += 1;
      if (entry?.starter === true) row.starts += 1;

      if (
        entry?.starter === true &&
        ["GK", "G", "GOALKEEPER"].includes(athletePosition(entry))
      ) {
        startingGoalkeepers.set(team.slug, playerKey(team.slug, name));
      }
    }
  }

  return startingGoalkeepers;
};

const parseBoxScorePlayers = (
  summary: any,
  stats: Map<string, PlayerAccumulator>,
  coverage: Coverage,
  startingGoalkeepers: Map<string, string>,
) => {
  for (const teamBlock of summary?.boxscore?.players ?? []) {
    const team = resolveTeam(teamNameFromBlock(teamBlock));
    if (!team) continue;

    const seenInMatch = new Set<string>();

    for (const category of teamBlock?.statistics ?? []) {
      const labels: unknown[] =
        Array.isArray(category?.labels) && category.labels.length > 0
          ? category.labels
          : category?.keys ?? [];

      for (const athleteRow of category?.athletes ?? []) {
        const name = athleteName(athleteRow);
        if (!name) continue;

        const key = playerKey(team.slug, name);
        const map = buildFlatStatMap(labels, athleteRow?.stats ?? []);
        const row = getOrCreate(stats, team, name);
        applyStatMap(row, map, coverage);

        if (!seenInMatch.has(key) && playerAppeared(athleteRow, map)) {
          row.appearances += 1;
          if (athleteRow?.starter === true) row.starts += 1;
          seenInMatch.add(key);
        }

        if (
          athleteRow?.starter === true &&
          ["GK", "G", "GOALKEEPER"].includes(athletePosition(athleteRow))
        ) {
          startingGoalkeepers.set(team.slug, key);
        }
      }
    }
  }
};

const competitionFromSummary = (summary: any) =>
  summary?.header?.competitions?.[0];

const resolveDetailTeam = (detail: any, summary: any) => {
  const direct = resolveTeam(
    detail?.team?.displayName ??
      detail?.team?.shortDisplayName ??
      detail?.team?.name,
  );
  if (direct) return direct;

  const detailTeamId = String(detail?.team?.id ?? detail?.teamId ?? "");
  if (!detailTeamId) return undefined;

  const competitor = (competitionFromSummary(summary)?.competitors ?? []).find(
    (candidate: any) =>
      String(candidate?.id ?? "") === detailTeamId ||
      String(candidate?.team?.id ?? "") === detailTeamId,
  );

  return resolveTeam(
    competitor?.team?.displayName ??
      competitor?.team?.shortDisplayName ??
      competitor?.team?.name,
  );
};

const parsePlayerAndTeamFromText = (text: string) => {
  const matches = text.matchAll(/([^.!?]+?)\s+\(([^)]+)\)/g);

  for (const match of matches) {
    const team = resolveTeam(match[2]);
    const name = match[1]?.trim();
    if (team && name) return { team, name };
  }

  return undefined;
};

const cleanAssistName = (value: string) =>
  value
    .replace(/\s+with\s+.*$/i, "")
    .replace(/\s+following\s+.*$/i, "")
    .replace(/\s+after\s+.*$/i, "")
    .trim();

const summaryEvents = (summary: any): any[] => {
  const candidates = [
    summary?.keyEvents,
    competitionFromSummary(summary)?.details,
    summary?.details,
    summary?.scoringPlays,
  ];

  return (
    candidates.find(
      (candidate) => Array.isArray(candidate) && candidate.length > 0,
    ) ?? []
  );
};

const parseKeyEvents = (
  summary: any,
  stats: Map<string, PlayerAccumulator>,
  coverage: Coverage,
) => {
  const seen = new Set<string>();

  for (const detail of summaryEvents(summary)) {
    const typeText = String(
      detail?.type?.text ??
        detail?.type?.description ??
        detail?.shortText ??
        "",
    );
    const text = String(detail?.text ?? detail?.shortText ?? typeText ?? "");
    const signature = `${detail?.clock?.displayValue ?? ""}|${typeText}|${text}`;
    if (seen.has(signature)) continue;
    seen.add(signature);

    const playerFromText = parsePlayerAndTeamFromText(text);
    const detailTeam = resolveDetailTeam(detail, summary);
    const team = playerFromText?.team ?? detailTeam;
    const structuredName = athleteName(
      detail?.athletesInvolved?.[0] ??
        detail?.participants?.[0] ??
        detail?.athletes?.[0],
    );
    const playerName = structuredName || playerFromText?.name || "";

    const isOwnGoal = /\bown goal\b/i.test(`${typeText} ${text}`);
    const isGoal =
      detail?.scoringPlay === true ||
      detail?.isScoreChange === true ||
      /\bgoal!?\b/i.test(typeText);

    if (!coverage.goals && isGoal && !isOwnGoal && team && playerName) {
      getOrCreate(stats, team, playerName).goals += 1;
    }

    if (!coverage.assists && isGoal && team) {
      const structuredAssist =
        (detail?.athletesInvolved ?? detail?.participants ?? detail?.athletes ?? [])
          .slice(1)
          .map(athleteName)
          .find(Boolean) ?? "";
      const textAssist = text.match(/Assisted by\s+([^.;]+)/i)?.[1] ?? "";
      const assistName = structuredAssist || cleanAssistName(textAssist);

      if (assistName) getOrCreate(stats, team, assistName).assists += 1;
    }

    const isYellow = /\byellow card\b/i.test(`${typeText} ${text}`);
    if (!coverage.yellowCards && isYellow && team && playerName) {
      getOrCreate(stats, team, playerName).yellowCards += 1;
    }

    const isRed = /\bred card\b/i.test(`${typeText} ${text}`);
    if (!coverage.redCards && isRed && team && playerName) {
      getOrCreate(stats, team, playerName).redCards += 1;
    }
  }
};

const applyCleanSheets = (
  summary: any,
  stats: Map<string, PlayerAccumulator>,
  startingGoalkeepers: Map<string, string>,
) => {
  const competition = competitionFromSummary(summary);

  for (const competitor of competition?.competitors ?? []) {
    const team = resolveTeam(
      competitor?.team?.displayName ??
        competitor?.team?.shortDisplayName ??
        competitor?.team?.name,
    );
    if (!team) continue;

    const opponent = (competition?.competitors ?? []).find(
      (candidate: any) => candidate?.id !== competitor?.id,
    );
    const conceded = numeric(opponent?.score);
    const goalkeeperKey = startingGoalkeepers.get(team.slug);

    if (goalkeeperKey && conceded === 0) {
      const goalkeeper = stats.get(goalkeeperKey);
      if (goalkeeper) goalkeeper.cleanSheets += 1;
    }
  }
};

const parseSummary = (summary: any, stats: Map<string, PlayerAccumulator>) => {
  const coverage: Coverage = {
    goals: false,
    assists: false,
    yellowCards: false,
    redCards: false,
  };

  const startingGoalkeepers = parseRosters(summary, stats, coverage);
  parseBoxScorePlayers(summary, stats, coverage, startingGoalkeepers);
  parseKeyEvents(summary, stats, coverage);
  applyCleanSheets(summary, stats, startingGoalkeepers);
};

const getEventStatus = (event: any) =>
  event?.status ?? event?.competitions?.[0]?.status;

const isCompletedEvent = (event: any) => {
  const status = getEventStatus(event);
  return status?.type?.completed === true || status?.type?.state === "post";
};

const fetchCompletedEvents = async () => {
  const todayPlusOne = addUtcDays(new Date(), 1);
  const end = todayPlusOne < TOURNAMENT_END ? todayPlusOne : TOURNAMENT_END;
  const range = `${compactDate(TOURNAMENT_START)}-${compactDate(end)}`;
  let rangeSucceeded = false;

  try {
    const payload = await fetchJson(scoreboardEndpoint(range));
    rangeSucceeded = true;
    const completed = (payload?.events ?? []).filter(isCompletedEvent);
    if (completed.length > 0) return completed;
  } catch {
    // Some ESPN range requests fail. Daily requests below preserve partial data.
  }

  const events = new Map<string, any>();
  const dates: string[] = [];
  let successfulDays = 0;

  for (
    let cursor = new Date(TOURNAMENT_START);
    cursor <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    dates.push(compactDate(cursor));
  }

  for (let index = 0; index < dates.length; index += 10) {
    const batch = dates.slice(index, index + 10);
    const settled = await Promise.allSettled(
      batch.map((date) => fetchJson(scoreboardEndpoint(date))),
    );

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      successfulDays += 1;

      for (const event of result.value?.events ?? []) {
        if (event?.id && isCompletedEvent(event)) {
          events.set(String(event.id), event);
        }
      }
    }
  }

  if (successfulDays === 0 && !rangeSucceeded) {
    throw new Error("ESPN scoreboard is unavailable");
  }

  return Array.from(events.values());
};

const fetchSummariesInBatches = async (events: any[], batchSize = 16) => {
  const summaries: any[] = [];

  for (let index = 0; index < events.length; index += batchSize) {
    const batch = events.slice(index, index + batchSize);
    const settled = await Promise.allSettled(
      batch.map((event) => fetchJson(summaryEndpoint(String(event.id)))),
    );

    for (const result of settled) {
      if (result.status === "fulfilled") summaries.push(result.value);
    }
  }

  return summaries;
};

const applyOverrides = (stats: Map<string, PlayerAccumulator>) => {
  const now = new Date().toISOString();

  for (const [key, override] of Object.entries(PLAYER_STAT_OVERRIDES)) {
    const current = stats.get(key);
    if (!current) continue;

    Object.assign(current, override, {
      source: "hybrid",
      updatedAt: now,
    });
  }
};

const statOnly = (row: PlayerAccumulator): StatRow => ({
  appearances: row.appearances,
  starts: row.starts,
  minutes: row.minutes,
  goals: row.goals,
  assists: row.assists,
  yellowCards: row.yellowCards,
  redCards: row.redCards,
  tackles: row.tackles,
  interceptions: row.interceptions,
  saves: row.saves,
  cleanSheets: row.cleanSheets,
  source: row.source,
  updatedAt: row.updatedAt,
});

const buildLeaders = (
  stats: Map<string, PlayerAccumulator>,
  category: StatCategory,
  limit = 20,
) => {
  const secondary: StatCategory = category === "goals" ? "assists" : "goals";

  return Array.from(stats.values())
    .filter((row) => row[category] > 0)
    .sort((first, second) => {
      const primaryDifference = second[category] - first[category];
      if (primaryDifference !== 0) return primaryDifference;

      const secondaryDifference = second[secondary] - first[secondary];
      if (secondaryDifference !== 0) return secondaryDifference;

      const minuteDifference = first.minutes - second.minutes;
      if (minuteDifference !== 0) return minuteDifference;

      return first.name.localeCompare(second.name);
    })
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      name: row.name,
      country: row.country,
      countryCode: row.countryCode,
      goals: row.goals,
      assists: row.assists,
      yellowCards: row.yellowCards,
      redCards: row.redCards,
    }));
};

export const config = { maxDuration: 60 };

export default async function handler(
  _request: unknown,
  response: ApiResponse,
) {
  try {
    const events = await fetchCompletedEvents();
    const summaries = await fetchSummariesInBatches(events);

    if (events.length > 0 && summaries.length === 0) {
      throw new Error("ESPN returned fixtures but no readable match summaries");
    }

    const stats = new Map<string, PlayerAccumulator>();
    for (const summary of summaries) parseSummary(summary, stats);
    applyOverrides(stats);

    const leaders = {
      goals: buildLeaders(stats, "goals"),
      assists: buildLeaders(stats, "assists"),
      yellowCards: buildLeaders(stats, "yellowCards"),
      redCards: buildLeaders(stats, "redCards"),
    };

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=1800",
    );

    response.status(200).json({
      source: "ESPN World Cup scoreboard and match summaries",
      fetchedAt: new Date().toISOString(),
      completedMatches: events.length,
      parsedMatches: summaries.length,
      playerStatsCount: stats.size,
      leaders,
      stats: Object.fromEntries(
        Array.from(stats.entries()).map(([key, row]) => [key, statOnly(row)]),
      ),
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Tournament statistics request failed",
    });
  }
}
