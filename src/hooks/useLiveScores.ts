import { useEffect, useSyncExternalStore } from "react";

export type LiveEvent = {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  progress: string | null;
  dateUTC: string | null;
  live: boolean;
  finished: boolean;
};

type EspnTeam = {
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: EspnTeam;
};

type EspnStatus = {
  displayClock?: string;
  type?: {
    state?: "pre" | "in" | "post";
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  status?: EspnStatus;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: EspnStatus;
  }>;
};

type EspnPayload = {
  events?: EspnEvent[];
};

const norm = (value: string) =>
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
  congodr: "congodr",
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

const CANONICAL_NAMES: Record<string, string> = {
  mexico: "Mexico",
  southafrica: "South Africa",
  korearepublic: "Korea Republic",
  czechia: "Czechia",
  canada: "Canada",
  bosniaherzegovina: "Bosnia and Herzegovina",
  qatar: "Qatar",
  switzerland: "Switzerland",
  haiti: "Haiti",
  scotland: "Scotland",
  brazil: "Brazil",
  morocco: "Morocco",
  usa: "USA",
  paraguay: "Paraguay",
  australia: "Australia",
  turkiye: "Türkiye",
  cotedivoire: "Côte d'Ivoire",
  ecuador: "Ecuador",
  germany: "Germany",
  curacao: "Curaçao",
  netherlands: "Netherlands",
  japan: "Japan",
  sweden: "Sweden",
  tunisia: "Tunisia",
  iriran: "IR Iran",
  newzealand: "New Zealand",
  belgium: "Belgium",
  egypt: "Egypt",
  saudiarabia: "Saudi Arabia",
  uruguay: "Uruguay",
  spain: "Spain",
  caboverde: "Cabo Verde",
  france: "France",
  senegal: "Senegal",
  iraq: "Iraq",
  norway: "Norway",
  argentina: "Argentina",
  algeria: "Algeria",
  austria: "Austria",
  jordan: "Jordan",
  portugal: "Portugal",
  congodr: "Congo DR",
  uzbekistan: "Uzbekistan",
  colombia: "Colombia",
  ghana: "Ghana",
  panama: "Panama",
  england: "England",
  croatia: "Croatia",
};

export const teamKey = (value: string) => {
  const normalized = norm(value);
  return ALIASES[normalized] ?? normalized;
};

export const canonicalTeamName = (value: string) =>
  CANONICAL_NAMES[teamKey(value)] ?? value.trim();

const pairKey = (a: string, b: string) =>
  [teamKey(a), teamKey(b)].sort().join("|");

const formatEspnDate = (date: Date) =>
  date.toISOString().slice(0, 10).replaceAll("-", "");

const TOURNAMENT_START = new Date("2026-06-11T00:00:00.000Z");
const TOURNAMENT_END = new Date("2026-07-20T23:59:59.000Z");
const FALLBACK_HISTORY_DAYS = 7;
const FALLBACK_FUTURE_DAYS = 7;

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const laterDate = (a: Date, b: Date) =>
  a.getTime() > b.getTime() ? a : b;

const earlierDate = (a: Date, b: Date) =>
  a.getTime() < b.getTime() ? a : b;

const datesBetween = (start: Date, end: Date) => {
  const dates: string[] = [];

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    dates.push(formatEspnDate(cursor));
  }

  return dates;
};

const espnEndpoint = (dates: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dates}&limit=500`;

const withCacheBuster = (url: string) =>
  `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;

const getTeamName = (competitor?: EspnCompetitor) =>
  canonicalTeamName(
    competitor?.team?.displayName ??
      competitor?.team?.shortDisplayName ??
      competitor?.team?.name ??
      "",
  );

const getStatus = (event: EspnEvent) =>
  event.status ?? event.competitions?.[0]?.status;

