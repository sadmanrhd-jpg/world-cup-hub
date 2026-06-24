type ApiRequest = {
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type EspnTeam = {
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  team?: EspnTeam;
};

type EspnEvent = {
  id?: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
  }>;
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

type MatchSummary = Record<string, unknown>;

const scoreboardEndpoint = (date: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}&limit=100`;

const summaryEndpoint = (eventId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${encodeURIComponent(eventId)}`;

const readQuery = (
  request: ApiRequest,
  key: string,
): string => {
  const value = request.query?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

const ALIASES: Record<string, string> = {
  unitedstates: "usa",
  unitedstatesofamerica: "usa",
  usmnt: "usa",
  southkorea: "korearepublic",
  republicofkorea: "korearepublic",
  ivorycoast: "cotedivoire",
  drcongo: "congodr",
  democraticrepublicofthecongo: "congodr",
  turkey: "turkiye",
  capeverde: "caboverde",
  capeverdeislands: "caboverde",
  czechrepublic: "czechia",
  bosniaandherzegovina: "bosniaherzegovina",
  bosniaherzegovina: "bosniaherzegovina",
  iran: "iriran",
};

const teamKey = (value: string) => {
  const normalized = normalize(value);
  return ALIASES[normalized] ?? normalized;
};

const getTeamName = (competitor?: EspnCompetitor) =>
  competitor?.team?.displayName ??
  competitor?.team?.shortDisplayName ??
  competitor?.team?.name ??
  "";

const eventPairKey = (event: EspnEvent) => {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const names = competitors.map(getTeamName).filter(Boolean).map(teamKey).sort();
  return names.join("|");
};

const requestedPairKey = (home: string, away: string) =>
  [teamKey(home), teamKey(away)].sort().join("|");

const parseDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

const addUtcDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const formatDate = (date: Date) =>
  date.toISOString().slice(0, 10).replace(/-/g, "");

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`ESPN returned ${response.status}`);
  }

  return (await response.json()) as T;
}

async function resolveEventId(
  dateValue: string,
  home: string,
  away: string,
): Promise<string | null> {
  const date = parseDate(dateValue);
  if (!date || !home || !away) return null;

  // Search the stored fixture date and adjacent UTC days because the fixture
  // list is stored in Bangladesh time while ESPN may group events by UTC.
  const dates = [-1, 0, 1].map((offset) => formatDate(addUtcDays(date, offset)));
  const settled = await Promise.allSettled(
    dates.map((day) => fetchJson<EspnScoreboard>(scoreboardEndpoint(day))),
  );

  const target = requestedPairKey(home, away);

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const match = (result.value.events ?? []).find(
      (event) => event.id && eventPairKey(event) === target,
    );
    if (match?.id) return match.id;
  }

  return null;
}

const summaryState = (summary: MatchSummary) => {
  const header = summary.header as Record<string, unknown> | undefined;
  const competitions = header?.competitions as Array<Record<string, unknown>> | undefined;
  const status = competitions?.[0]?.status as Record<string, unknown> | undefined;
  const type = status?.type as Record<string, unknown> | undefined;
  return typeof type?.state === "string" ? type.state : "";
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const requestedEventId = readQuery(request, "eventId").trim();
    const date = readQuery(request, "date").trim();
    const home = readQuery(request, "home").trim();
    const away = readQuery(request, "away").trim();

    let eventId = /^\d+$/.test(requestedEventId) ? requestedEventId : "";

    if (!eventId) {
      eventId = (await resolveEventId(date, home, away)) ?? "";
    }

    if (!eventId) {
      response.setHeader(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=120",
      );
      response.status(200).json({
        available: false,
        eventId: null,
        source: "ESPN",
        fetchedAt: new Date().toISOString(),
        message: "Detailed match data is not available yet.",
      });
      return;
    }

    const summary = await fetchJson<MatchSummary>(summaryEndpoint(eventId));
    const state = summaryState(summary);

    response.setHeader(
      "Cache-Control",
      state === "in"
        ? "public, s-maxage=10, stale-while-revalidate=20"
        : state === "post"
          ? "public, s-maxage=300, stale-while-revalidate=900"
          : "public, s-maxage=45, stale-while-revalidate=120",
    );

    response.status(200).json({
      available: true,
      eventId,
      source: "ESPN",
      fetchedAt: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      available: false,
      eventId: null,
      error:
        error instanceof Error
          ? error.message
          : "Detailed match request failed",
    });
  }
}
