import { useQuery } from "@tanstack/react-query";
import type { TournamentStatsPayload } from "@/data/tournamentStats";

const CACHE_KEY = "fan26.espn-tournament-stats-v1";
const FIVE_MINUTES = 5 * 60 * 1000;

type StoredStats = {
  storedAt: number;
  payload: TournamentStatsPayload;
};

const readStoredStats = (): StoredStats | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as StoredStats | null;
    if (!parsed?.payload?.leaders || !parsed.storedAt) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};

const storeStats = (payload: TournamentStatsPayload) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ storedAt: Date.now(), payload }));
  } catch {}
};

const fetchTournamentStats = async () => {
  const response = await fetch("/api/world-cup-stats?v=espn1", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Stats request returned ${response.status}`);
  }

  const payload = await response.json() as TournamentStatsPayload;
  storeStats(payload);
  return payload;
};

export const useTournamentStats = () => {
  const stored = readStoredStats();
  return useQuery({
    queryKey: ["espn-world-cup-stats", 1],
    queryFn: fetchTournamentStats,
    initialData: stored?.payload,
    initialDataUpdatedAt: stored?.storedAt,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
    refetchOnWindowFocus: true,
    retry: 2,
  });
};