const parseEvent = (event: EspnEvent): LiveEvent | null => {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "home",
  );
  const away = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "away",
  );

  const homeName = getTeamName(home);
  const awayName = getTeamName(away);

  if (!event.id || !homeName || !awayName) return null;

  const status = getStatus(event);
  const state = status?.type?.state;
  const live = state === "in";
  const finished = status?.type?.completed === true || state === "post";
  const statusText =
    status?.type?.description ??
    status?.type?.detail ??
    status?.type?.shortDetail ??
    state ??
    "";

  const parseScore = (score?: string) => {
    if (score == null || score === "") return null;
    const value = Number(score);
    return Number.isFinite(value) ? value : null;
  };

  return {
    id: event.id,
    home: homeName,
    away: awayName,
    homeScore: parseScore(home?.score),
    awayScore: parseScore(away?.score),
    status: statusText,
    progress: live
      ? status?.displayClock ??
        status?.type?.shortDetail ??
        status?.type?.detail ??
        "LIVE"
      : null,
    dateUTC: event.date ?? null,
    live,
    finished,
  };
};

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<EspnPayload> {
  const response = await fetch(withCacheBuster(url), {
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Live score request returned ${response.status}`);
  }

  return (await response.json()) as EspnPayload;
}

const mergePayloads = (payloads: EspnPayload[]): EspnPayload => {
  const eventMap = new Map<string, EspnEvent>();

  for (const payload of payloads) {
    for (const event of payload.events ?? []) {
      if (event.id) eventMap.set(event.id, event);
    }
  }

  return { events: Array.from(eventMap.values()) };
};

async function fetchDirect(signal: AbortSignal): Promise<EspnPayload> {
  const fullTournamentRange =
    `${formatEspnDate(TOURNAMENT_START)}-${formatEspnDate(TOURNAMENT_END)}`;

  try {
    const payload = await fetchJson(
      espnEndpoint(fullTournamentRange),
      signal,
    );

    if ((payload.events?.length ?? 0) > 0) return payload;
  } catch {
    // Fall back to daily requests around the current match window.
  }

  const today = startOfUtcDay(new Date());
  const fallbackStart = laterDate(
    TOURNAMENT_START,
    addUtcDays(today, -FALLBACK_HISTORY_DAYS),
  );
  const fallbackEnd = earlierDate(
    TOURNAMENT_END,
    addUtcDays(today, FALLBACK_FUTURE_DAYS),
  );

  const settled = await Promise.allSettled(
    datesBetween(fallbackStart, fallbackEnd).map((date) =>
      fetchJson(espnEndpoint(date), signal),
    ),
  );

  const payloads = settled
    .filter(
      (result): result is PromiseFulfilledResult<EspnPayload> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  if (payloads.length === 0) {
    throw new Error("No live score requests succeeded");
  }

  return mergePayloads(payloads);
}

async function fetchLiveEvents(signal: AbortSignal): Promise<LiveEvent[]> {
  let payload: EspnPayload;

  try {
    payload = await fetchJson("/api/live-scores", signal);
  } catch {
    payload = await fetchDirect(signal);
  }

  return (payload.events ?? [])
    .map(parseEvent)
    .filter((event): event is LiveEvent => event !== null);
}

export type LiveMap = Map<string, LiveEvent>;

type LiveSnapshot = {
  data: LiveMap;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  error: string | null;
};

let snapshot: LiveSnapshot = {
  data: new Map(),
  loading: true,
  refreshing: false,
  lastUpdated: null,
  error: null,
};

const listeners = new Set<() => void>();
let subscriberCount = 0;
let pollTimer: number | null = null;
let activeRequest: Promise<void> | null = null;
let requestController: AbortController | null = null;

const emit = () => listeners.forEach((listener) => listener());

const updateSnapshot = (patch: Partial<LiveSnapshot>) => {
  snapshot = { ...snapshot, ...patch };
  emit();
};

const getSnapshot = () => snapshot;
const getServerSnapshot = () => snapshot;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const clearPollTimer = () => {
  if (pollTimer != null && typeof window !== "undefined") {
    window.clearTimeout(pollTimer);
  }
  pollTimer = null;
};

const nextPollDelay = () => {
  const hasLiveMatch = Array.from(snapshot.data.values()).some(
    (event) => event.live,
  );

  return hasLiveMatch ? 15_000 : 45_000;
};

const scheduleNextPoll = () => {
  if (typeof window === "undefined" || subscriberCount === 0) return;

  clearPollTimer();
  pollTimer = window.setTimeout(async () => {
    if (document.visibilityState === "visible") {
      await refreshLiveScores();
    }
    scheduleNextPoll();
  }, nextPollDelay());
};

const refreshLiveScores = async () => {
  if (activeRequest) return activeRequest;

  requestController = new AbortController();
  const timeout = window.setTimeout(
    () => requestController?.abort(),
    15_000,
  );

  updateSnapshot({ refreshing: true });

  activeRequest = (async () => {
    try {
      const events = await fetchLiveEvents(requestController!.signal);
      const map: LiveMap = new Map();

      for (const event of events) {
        map.set(pairKey(event.home, event.away), event);
      }

      updateSnapshot({
        data: map,
        loading: false,
        refreshing: false,
        lastUpdated: new Date(),
        error: null,
      });
    } catch (requestError) {
      if (requestController?.signal.aborted) {
        updateSnapshot({
          loading: false,
          refreshing: false,
          error: "Live score request timed out",
        });
        return;
      }

      updateSnapshot({
        loading: false,
        refreshing: false,
        error:
          requestError instanceof Error
            ? requestError.message
            : "Live score request failed",
      });
    } finally {
      window.clearTimeout(timeout);
      requestController = null;
      activeRequest = null;
    }
  })();

  return activeRequest;
};

const refreshWhenVisible = () => {
  if (document.visibilityState !== "visible") return;
  void refreshLiveScores().finally(scheduleNextPoll);
};

const startPolling = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("online", refreshWhenVisible);
  document.addEventListener("visibilitychange", refreshWhenVisible);

  void refreshLiveScores().finally(scheduleNextPoll);
};

const stopPolling = () => {
  if (typeof window === "undefined") return;

  clearPollTimer();
  window.removeEventListener("online", refreshWhenVisible);
  document.removeEventListener("visibilitychange", refreshWhenVisible);
  requestController?.abort();
};

export function useLiveScores(_refreshMs = 45_000) {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    subscriberCount += 1;

    if (subscriberCount === 1) {
      startPolling();
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);

      if (subscriberCount === 0) {
        stopPolling();
      }
    };
  }, []);

  return {
    ...current,
    pairKey,
  };
}
