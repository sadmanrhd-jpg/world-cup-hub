export type StatCategory = "goals" | "assists" | "yellowCards" | "redCards";

export type TournamentStatPlayer = {
  rank: number;
  name: string;
  country: string;
  countryCode: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type StatCategoryConfig = {
  id: StatCategory;
  label: string;
  shortLabel: string;
  title: string;
};

export type TournamentStatsPayload = {
  source: string;
  fetchedAt: string;
  completedMatches: number;
  parsedMatches: number;
  playerStatsCount: number;
  leaders: Record<StatCategory, TournamentStatPlayer[]>;
};

export const STAT_CATEGORIES: StatCategoryConfig[] = [
  { id: "goals", label: "Goals", shortLabel: "G", title: "Top Goal Scorers" },
  { id: "assists", label: "Assists", shortLabel: "A", title: "Top Assist Makers" },
  { id: "yellowCards", label: "Yellow Cards", shortLabel: "YC", title: "Yellow Card List" },
  { id: "redCards", label: "Red Cards", shortLabel: "RC", title: "Red Card List" },
];

export const EMPTY_TOURNAMENT_STATS: TournamentStatsPayload = {
  source: "",
  fetchedAt: "",
  completedMatches: 0,
  parsedMatches: 0,
  playerStatsCount: 0,
  leaders: {
    goals: [],
    assists: [],
    yellowCards: [],
    redCards: [],
  },
};

export const getCategoryConfig = (category: StatCategory) =>
  STAT_CATEGORIES.find((item) => item.id === category) ?? STAT_CATEGORIES[0];
