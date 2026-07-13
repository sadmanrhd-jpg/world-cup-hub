/* eslint-disable @typescript-eslint/no-explicit-any */

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

type TeamInfo = {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
};

type FetchAttempt = {
  name: string;
  ok: boolean;
  status?: number;
  message?: string;
  records?: number;
};

const SPORTMONKS_BASE = "https://api.sportmonks.com/v3";
const DEFAULT_WORLD_CUP_LEAGUE_ID = "732";
const TOURNAMENT_START = "2026-06-01";
const TOURNAMENT_END = "2026-07-31";
const PAGE_SIZE = 50;
const TOPSCORER_MAX_PAGES = 5;
const FIXTURE_MAX_PAGES = 3;
const REQUEST_TIMEOUT_MS = 12000;

const TEAM_CODES: Record<string, string> = {
  mexico: "MEX",
  southafrica: "RSA",
  korearepublic: "KOR",
  southkorea: "KOR",
  czechia: "CZE",
  czechrepublic: "CZE",
  canada: "CAN",
  bosniaandherzegovina: "BIH",
  bosniaherzegovina: "BIH",
  qatar: "QAT",
  switzerland: "SUI",
  haiti: "HAI",
  scotland: "SCO",
  brazil: "BRA",
  morocco: "MAR",
  usa: "USA",
  unitedstates: "USA",
  unitedstatesofamerica: "USA",
  paraguay: "PAR",
  australia: "AUS",
  turkiye: "TUR",
  turkey: "TUR",
  cotedivoire: "CIV",
  ivorycoast: "CIV",
  ecuador: "ECU",
  germany: "GER",
  curacao: "CUW",
  netherlands: "NED",
  japan: "JPN",
  sweden: "SWE",
  tunisia: "TUN",
  iran: "IRN",
  iriran: "IRN",
  newzealand: "NZL",
  belgium: "BEL",
  egypt: "EGY",
  saudiarabia: "KSA",
  uruguay: "URU",
  spain: "ESP",
  caboverde: "CPV",
  capeverde: "CPV",
  france: "FRA",
  senegal: "SEN",
  iraq: "IRQ",
  norway: "NOR",
  argentina: "ARG",
  algeria: "ALG",
  austria: "AUT",
  jordan: "JOR",
  portugal: "POR",
  congodr: "COD",
  drcongo: "COD",
  democraticrepublicofthecongo: "COD",
  uzbekistan: "UZB",
  colombia: "COL",
  ghana: "GHA",
  panama: "PAN",
  england: "ENG",
  croatia: "CRO",
};

const TEAM_SLUGS: Record<string, string> = {
  southafrica: "south-africa",
  korearepublic: "korea-republic",
  southkorea: "korea-republic",
  czechrepublic: "czechia",
  bosniaandherzegovina: "bosnia-herzegovina",
  bosniaherzegovina: "bosnia-herzegovina",
  unitedstates: "usa",
  unitedstatesofamerica: "usa",
  turkey: "turkiye",
  cotedivoire: "cote-divoire",
  ivorycoast: "cote-divoire",
  iriran: "iran",
  newzealand: "new-zealand",
  saudiarabia: "saudi-arabia",
  caboverde: "cabo-verde",
  capeverde: "cabo-verde",
  congodr: "congo-dr",
  drcongo: "congo-dr",
  democraticrepublicofthecongo: "congo-dr",
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const slugify = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const unwrap = (value: any) => value?.data ?? value;

const asArray = (value: any): any[] => {
  const unwrapped = unwrap(value);
  return Array.isArray(unwrapped) ? unwrapped : [];
};

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

const safeMessage = (value: unknown) =>
  String(value ?? "Unknown Sportmonks error")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 500)
    .trim();

const cleanToken = (value: string) => value.replace(/^Bearer\s+/i, "").trim();

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

const playerKey = (teamSlug: string, playerName: string) =>
  `${teamSlug}:${normalize(playerName)}`;

const teamFromEntity = (entity: any): TeamInfo | undefined => {
  const source = unwrap(entity);
  if (!source) return undefined;

  const name = textFrom(source, [
    "name",
    "display_name",
    "displayName",
    "common_name",
    "commonName",
  ]);
  if (!name) return undefined;

  const normalizedName = normalize(name);
  const shortCode = textFrom(source, [
    "short_code",
    "shortCode",
    "code",
    "country_code",
    "countryCode",
  ])
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

  const slug = TEAM_SLUGS[normalizedName] || slugify(name);
  const countryCode =
    TEAM_CODES[normalizedName] ||
    (shortCode.length >= 2 && shortCode.length <= 4
      ? shortCode
      : name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase());

  return {
    id: String(source.id ?? normalizedName),
    slug,
    name,
    countryCode,
  };
};

