import { PLAYER_STAT_OVERRIDES } from "./player-stat-overrides";
import { normalize, playerKey, resolveTeam } from "./_lib/world-cup-data";

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type StatRow = {
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  tackles: number;
  interceptions: number;
  saves: number;
  cleanSheets: number;
  source: "api" | "manual" | "hybrid";
  updatedAt: string;
};

const TOURNAMENT_START = new Date("2026-06-11T00:00:00.000Z");
const TOURNAMENT_END = new Date("2026-07-20T00:00:00.000Z");

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
      "User-Agent": "Fan26TournamentStats/3.0",
    },
  });

  if (!upstream.ok) {
    throw new Error(`${url} returned ${upstream.status}`);
  }

  return upstream.json() as Promise<any>;
};

const blankStats = (): StatRow => ({
  appearances: 0,
  starts: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  tackles: 0,
  interceptions: 0,
  saves: 0,
  cleanSheets: 0,
  source: "api",
  updatedAt: new Date().toISOString(),
});

const numeric = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

const readMappedNumber = (
  labels: unknown[],
  values: unknown[],
  candidates: string[],
) => {
  const map = new Map<string, unknown>();
  labels.forEach((label, index) => map.set(normalize(label), values[index]));

  for (const candidate of candidates) {
    const key = normalize(candidate);
    if (!map.has(key)) continue;
    return numeric(map.get(key));
  }

  return 0;
};

const getOrCreate = (stats: Map<string, StatRow>, key: string) => {
  const existing = stats.get(key);
  if (existing) return existing;

  const created = blankStats();
  stats.set(key, created);
  return created;
};

const parseBoxScore = (summary: any, stats: Map<string, StatRow>) => {
  const coverage = { goals: false, assists: false };
  const startingGoalkeepers = new Map<string, string>();

  for (const teamBlock of summary?.boxscore?.players ?? []) {
    const team = resolveTeam(teamNameFromBlock(teamBlock));
    if (!team) continue;

    const seenInMatch = new Set<string>();

    for (const category of teamBlock?.statistics ?? []) {
      const labels: unknown[] =
        Array.isArray(category?.labels) && category.labels.length > 0
          ? category.labels
          : category?.keys ?? [];

      const normalizedLabels = labels.map(normalize);
      coverage.goals ||= normalizedLabels.some((label) =>
        ["g", "goal", "goals"].includes(label),
      );
      coverage.assists ||= normalizedLabels.some((label) =>
        ["a", "assist", "assists"].includes(label),
      );

      for (const athleteRow of category?.athletes ?? []) {
        const name = athleteName(athleteRow);
        if (!name) continue;

        const key = playerKey(team.slug, name);
        const row = getOrCreate(stats, key);
        const values: unknown[] = athleteRow?.stats ?? [];

        if (!seenInMatch.has(key)) {
          row.appearances += 1;
          if (athleteRow?.starter === true) row.starts += 1;
          seenInMatch.add(key);
        }

        row.minutes += readMappedNumber(labels, values, ["MIN", "Minutes"]);
        row.goals += readMappedNumber(labels, values, ["G", "Goal", "Goals"]);
        row.assists += readMappedNumber(labels, values, ["A", "Assist", "Assists"]);
        row.tackles += readMappedNumber(labels, values, [
          "Tackles",
          "Tkl",
          "Total Tackles",
        ]);
        row.interceptions += readMappedNumber(labels, values, [
          "Interceptions",
          "Int",
        ]);
        row.saves += readMappedNumber(labels, values, [
          "Saves",
          "SV",
          "Goalkeeper Saves",
        ]);

        if (
          athleteRow?.starter === true &&
          ["GK", "G", "GOALKEEPER"].includes(athletePosition(athleteRow))
        ) {
          startingGoalkeepers.set(team.slug, key);
        }
      }
    }
  }

  const competition = summary?.header?.competitions?.[0];

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
      getOrCreate(stats, goalkeeperKey).cleanSheets += 1;
    }
  }

  return coverage;
};

