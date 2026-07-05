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
const TOURNAMENT_END = new Date("2026-07-20T23:59:59.000Z");
const FALLBACK_HISTORY_DAYS = 7;
const FALLBACK_FUTURE_DAYS = 7;

const formatDate = (date: Date) =>
  date.toISOString().slice(0, 10).replaceAll("-", "");

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );

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
    dates.push(formatDate(cursor));
  }

  return dates;
};

const endpoint = (dates: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dates}&limit=500&_=${Date.now()}`;

async function fetchPayload(dates: string): Promise<EspnPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(endpoint(dates), {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "User-Agent": "Fan26-Live-Scores/1.0",
      },
    });

    if (!upstream.ok) {
      throw new Error(`ESPN returned ${upstream.status}`);
    }

    return (await upstream.json()) as EspnPayload;
  } finally {
    clearTimeout(timeout);
  }
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
  const fullRange =
    `${formatDate(TOURNAMENT_START)}-${formatDate(TOURNAMENT_END)}`;

  try {
    const payload = await fetchPayload(fullRange);

    if ((payload.events?.length ?? 0) > 0) {
      return mergeEvents([payload]);
    }
  } catch {
    // Fall back to daily requests around the current tournament window.
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
      fetchPayload(date),
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

  return mergeEvents(payloads);
}

const setNoCacheHeaders = (response: ApiResponse) => {
  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");
  response.setHeader("Surrogate-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
};

export default async function handler(
  _request: unknown,
  response: ApiResponse,
) {
  setNoCacheHeaders(response);

  try {
    const events = await fetchTournamentWindow();
    const fetchedAt = new Date().toISOString();

    response.setHeader("X-Live-Scores-Fetched-At", fetchedAt);
    response.status(200).json({
      source: "ESPN",
      fetchedAt,
      events,
    });
  } catch (error) {
    response.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Live score request failed",
    });
  }
}
