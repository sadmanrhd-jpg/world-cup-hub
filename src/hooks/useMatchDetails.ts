import { useEffect, useMemo, useState } from "react";

export type MatchLookup = {
  eventId?: string | null;
  date?: string;
  home?: string;
  away?: string;
};

export type MatchDetailsResponse = {
  available: boolean;
  eventId: string | null;
  source?: string;
  fetchedAt?: string;
  message?: string;
  error?: string;
  summary?: Record<string, unknown>;
};

export function useMatchDetails(
  lookup: MatchLookup,
  refreshMs = 30_000,
) {
  const [data, setData] = useState<MatchDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (lookup.eventId) params.set("eventId", lookup.eventId);
    if (lookup.date) params.set("date", lookup.date);
    if (lookup.home) params.set("home", lookup.home);
    if (lookup.away) params.set("away", lookup.away);
    return params.toString();
  }, [lookup.eventId, lookup.date, lookup.home, lookup.away]);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let controller: AbortController | null = null;

    const load = async () => {
      if (inFlight || document.visibilityState === "hidden") return;

      inFlight = true;
      controller = new AbortController();
      setRefreshing(true);

      try {
        const response = await fetch(`/api/match-details?${query}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const payload = (await response.json()) as MatchDetailsResponse;

        if (!response.ok) {
          throw new Error(payload.error || `Match details returned ${response.status}`);
        }

        if (cancelled) return;
        setData(payload);
        setError(null);
        setLastUpdated(new Date());
      } catch (requestError) {
        if (cancelled || controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Match details request failed",
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

    setData(null);
    setError(null);
    setLoading(true);
    void load();
    const interval = window.setInterval(() => void load(), refreshMs);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [query, refreshMs]);

  return {
    data,
    loading,
    refreshing,
    lastUpdated,
    error,
  };
}
