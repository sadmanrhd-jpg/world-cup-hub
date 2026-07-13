/* eslint-disable @typescript-eslint/no-explicit-any */
import fantasyEspnHandler from "./fantasy-espn";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

type StatCategory = "goals" | "assists" | "yellowCards" | "redCards";

type FantasyPlayer = {
  id?: string;
  name?: string;
  teamName?: string;
  teamAbbreviation?: string;
  stats?: {
    matches?: number;
    starts?: number;
    minutes?: number;
    goals?: number;
    assists?: number;
    yellowCards?: number;
    redCards?: number;
  };
};

type FantasyPoolPayload = {
  source?: string;
  generatedAt?: string;
  round?: {
    completedMatches?: number;
  };
  players?: FantasyPlayer[];
  warnings?: string[];
  error?: string;
};

type TournamentPlayer = {
  rank: number;
  name: string;
  country: string;
  countryCode: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const invokeFantasyPool = async (): Promise<FantasyPoolPayload> => {
  let statusCode = 200;
  let body: FantasyPoolPayload | undefined;

  const response: ApiResponse = {
    setHeader: () => undefined,
    status: (code: number) => {
      statusCode = code;
      return response;
    },
    json: (value: unknown) => {
      body = value as FantasyPoolPayload;
    },
  };

  await fantasyEspnHandler(
    { method: "GET", query: { view: "pool" } },
    response,
  );

  if (statusCode < 200 || statusCode >= 300 || !body) {
    throw new Error(
      body?.error || `ESPN fantasy data request returned ${statusCode}.`,
    );
  }

  return body;
};

const normalizePlayer = (player: FantasyPlayer): Omit<TournamentPlayer, "rank"> => ({
  name: String(player.name ?? "Unknown player"),
  country: String(player.teamName ?? "Unknown team"),
  countryCode: String(player.teamAbbreviation ?? "").toUpperCase().slice(0, 3),
  goals: numberValue(player.stats?.goals),
  assists: numberValue(player.stats?.assists),
  yellowCards: numberValue(player.stats?.yellowCards),
  redCards: numberValue(player.stats?.redCards),
});

const buildLeaders = (
  players: Array<Omit<TournamentPlayer, "rank">>,
  category: StatCategory,
  limit = 20,
): TournamentPlayer[] => {
  const secondary: StatCategory = category === "goals" ? "assists" : "goals";

  return players
    .filter((player) => player[category] > 0)
    .sort((first, second) => {
      const primaryDifference = second[category] - first[category];
      if (primaryDifference !== 0) return primaryDifference;

      const secondaryDifference = second[secondary] - first[secondary];
      if (secondaryDifference !== 0) return secondaryDifference;

      return first.name.localeCompare(second.name);
    })
    .slice(0, limit)
    .map((player, index) => ({ ...player, rank: index + 1 }));
};

export const config = {
  maxDuration: 60,
};

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method && request.method !== "GET") {
    response.status(405).json({ error: "Only GET requests are supported." });
    return;
  }

  try {
    const fantasyPool = await invokeFantasyPool();
    const players = (fantasyPool.players ?? []).map(normalizePlayer);
    const fetchedAt = fantasyPool.generatedAt || new Date().toISOString();

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=1800",
    );

    response.status(200).json({
      source: "ESPN FIFA World Cup Fantasy API",
      fetchedAt,
      completedMatches: numberValue(fantasyPool.round?.completedMatches),
      parsedMatches: numberValue(fantasyPool.round?.completedMatches),
      playerStatsCount: players.length,
      warnings: fantasyPool.warnings ?? [],
      leaders: {
        goals: buildLeaders(players, "goals"),
        assists: buildLeaders(players, "assists"),
        yellowCards: buildLeaders(players, "yellowCards"),
        redCards: buildLeaders(players, "redCards"),
      },
    });
  } catch (error) {
    console.error("ESPN tournament statistics sync failed", error);
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      code: "ESPN_STATS_REQUEST_FAILED",
      provider: "ESPN",
      error:
        error instanceof Error
          ? error.message
          : "Could not load ESPN tournament statistics.",
    });
  }
}
