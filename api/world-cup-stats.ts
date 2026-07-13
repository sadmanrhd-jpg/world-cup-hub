/* eslint-disable @typescript-eslint/no-explicit-any */
import {
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
  source: "api";
  updatedAt: string;
};

type PlayerAccumulator = StatRow & {
  name: string;
  teamSlug: string;
  country: string;
  countryCode: string;
};

const SPORTMONKS_BASE = "https://api.sportmonks.com/v3";
const DEFAULT_WORLD_CUP_LEAGUE_ID = "732";
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

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

const compact = (value: unknown) =>
  normalize(value).replace(/statistics?|topscorers?|season|stage/g, "");

const unwrap = (value: any) => value?.data ?? value;

const numeric = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textFrom = (value: any, keys: string[]) => {
  const source = unwrap(value);
  for (const key of keys) {
    const candidate = source?.[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
};

const playerNameFrom = (record: any) => {
  const player = unwrap(record?.player);
  const direct = textFrom(player, [
    "display_name",
    "displayName",
    "full_name",
    "fullName",
    "common_name",
    "commonName",
    "name",
  ]);
  if (direct) return direct;

  const first = textFrom(player, ["firstname", "first_name", "firstName"]);
  const last = textFrom(player, ["lastname", "last_name", "lastName"]);
  return `${first} ${last}`.trim();
};

const teamNameFrom = (record: any) =>
  textFrom(record?.participant, [
    "name",
    "display_name",
    "displayName",
    "short_code",
    "shortCode",
  ]);

const typeLabelFrom = (record: any) => {
  const type = unwrap(record?.type);
  return [
    type?.developer_name,
    type?.developerName,
    type?.name,
    type?.code,
    type?.stat_group,
    type?.statGroup,
  ]
    .filter(Boolean)
    .join(" ");
};

const classifyCategory = (record: any): StatCategory | undefined => {
  const label = compact(typeLabelFrom(record));

  if (label.includes("yellowcard") || label === "yellow") return "yellowCards";
  if (label.includes("redcard") || label === "red") return "redCards";
  if (label.includes("assist")) return "assists";
  if (label.includes("goal") && !label.includes("owngoal")) return "goals";

  return undefined;
};

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
  const current = stats.get(key);
  if (current) return current;

  const created: PlayerAccumulator = {
    ...blankStats(),
    name,
    teamSlug: team.slug,
    country: team.name,
    countryCode: countryCode(team),
  };

  stats.set(key, created);
  return created;
};

const sportmonksRequest = async (
  path: string,
  token: string,
  params: Record<string, string | number | undefined> = {},
) => {
  const url = new URL(`${SPORTMONKS_BASE}${path}`);
  url.searchParams.set("api_token", token);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const upstream = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const body = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const upstreamMessage =
      body?.message ?? body?.error?.message ?? body?.error ?? "Unknown Sportmonks error";
    throw new Error(`Sportmonks returned ${upstream.status}: ${upstreamMessage}`);
  }

  return body;
};

const resolveSeasonId = async (token: string, leagueId: string) => {
  const configured = process.env.SPORTMONKS_WORLD_CUP_SEASON_ID?.trim();
  if (configured) return configured;

  const payload = await sportmonksRequest(
    `/football/leagues/${encodeURIComponent(leagueId)}`,
    token,
    { include: "currentSeason" },
  );

  const league = unwrap(payload);
  const currentSeason = unwrap(league?.currentseason ?? league?.currentSeason);
  const seasonId = String(currentSeason?.id ?? "").trim();

  if (!seasonId) {
    throw new Error(
      "Sportmonks did not return a current World Cup season. Add SPORTMONKS_WORLD_CUP_SEASON_ID in the deployment environment.",
    );
  }

  return seasonId;
};

const hasMorePages = (payload: any, page: number, rowsOnPage: number) => {
  const pagination = payload?.pagination ?? payload?.meta?.pagination ?? payload?.meta;

  if (typeof pagination?.has_more === "boolean") return pagination.has_more;
  if (typeof pagination?.hasMore === "boolean") return pagination.hasMore;

  const current = numeric(pagination?.current_page ?? pagination?.currentPage ?? page);
  const last = numeric(pagination?.last_page ?? pagination?.lastPage);
  if (last > 0) return current < last;

  return rowsOnPage >= PAGE_SIZE;
};

const fetchTopscorerRecords = async (token: string, seasonId: string) => {
  const records: any[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await sportmonksRequest(
      `/football/topscorers/seasons/${encodeURIComponent(seasonId)}`,
      token,
      {
        include: "player;participant;type",
        per_page: PAGE_SIZE,
        page,
        order: "asc",
      },
    );

    const pageRows = Array.isArray(payload?.data) ? payload.data : [];
    for (const record of pageRows) {
      const signature = String(
        record?.id ??
          [record?.season_id, record?.stage_id, record?.player_id, record?.type_id].join(":"),
      );
      if (seen.has(signature)) continue;
      seen.add(signature);
      records.push(record);
    }

    if (!hasMorePages(payload, page, pageRows.length)) break;
  }

  return records;
};

const parseRecords = (records: any[]) => {
  const stats = new Map<string, PlayerAccumulator>();
  let ignoredRecords = 0;

  for (const record of records) {
    const category = classifyCategory(record);
    const playerName = playerNameFrom(record);
    const team = resolveTeam(teamNameFrom(record));
    const total = numeric(record?.total ?? record?.value ?? record?.count);

    if (!category || !playerName || !team || total <= 0) {
      ignoredRecords += 1;
      continue;
    }

    const row = getOrCreate(stats, team, playerName);
    row[category] += total;
  }

  return { stats, ignoredRecords };
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

export default async function handler(_request: unknown, response: ApiResponse) {
  const token = process.env.SPORTMONKS_API_TOKEN?.trim();

  if (!token) {
    response.setHeader("Cache-Control", "no-store");
    response.status(503).json({
      code: "SPORTMONKS_TOKEN_MISSING",
      configurationRequired: true,
      provider: "Sportmonks",
      error: "Live statistics are not configured yet.",
    });
    return;
  }

  try {
    const leagueId =
      process.env.SPORTMONKS_WORLD_CUP_LEAGUE_ID?.trim() ||
      DEFAULT_WORLD_CUP_LEAGUE_ID;
    const seasonId = await resolveSeasonId(token, leagueId);
    const records = await fetchTopscorerRecords(token, seasonId);
    const { stats, ignoredRecords } = parseRecords(records);

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
      source: "Sportmonks Football API",
      fetchedAt: new Date().toISOString(),
      leagueId,
      seasonId,
      completedMatches: 0,
      parsedMatches: 0,
      playerStatsCount: stats.size,
      recordsReceived: records.length,
      ignoredRecords,
      leaders,
      stats: Object.fromEntries(
        Array.from(stats.entries()).map(([key, row]) => [key, statOnly(row)]),
      ),
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      code: "SPORTMONKS_REQUEST_FAILED",
      provider: "Sportmonks",
      error:
        error instanceof Error
          ? error.message
          : "Tournament statistics request failed",
    });
  }
}
