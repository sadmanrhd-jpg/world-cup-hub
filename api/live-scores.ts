type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type EspnEvent = { id?: string };

type EspnPayload = {
  events?: EspnEvent[];
};

const TOURNAMENT_START = new Date("2026-06-11T00:00:00.000Z");
const FALLBACK_HISTORY_DAYS = 14;

const formatDate = (date: Date) =>
  date.toISOString().slice(0, 10).replaceAll("-", "");

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const laterDate = (a: Date, b: Date) =>
  a.getTime() > b.getTime() ? a : b;

const datesBetween = (start: Date, end: Date) => {
  const dates: string[] = [];

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    dates.push(formatDate(cursor));
  }

  return dates;
};

const endpoint = (dates: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dates}&limit=500&_=${Date.now()}`;

async function fetchPayload(dates: string): Promise<EspnPayload> {
  const upstream = await fetch(endpoint(dates), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!upstream.ok) {
    throw new Error(`ESPN returned ${upstream.status}`);
  }

  return (await upstream.json()) as EspnPayload;
}

const mergeEvents = (payloads: EspnPayload[]) => {
  const eventMap = new Map<string, EspnEvent>();

  for (const payload of payloads) {
    for (const event of payload.events ?? []) {
      if (event.id) eventMap.set(event.id, event);
    }
  }

  return Array.from(eventMap.values());
};

async function fetchTournamentWindow(): Promise<EspnEvent[]> {
  const today = startOfUtcDay(new Date());
  const end = addUtcDays(today, 1);
  const range = `${formatDate(TOURNAMENT_START)}-${formatDate(end)}`;

  try {
    const payload = await fetchPayload(range);

    if ((payload.events?.length ?? 0) > 0) {
      return mergeEvents([payload]);
    }
  } catch {
    // Some ESPN scoreboards do not accept ranges consistently.
    // Fall back to one request per day for the recent history window.
  }

  const recentStart = laterDate(
    TOURNAMENT_START,
    addUtcDays(today, -FALLBACK_HISTORY_DAYS),
  );

  const settled = await Promise.allSettled(
    datesBetween(recentStart, end).map((date) => fetchPayload(date)),
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

  return mergeEvents(payloads);
}

export default async function handler(
  _request: unknown,
  response: ApiResponse,
) {
  try {
    const events = await fetchTournamentWindow();

    // Results must never be served from Vercel's stale-while-revalidate cache.
    response.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.setHeader("CDN-Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");

    response.status(200).json({
      source: "ESPN",
      fetchedAt: new Date().toISOString(),
      events,
    });
  } catch (error) {
    response.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.setHeader("CDN-Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");

    response.status(502).json({
      error:
        error instanceof Error ? error.message : "Live score request failed",
    });
  }
}
