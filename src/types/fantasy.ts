export type FantasyPosition = "GK" | "DEF" | "MID" | "FW";
export type FantasyRoundCode = "QF" | "SF" | "FINAL";
export type FantasySquadRole = "starter" | "bench";

export type FantasyPlayerStats = {
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  fantasyPoints: number;
};

export type FantasyPlayer = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  position: FantasyPosition;
  price: number;
  headshotUrl: string | null;
  stats: FantasyPlayerStats;
};

export type FantasyRoundInfo = {
  code: FantasyRoundCode;
  name: string;
  budget: number;
  completedMatches: number;
  firstMatchId: string | null;
  firstMatchKickoff: string | null;
  lockAt: string | null;
  locked: boolean;
  lockMessage: string;
};

export type FantasyPoolResponse = {
  source: "ESPN";
  generatedAt: string;
  round: FantasyRoundInfo;
  teams: Array<{
    id: string;
    name: string;
    abbreviation: string;
    logo: string | null;
  }>;
  players: FantasyPlayer[];
  warnings: string[];
};

export type FantasySquadPlayer = {
  playerId: string;
  name: string;
  teamName: string;
  position: FantasyPosition;
  price: number;
  role: FantasySquadRole;
  benchOrder: number | null;
  selectedAt: string;
};

export type FantasySquadDraft = {
  id: string | null;
  roundCode: FantasyRoundCode;
  captainPlayerId: string | null;
  players: FantasySquadPlayer[];
  submittedAt: string | null;
  updatedAt: string | null;
};

export type FantasyPointRow = {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  teamName: string;
  roundCode: FantasyRoundCode;
  totalPoints: number;
  breakdown: Record<string, number>;
  finalized: boolean;
};

export type FantasyLeaderboardRow = {
  userId: string;
  displayName: string;
  totalPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  firstSubmittedAt: string | null;
};
