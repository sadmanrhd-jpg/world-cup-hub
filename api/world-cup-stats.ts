export const config = {
  maxDuration: 60,
};

import fantasyHandler from "./fantasy-espn";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  try {
    let statusCode = 200;
    let payload: any = null;

    const mockResponse: ApiResponse = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader() {},
      json(body) {
        payload = body;
      },
    };

    await fantasyHandler(request, mockResponse);

    if (statusCode !== 200 || !payload) {
      response.status(statusCode || 502).json(payload ?? {
        error: "Could not load ESPN fantasy statistics."
      });
      return;
    }

    const players = payload.players ?? [];

    const createRows = (key: string) =>
      players
        .map((player: any) => ({
          name: player.name,
          country: player.teamAbbreviation || "",
          value: Number(player.stats?.[key] ?? 0),
        }))
        .filter((player: any) => player.value > 0)
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10);

    response.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=3600",
    );

    response.status(200).json({
      source: "ESPN FIFA World Cup Fantasy API",
      fetchedAt: new Date().toISOString(),
      leaders: {
        goals: createRows("goals").map((p:any) => ({
          ...p,
          goals: p.value,
        })),
        assists: createRows("assists").map((p:any) => ({
          ...p,
          assists: p.value,
        })),
        yellowCards: createRows("yellowCards").map((p:any) => ({
          ...p,
          yellowCards: p.value,
        })),
        redCards: createRows("redCards").map((p:any) => ({
          ...p,
          redCards: p.value,
        })),
      },
      stats: {
        totalPlayers: players.length,
      },
    });
  } catch (error) {
    response.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Could not load ESPN statistics.",
    });
  }
}