const resolveDetailTeam = (detail: any, summary: any) => {
  const direct = resolveTeam(
    detail?.team?.displayName ??
      detail?.team?.shortDisplayName ??
      detail?.team?.name,
  );
  if (direct) return direct;

  const detailTeamId = String(detail?.team?.id ?? detail?.teamId ?? "");
  if (!detailTeamId) return undefined;

  const competition = summary?.header?.competitions?.[0];
  const competitor = (competition?.competitors ?? []).find(
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

const scoringDetails = (summary: any): any[] => {
  const candidates = [
    summary?.header?.competitions?.[0]?.details,
    summary?.details,
    summary?.scoringPlays,
    summary?.keyEvents,
    summary?.plays,
  ];

  return (
    candidates.find(
      (candidate) => Array.isArray(candidate) && candidate.length > 0,
    ) ?? []
  );
};

const parseScoringEvents = (
  summary: any,
  stats: Map<string, StatRow>,
  coverage: { goals: boolean; assists: boolean },
) => {
  for (const detail of scoringDetails(summary)) {
    const eventText = String(
      detail?.type?.text ??
        detail?.type?.description ??
        detail?.shortText ??
        detail?.text ??
        "",
    );

    const isScoringPlay =
      detail?.scoringPlay === true ||
      detail?.isScoreChange === true ||
      /\bgoal\b/i.test(eventText);

    if (!isScoringPlay) continue;

    const team = resolveDetailTeam(detail, summary);
    if (!team) continue;

    const athletes =
      detail?.athletesInvolved ??
      detail?.participants ??
      detail?.athletes ??
      [];

    const scorer = athleteName(athletes[0]);
    if (!coverage.goals && scorer) {
      getOrCreate(stats, playerKey(team.slug, scorer)).goals += 1;
    }

    const assistItem =
      athletes.find((athlete: any) =>
        /assist/i.test(
          String(
            athlete?.type ??
              athlete?.role ??
              athlete?.athlete?.type ??
              athlete?.athlete?.role ??
              "",
          ),
        ),
      ) ?? athletes[1];

    const assist = athleteName(assistItem);
    if (!coverage.assists && assist) {
      getOrCreate(stats, playerKey(team.slug, assist)).assists += 1;
    }
  }
};

const getEventStatus = (event: any) =>
  event?.status ?? event?.competitions?.[0]?.status;

const isCompletedEvent = (event: any) => {
  const status = getEventStatus(event);
  return (
    status?.type?.completed === true ||
    status?.type?.state === "post"
  );
};

const fetchCompletedEvents = async () => {
  const todayPlusOne = addUtcDays(new Date(), 1);
  const end = todayPlusOne < TOURNAMENT_END ? todayPlusOne : TOURNAMENT_END;
  const range = `${compactDate(TOURNAMENT_START)}-${compactDate(end)}`;

  try {
    const payload = await fetchJson(scoreboardEndpoint(range));
    const completed = (payload?.events ?? []).filter(isCompletedEvent);

    if (completed.length > 0) {
      return completed;
    }
  } catch {
    // ESPN range requests occasionally fail. Daily requests are the fallback.
  }

  const events = new Map<string, any>();

  for (
    let cursor = new Date(TOURNAMENT_START);
    cursor <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    try {
      const payload = await fetchJson(scoreboardEndpoint(compactDate(cursor)));

      for (const event of payload?.events ?? []) {
        if (event?.id && isCompletedEvent(event)) {
          events.set(String(event.id), event);
        }
      }
    } catch {
      // Keep successful dates instead of failing the entire response.
    }
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

const applyOverrides = (stats: Map<string, StatRow>) => {
  const now = new Date().toISOString();

  for (const [key, override] of Object.entries(PLAYER_STAT_OVERRIDES)) {
    const existed = stats.has(key);
    const current = getOrCreate(stats, key);

    Object.assign(current, override, {
      source: existed ? "hybrid" : "manual",
      updatedAt: now,
    });
  }
};

export const config = { maxDuration: 60 };

export default async function handler(
  _request: unknown,
  response: ApiResponse,
) {
  try {
    const events = await fetchCompletedEvents();
    const summaries = await fetchSummariesInBatches(events);
    const stats = new Map<string, StatRow>();

    for (const summary of summaries) {
      const coverage = parseBoxScore(summary, stats);
      parseScoringEvents(summary, stats, coverage);
    }

    applyOverrides(stats);

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600",
    );

    response.status(200).json({
      source: "ESPN World Cup summaries plus repository overrides",
      fetchedAt: new Date().toISOString(),
      completedMatches: events.length,
      parsedMatches: summaries.length,
      playerStatsCount: stats.size,
      stats: Object.fromEntries(stats),
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
