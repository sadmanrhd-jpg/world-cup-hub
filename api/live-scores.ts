type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type EspnPayload = {
  events?: Array<{ id?: string }>;
};

const formatDate = (date: Date) =>
  date.toISOString().slice(0, 10).replaceAll("-", "");

const datesAroundToday = () => {
  const today = new Date();
  return [-1, 0, 1].map((offset) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return formatDate(date);
  });
};

const endpoint = (date: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}&limit=100`;

export default async function handler(_request: unknown, response: ApiResponse) {
  try {
    const payloads = await Promise.all(
      datesAroundToday().map(async (date) => {
        const upstream = await fetch(endpoint(date), {
          headers: { Accept: "application/json" },
        });

        if (!upstream.ok) {
          throw new Error(`ESPN returned ${upstream.status}`);
        }

        return (await upstream.json()) as EspnPayload;
      }),
    );

    const eventMap = new Map<string, NonNullable<EspnPayload["events"]>[number]>();

    for (const payload of payloads) {
      for (const event of payload.events ?? []) {
        if (event.id) eventMap.set(event.id, event);
      }
    }

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=45, stale-while-revalidate=120",
    );
    response.status(200).json({
      source: "ESPN",
      fetchedAt: new Date().toISOString(),
      events: Array.from(eventMap.values()),
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      error: error instanceof Error ? error.message : "Live score request failed",
    });
  }
}
