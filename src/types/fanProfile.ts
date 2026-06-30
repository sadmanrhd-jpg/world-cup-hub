export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD";

export type PlayerTournamentStats = {
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  tackles: number;
  interceptions: number;
  saves: number;
  cleanSheets: number;
  source: "api" | "manual" | "hybrid";
  updatedAt: string | null;
};

export type WorldCupPlayer = {
  id: string;
  sourceKey: string;
  name: string;
  teamSlug: string;
  teamName: string;
  position: PlayerPosition;
  detailedPosition: string | null;
  shirtNumber: number | null;
  club: string | null;
  imageUrl: string | null;
  active: boolean;
  stats: PlayerTournamentStats;
};

export type WorldCupManager = {
  id: string;
  name: string;
  teamSlug: string;
  teamName: string;
  nationality: string | null;
};

export type FormationSlot = {
  id: string;
  label: string;
  position: PlayerPosition;
  x: number;
  y: number;
};

export type FormationDefinition = {
  id: string;
  name: string;
  slots: FormationSlot[];
};

export type BestXiStarter = {
  slotId: string;
  playerId: string;
};

export type BestXiPayload = {
  starters: BestXiStarter[];
  substitutes: string[];
  managerId: string | null;
};

export type SavedBestXi = {
  id: string;
  name: string;
  formation: string;
  payload: BestXiPayload;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  favoriteTeamSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MiniGameResultInput = {
  fixtureId?: number | null;
  selectedTeam: string;
  opponent: string;
  goals: number;
  shots: number;
  saves: number;
  misses: number;
  accuracy: number;
};

export type MiniGameSummary = {
  gamesPlayed: number;
  totalGoals: number;
  totalShots: number;
  totalSavesFaced: number;
  totalMisses: number;
  bestScore: number;
  bestAccuracy: number;
  mostUsedTeam: string | null;
};
