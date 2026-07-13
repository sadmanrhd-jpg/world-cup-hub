/* eslint-disable @typescript-eslint/no-explicit-any */

export const config = {
  maxDuration: 60,
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

const buildLeaders = (players: any[], key: string) =>
  players
    .filter((p) => Number(p[key] ?? 0) > 0)
    .sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0))
    .slice(0, 20)
    .map((p, index) => ({
      rank: index + 1,
      name: p.name,
      country: p.teamName,
      countryCode: p.teamAbbreviation,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      yellowCards: p.yellowCards ?? 0,
      redCards: p.redCards ?? 0,
    }));

export default async function handler(request: any, response: ApiResponse) {
  try {
    const protocol =
      request.headers?.["x-forwarded-proto"] || "https";
    const host = request.headers?.host;

    if (!host) {
      throw new Error("Unable to resolve internal ESPN endpoint.");
    }

    const fantasyUrl = `${protocol}://${host}/api/fantasy-espn`;

    const fantasyResponse = await fetch(fantasyUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!fantasyResponse.ok) {
      throw new Error(
        `ESPN fantasy endpoint failed: ${fantasyResponse.status}`,
      );
    }

    const payload = await fantasyResponse.json();
    const players = Array.isArray(payload.players)
      ? payload.players
      : [];

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=1800",
    );

    response.status(200).json({
      source: "ESPN FIFA World Cup Fantasy API",
      fetchedAt: new Date().toISOString(),
      recordsReceived: players.length,
      playerStatsCount: players.length,
      leaders: {
        goals: buildLeaders(players, "goals"),
        assists: buildLeaders(players, "assists"),
        yellowCards: buildLeaders(players, "yellowCards"),
        redCards: buildLeaders(players, "redCards"),
      },
      stats: players,
    });
  } catch (error) {
    response.status(502).json({
      code: "ESPN_FANTASY_STATS_FAILED",
      error:
        error instanceof Error
          ? error.message
          : "Could not load ESPN fantasy statistics.",
    });
  }
}
