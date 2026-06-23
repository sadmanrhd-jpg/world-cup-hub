import { useEffect, useState } from "react";

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

export const teamKey = (value: string) => {
  const normalized = norm(value);
  return ALIASES[normalized] ?? normalized;
};

const pairKey = (a: string, b: string) =>
  [teamKey(a), teamKey(b)].sort().join("|");

const formatEspnDate = (date: Date) =>
  date.toISOString().slice(0, 10).replaceAll("-", "");

const datesAroundToday = () => {
  const today = new Date();
  return [-1, 0, 1].map((offset) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return formatEspnDate(date);
  });
};

const espnEndpoint = (date: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}&limit=100`;

const getTeamName = (competitor?: EspnCompetitor) =>
  competitor?.team?.displayName ??
  competitor?.team?.shortDisplayName ??
  competitor?.team?.name ??
  "";

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

async function fetchJson(url: string, signal: AbortSignal): Promise<EspnPayload> {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Live score request returned ${response.status}`);
  }

  return (await response.json()) as EspnPayload;
}

async function fetchDirect(signal: AbortSignal): Promise<EspnPayload> {
  const payloads = await Promise.all(
    datesAroundToday().map((date) => fetchJson(espnEndpoint(date), signal)),
  );

  const eventMap = new Map<string, EspnEvent>();

  for (const payload of payloads) {
    for (const event of payload.events ?? []) {
      if (event.id) eventMap.set(event.id, event);
    }
  }

  return { events: Array.from(eventMap.values()) };
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

export function useLiveScores(refreshMs = 60_000) {
  const [data, setData] = useState<LiveMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let controller: AbortController | null = null;

    const load = async () => {
      if (inFlight || document.visibilityState === "hidden") return;

      inFlight = true;
      controller = new AbortController();
      setRefreshing(true);

      try {
        const events = await fetchLiveEvents(controller.signal);
        if (cancelled) return;

        const map: LiveMap = new Map();
        for (const event of events) {
          map.set(pairKey(event.home, event.away), event);
        }

        setData(map);
        setError(null);
        setLastUpdated(new Date());
      } catch (requestError) {
        if (cancelled || controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Live score request failed",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
        inFlight = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    void load();
    const interval = window.setInterval(() => void load(), refreshMs);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshMs]);

  return {
    data,
    loading,
    refreshing,
    lastUpdated,
    error,
    pairKey,
  };
}
