/* eslint-disable @typescript-eslint/no-explicit-any */

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type Category = "goals" | "assists" | "yellowCards" | "redCards";

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE = "1";
const WORLD_CUP_SEASON = "2026";

const request = async (path: string, token: string, params: Record<string,string>) => {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": token,
      Accept: "application/json",
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`API Football ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
};

const empty = (name:string, team:string, country:string) => ({
  name,
  teamSlug: team,
  country,
  countryCode: country.slice(0,3).toUpperCase(),
  goals:0,
  assists:0,
  yellowCards:0,
  redCards:0,
  appearances:0,
  starts:0,
  minutes:0,
  tackles:0,
  interceptions:0,
  saves:0,
  cleanSheets:0,
  source:"api",
  updatedAt:new Date().toISOString()
});

export default async function handler(_req:any,res:ApiResponse) {
  const token = process.env.API_FOOTBALL_KEY?.trim();

  if (!token) {
    res.status(503).json({
      code:"API_FOOTBALL_KEY_MISSING",
      message:"Add API_FOOTBALL_KEY in environment variables"
    });
    return;
  }

  try {
    const response = await request(
      "/players/topscorers",
      token,
      {
        league: WORLD_CUP_LEAGUE,
        season: WORLD_CUP_SEASON
      }
    );

    const players = response.response || [];

    const rows = players.map((item:any) => {
      const p = item.player || {};
      const stats = item.statistics?.[0] || {};
      const goals = stats.goals || {};
      const cards = stats.cards || {};

      return {
        ...empty(
          p.name || "Unknown",
          stats.team?.name || "",
          stats.team?.country || ""
        ),
        goals: Number(goals.total || 0),
        assists: Number(goals.assists || 0),
        yellowCards: Number(cards.yellow || 0),
        redCards: Number(cards.red || 0),
        appearances:Number(stats.games?.appearences || 0),
        minutes:Number(stats.games?.minutes || 0)
      };
    });

    const sort = (key:Category) =>
      [...rows]
        .filter(x => x[key] > 0)
        .sort((a,b)=>b[key]-a[key])
        .slice(0,20)
        .map((x,i)=>({
          rank:i+1,
          name:x.name,
          country:x.country,
          countryCode:x.countryCode,
          goals:x.goals,
          assists:x.assists,
          yellowCards:x.yellowCards,
          redCards:x.redCards
        }));

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900"
    );

    res.status(200).json({
      source:"API Football",
      strategy:"API Football players/topscorers",
      fetchedAt:new Date().toISOString(),
      leagueId:WORLD_CUP_LEAGUE,
      season:WORLD_CUP_SEASON,
      recordsReceived:players.length,
      playerStatsCount:rows.length,
      leaders:{
        goals:sort("goals"),
        assists:sort("assists"),
        yellowCards:sort("yellowCards"),
        redCards:sort("redCards")
      },
      stats:Object.fromEntries(rows.map(x=>[x.name,x]))
    });

  } catch(error:any) {
    res.status(502).json({
      code:"API_FOOTBALL_FAILED",
      error:error?.message || "Request failed"
    });
  }
}