const getOrCreate = (
  stats: Map<string, PlayerAccumulator>,
  team: TeamInfo,
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
    countryCode: team.countryCode,
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    const text = await upstream.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!upstream.ok) {
      const upstreamMessage =
        body?.message ??
        body?.error?.message ??
        body?.error ??
        body?.errors?.[0]?.message ??
        text ??
        "Unknown Sportmonks error";

      const error = new Error(
        `Sportmonks returned ${upstream.status}: ${safeMessage(upstreamMessage)}`,
      ) as Error & { status?: number };
      error.status = upstream.status;
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
};

const extractSeasonId = (payload: any) => {
  const league = unwrap(payload);
  const current = unwrap(
    league?.currentseason ??
      league?.currentSeason ??
      league?.current_season,
  );

  if (current?.id) return String(current.id);

  const seasons = asArray(league?.seasons);
  const preferred =
    seasons.find((season) => season?.is_current === true) ??
    seasons.find((season) => /2026/.test(String(season?.name ?? ""))) ??
    seasons
      .filter((season) => numeric(season?.id) > 0)
      .sort((first, second) => numeric(second?.id) - numeric(first?.id))[0];

  return preferred?.id ? String(preferred.id) : "";
};

const resolveSeasonId = async (
  token: string,
  leagueId: string,
  attempts: FetchAttempt[],
) => {
  const configured = process.env.SPORTMONKS_WORLD_CUP_SEASON_ID?.trim();
  if (configured) {
    attempts.push({ name: "configured season", ok: true, records: 1 });
    return configured;
  }

  try {
    const payload = await sportmonksRequest(
      `/football/leagues/${encodeURIComponent(leagueId)}`,
      token,
      { include: "currentSeason;seasons" },
    );
    const seasonId = extractSeasonId(payload);
    attempts.push({
      name: "league season lookup",
      ok: Boolean(seasonId),
      records: seasonId ? 1 : 0,
      message: seasonId ? undefined : "No 2026 season was returned",
    });
    return seasonId;
  } catch (error) {
    attempts.push({
      name: "league season lookup",
      ok: false,
      status: (error as Error & { status?: number })?.status,
      message: safeMessage(error instanceof Error ? error.message : error),
    });
    return "";
  }
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

const compactLabel = (value: unknown) =>
  normalize(value).replace(/statistics?|topscorers?|season|stage/g, "");

const topScorerTypeLabel = (record: any) => {
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

const classifyTopScorer = (record: any): StatCategory | undefined => {
  const label = compactLabel(topScorerTypeLabel(record));

  if (label.includes("secondyellow") || label.includes("redcard") || label === "red") {
    return "redCards";
  }
  if (label.includes("yellowcard") || label === "yellow") return "yellowCards";
  if (label.includes("assist")) return "assists";
  if (label.includes("goal") && !label.includes("owngoal")) return "goals";

  return undefined;
};

const fetchTopScorers = async (
  token: string,
  seasonId: string,
  attempts: FetchAttempt[],
) => {
  if (!seasonId) return [] as any[];

  const records: any[] = [];
  const seen = new Set<string>();

  try {
    for (let page = 1; page <= TOPSCORER_MAX_PAGES; page += 1) {
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

      const pageRows = asArray(payload?.data ?? payload);
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

    attempts.push({ name: "season topscorers", ok: true, records: records.length });
    return records;
  } catch (error) {
    attempts.push({
      name: "season topscorers",
      ok: false,
      status: (error as Error & { status?: number })?.status,
      message: safeMessage(error instanceof Error ? error.message : error),
    });
    return [];
  }
};

const applyTopScorers = (
  records: any[],
  stats: Map<string, PlayerAccumulator>,
) => {
  let parsed = 0;
  let ignored = 0;

  for (const record of records) {
    const category = classifyTopScorer(record);
    const playerName = playerNameFrom(record);
    const team = teamFromEntity(record?.participant ?? record?.team);
    const total = numeric(record?.total ?? record?.value ?? record?.count);

    if (!category || !playerName || !team || total <= 0) {
      ignored += 1;
      continue;
    }

    const row = getOrCreate(stats, team, playerName);
    row[category] = Math.max(row[category], total);
    parsed += 1;
  }

  return { parsed, ignored };
};

const eventTypeLabel = (event: any) => {
  const type = unwrap(event?.type);
  const subType = unwrap(event?.subtype ?? event?.subType);

  return [
    type?.developer_name,
    type?.developerName,
    type?.name,
    type?.code,
    subType?.developer_name,
    subType?.name,
    event?.info,
    event?.addition,
  ]
    .filter(Boolean)
    .join(" ");
};

const classifyEvent = (event: any) => {
  const label = compactLabel(eventTypeLabel(event));
  const shootout = label.includes("shootout") || label.includes("penaltyshootout");
  const ownGoal = label.includes("owngoal");
  const secondYellow = label.includes("secondyellow");

  return {
    isGoal:
      !shootout &&
      !ownGoal &&
      (label === "goal" ||
        label.includes("goal") ||
        label.includes("penaltyscored")),
    isYellow:
      !secondYellow &&
      (label.includes("yellowcard") || label === "yellow"),
    isRed:
      secondYellow || label.includes("redcard") || label === "red",
  };
};

const eventPlayerName = (event: any) =>
  textFrom(event, ["player_name", "playerName"]) || playerNameFrom(event);

const relatedPlayerName = (event: any) => {
  const direct = textFrom(event, ["related_player_name", "relatedPlayerName"]);
  if (direct) return direct;

  const related = unwrap(event?.relatedplayer ?? event?.relatedPlayer);
  return textFrom(related, [
    "display_name",
    "displayName",
    "full_name",
    "fullName",
    "common_name",
    "commonName",
    "name",
  ]);
};

const fetchFixtureEvents = async (
  token: string,
  leagueId: string,
  attempts: FetchAttempt[],
) => {
  const fixtures: any[] = [];
  const seen = new Set<string>();

  try {
    for (let page = 1; page <= FIXTURE_MAX_PAGES; page += 1) {
      const payload = await sportmonksRequest(
        `/football/fixtures/between/${TOURNAMENT_START}/${TOURNAMENT_END}`,
        token,
        {
          include: "participants;events.type",
          filters: `fixtureLeagues:${leagueId}`,
          per_page: PAGE_SIZE,
          page,
          order: "asc",
        },
      );

      const pageRows = asArray(payload?.data ?? payload);
      for (const fixture of pageRows) {
        const signature = String(fixture?.id ?? "");
        if (!signature || seen.has(signature)) continue;
        seen.add(signature);
        fixtures.push(fixture);
      }

      if (!hasMorePages(payload, page, pageRows.length)) break;
    }

    attempts.push({ name: "fixture event fallback", ok: true, records: fixtures.length });
    return fixtures;
  } catch (error) {
    attempts.push({
      name: "fixture event fallback",
      ok: false,
      status: (error as Error & { status?: number })?.status,
      message: safeMessage(error instanceof Error ? error.message : error),
    });
    return [];
  }
};

const applyFixtureEvents = (
  fixtures: any[],
  stats: Map<string, PlayerAccumulator>,
) => {
  let parsedMatches = 0;
  let completedMatches = 0;
  let parsedEvents = 0;
  let ignoredEvents = 0;
  let inferredSeasonId = "";

  for (const fixture of fixtures) {
    if (!inferredSeasonId && fixture?.season_id) {
      inferredSeasonId = String(fixture.season_id);
    }

    const participants = asArray(fixture?.participants);
    const teamsById = new Map<string, TeamInfo>();
    for (const participant of participants) {
      const team = teamFromEntity(participant);
      if (team) teamsById.set(String(unwrap(participant)?.id ?? team.id), team);
    }

    const events = asArray(fixture?.events);
    if (events.length > 0) parsedMatches += 1;
    if (fixture?.result_info || numeric(fixture?.state_id) === 5) completedMatches += 1;

    for (const event of events) {
      if (event?.rescinded === true) continue;

      const classification = classifyEvent(event);
      if (!classification.isGoal && !classification.isYellow && !classification.isRed) {
        ignoredEvents += 1;
        continue;
      }

      const participantId = String(event?.participant_id ?? unwrap(event?.participant)?.id ?? "");
      const team =
        teamsById.get(participantId) ??
        teamFromEntity(event?.participant) ??
        teamFromEntity(participants[0]);
      const playerName = eventPlayerName(event);

      if (!team || !playerName) {
        ignoredEvents += 1;
        continue;
      }

      const row = getOrCreate(stats, team, playerName);
      if (classification.isGoal) row.goals += 1;
      if (classification.isYellow) row.yellowCards += 1;
      if (classification.isRed) row.redCards += 1;

      if (classification.isGoal) {
        const assistName = relatedPlayerName(event);
        if (assistName && normalize(assistName) !== normalize(playerName)) {
          const assistRow = getOrCreate(stats, team, assistName);
          assistRow.assists += 1;
        }
      }

      parsedEvents += 1;
    }
  }

  return {
    parsedMatches,
    completedMatches,
    parsedEvents,
    ignoredEvents,
    inferredSeasonId,
  };
};


const mergeStatMaps = (
  primary: Map<string, PlayerAccumulator>,
  fallback: Map<string, PlayerAccumulator>,
) => {
  const merged = new Map<string, PlayerAccumulator>();

  for (const [key, row] of primary) {
    merged.set(key, { ...row });
  }

  for (const [key, row] of fallback) {
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...row });
      continue;
    }

    current.goals = Math.max(current.goals, row.goals);
    current.assists = Math.max(current.assists, row.assists);
    current.yellowCards = Math.max(current.yellowCards, row.yellowCards);
    current.redCards = Math.max(current.redCards, row.redCards);
    current.appearances = Math.max(current.appearances, row.appearances);
    current.starts = Math.max(current.starts, row.starts);
    current.minutes = Math.max(current.minutes, row.minutes);
    current.tackles = Math.max(current.tackles, row.tackles);
    current.interceptions = Math.max(current.interceptions, row.interceptions);
    current.saves = Math.max(current.saves, row.saves);
    current.cleanSheets = Math.max(current.cleanSheets, row.cleanSheets);
  }

  return merged;
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
  limit = 25,
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
  const rawToken = process.env.SPORTMONKS_API_TOKEN?.trim();

  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (!rawToken) {
    response.setHeader("Cache-Control", "no-store");
    response.status(503).json({
      code: "SPORTMONKS_TOKEN_MISSING",
      configurationRequired: true,
      provider: "Sportmonks",
      error: "Live statistics are not configured yet.",
    });
    return;
  }

  const token = cleanToken(rawToken);
  const leagueId =
    process.env.SPORTMONKS_WORLD_CUP_LEAGUE_ID?.trim() ||
    DEFAULT_WORLD_CUP_LEAGUE_ID;
  const attempts: FetchAttempt[] = [];
  const topScorerStats = new Map<string, PlayerAccumulator>();
  const fixtureStats = new Map<string, PlayerAccumulator>();

  const seasonIdFromLeague = await resolveSeasonId(token, leagueId, attempts);
  const topScorerRecords = await fetchTopScorers(
    token,
    seasonIdFromLeague,
    attempts,
  );
  const topScorerResult = applyTopScorers(topScorerRecords, topScorerStats);

  const fixtures = await fetchFixtureEvents(token, leagueId, attempts);
  const fixtureResult = applyFixtureEvents(fixtures, fixtureStats);
  const stats = mergeStatMaps(topScorerStats, fixtureStats);

  const seasonId = seasonIdFromLeague || fixtureResult.inferredSeasonId;
  const leaders = {
    goals: buildLeaders(stats, "goals"),
    assists: buildLeaders(stats, "assists"),
    yellowCards: buildLeaders(stats, "yellowCards"),
    redCards: buildLeaders(stats, "redCards"),
  };

  const hasData = Object.values(leaders).some((rows) => rows.length > 0);
  const successfulAttempt = attempts.some((attempt) => attempt.ok);

  if (!hasData && !successfulAttempt) {
    const firstFailure = attempts.find((attempt) => !attempt.ok);
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      code: "SPORTMONKS_REQUEST_FAILED",
      provider: "Sportmonks",
      error:
        firstFailure?.message ||
        "Sportmonks did not return tournament statistics.",
      attempts,
    });
    return;
  }

  response.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=1800",
  );

  response.status(200).json({
    source: "Sportmonks Football API",
    strategy:
      topScorerResult.parsed > 0 && fixtureResult.parsedEvents > 0
        ? "topscorers plus fixture events"
        : topScorerResult.parsed > 0
          ? "topscorers"
          : "fixture events",
    fetchedAt: new Date().toISOString(),
    leagueId,
    seasonId,
    completedMatches: fixtureResult.completedMatches,
    parsedMatches: fixtureResult.parsedMatches,
    playerStatsCount: stats.size,
    recordsReceived: topScorerRecords.length,
    topScorerRecordsParsed: topScorerResult.parsed,
    topScorerRecordsIgnored: topScorerResult.ignored,
    fixtureEventsParsed: fixtureResult.parsedEvents,
    fixtureEventsIgnored: fixtureResult.ignoredEvents,
    attempts,
    leaders,
    stats: Object.fromEntries(
      Array.from(stats.entries()).map(([key, row]) => [key, statOnly(row)]),
    ),
  });
}
