import { useEffect, useState } from "react";

export type LiveEvent = {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // e.g. "Match Finished", "1H", "2H", "HT", "Not Started"
  progress: string | null; // minute string when live
  dateUTC: string | null;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

const ALIASES: Record<string, string> = {
  unitedstates: "usa",
  unitedstatesofamerica: "usa",
  southkorea: "korearepublic",
  ivorycoast: "cotedivoire",
  drcongo: "congodr",
  democraticrepublicofthecongo: "congodr",
  turkey: "turkiye",
  capeverde: "caboverde",
  curacao: "curacao",
  czechrepublic: "czechia",
  bosniaandherzegovina: "bosniaherzegovina",
};

export const teamKey = (s: string) => {
  const n = norm(s);
  return ALIASES[n] ?? n;
};

const pairKey = (a: string, b: string) => [teamKey(a), teamKey(b)].sort().join("|");

const todayUTC = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const yesterdayUTC = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const tomorrowUTC = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const isLiveStatus = (s: string) =>
  /^(1H|2H|HT|ET|P|LIVE|IN PLAY)/i.test(s) || /half|play|extra|penalt/i.test(s);

const isFinishedStatus = (s: string) => /finish|ft|aet|full time/i.test(s);

async function fetchDay(date: string): Promise<LiveEvent[]> {
  // TheSportsDB free public API ("3" is the public test key, CORS-enabled)
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&l=FIFA%20World%20Cup`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const events = (json?.events ?? []) as any[];
    return events.map((e) => ({
      id: String(e.idEvent),
      home: e.strHomeTeam ?? "",
      away: e.strAwayTeam ?? "",
      homeScore: e.intHomeScore != null && e.intHomeScore !== "" ? Number(e.intHomeScore) : null,
      awayScore: e.intAwayScore != null && e.intAwayScore !== "" ? Number(e.intAwayScore) : null,
      status: e.strStatus ?? e.strPostponed ?? "",
      progress: e.strProgress ?? null,
      dateUTC: e.strTimestamp ?? null,
    }));
  } catch {
    return [];
  }
}

export type LiveMap = Map<string, LiveEvent & { live: boolean; finished: boolean }>;

export function useLiveScores(refreshMs = 60_000) {
  const [data, setData] = useState<LiveMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [y, t, tm] = await Promise.all([
        fetchDay(yesterdayUTC()),
        fetchDay(todayUTC()),
        fetchDay(tomorrowUTC()),
      ]);
      if (cancelled) return;
      const all = [...y, ...t, ...tm];
      const map: LiveMap = new Map();
      for (const ev of all) {
        const key = pairKey(ev.home, ev.away);
        map.set(key, {
          ...ev,
          live: isLiveStatus(ev.status),
          finished: isFinishedStatus(ev.status),
        });
      }
      setData(map);
      setLoading(false);
      setLastUpdated(new Date());
    };

    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs]);

  return { data, loading, lastUpdated, pairKey };
}
