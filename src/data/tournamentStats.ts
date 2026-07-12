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

export const STAT_CATEGORIES: StatCategoryConfig[] = [
  { id: "goals", label: "Goals", shortLabel: "G", title: "Top Goal Scorers" },
  { id: "assists", label: "Assists", shortLabel: "A", title: "Top Assist Makers" },
  { id: "yellowCards", label: "Yellow Cards", shortLabel: "YC", title: "Yellow Card List" },
  { id: "redCards", label: "Red Cards", shortLabel: "RC", title: "Red Card List" },
];

export const TOURNAMENT_STATS: Record<StatCategory, TournamentStatPlayer[]> = {
  goals: [
    { rank: 1, name: "Kylian Mbappé", country: "France", countryCode: "FRA", goals: 5, assists: 2, yellowCards: 0, redCards: 0 },
    { rank: 2, name: "Lionel Messi", country: "Argentina", countryCode: "ARG", goals: 5, assists: 1, yellowCards: 0, redCards: 0 },
    { rank: 3, name: "Harry Kane", country: "England", countryCode: "ENG", goals: 4, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 4, name: "Lamine Yamal", country: "Spain", countryCode: "ESP", goals: 3, assists: 3, yellowCards: 0, redCards: 0 },
    { rank: 5, name: "Michael Olise", country: "France", countryCode: "FRA", goals: 3, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 6, name: "Erling Haaland", country: "Norway", countryCode: "NOR", goals: 3, assists: 1, yellowCards: 0, redCards: 0 },
    { rank: 7, name: "Julián Álvarez", country: "Argentina", countryCode: "ARG", goals: 3, assists: 1, yellowCards: 0, redCards: 0 },
    { rank: 8, name: "Bukayo Saka", country: "England", countryCode: "ENG", goals: 2, assists: 3, yellowCards: 1, redCards: 0 },
    { rank: 9, name: "Pedri", country: "Spain", countryCode: "ESP", goals: 2, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 10, name: "Kevin De Bruyne", country: "Belgium", countryCode: "BEL", goals: 2, assists: 2, yellowCards: 1, redCards: 0 },
  ],
  assists: [
    { rank: 1, name: "Lamine Yamal", country: "Spain", countryCode: "ESP", goals: 3, assists: 3, yellowCards: 0, redCards: 0 },
    { rank: 2, name: "Bukayo Saka", country: "England", countryCode: "ENG", goals: 2, assists: 3, yellowCards: 1, redCards: 0 },
    { rank: 3, name: "Kylian Mbappé", country: "France", countryCode: "FRA", goals: 5, assists: 2, yellowCards: 0, redCards: 0 },
    { rank: 4, name: "Harry Kane", country: "England", countryCode: "ENG", goals: 4, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 5, name: "Michael Olise", country: "France", countryCode: "FRA", goals: 3, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 6, name: "Kevin De Bruyne", country: "Belgium", countryCode: "BEL", goals: 2, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 7, name: "Achraf Hakimi", country: "Morocco", countryCode: "MAR", goals: 1, assists: 2, yellowCards: 2, redCards: 0 },
    { rank: 8, name: "Pedri", country: "Spain", countryCode: "ESP", goals: 2, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 9, name: "Jude Bellingham", country: "England", countryCode: "ENG", goals: 1, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 10, name: "Ousmane Dembélé", country: "France", countryCode: "FRA", goals: 1, assists: 2, yellowCards: 0, redCards: 0 },
  ],
  yellowCards: [
    { rank: 1, name: "Achraf Hakimi", country: "Morocco", countryCode: "MAR", goals: 1, assists: 2, yellowCards: 2, redCards: 0 },
    { rank: 2, name: "Granit Xhaka", country: "Switzerland", countryCode: "SUI", goals: 0, assists: 1, yellowCards: 2, redCards: 0 },
    { rank: 3, name: "Rodri", country: "Spain", countryCode: "ESP", goals: 1, assists: 0, yellowCards: 2, redCards: 0 },
    { rank: 4, name: "Romelu Lukaku", country: "Belgium", countryCode: "BEL", goals: 2, assists: 0, yellowCards: 1, redCards: 0 },
    { rank: 5, name: "Harry Kane", country: "England", countryCode: "ENG", goals: 4, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 6, name: "Bukayo Saka", country: "England", countryCode: "ENG", goals: 2, assists: 3, yellowCards: 1, redCards: 0 },
    { rank: 7, name: "Kevin De Bruyne", country: "Belgium", countryCode: "BEL", goals: 2, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 8, name: "Pedri", country: "Spain", countryCode: "ESP", goals: 2, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 9, name: "Jude Bellingham", country: "England", countryCode: "ENG", goals: 1, assists: 2, yellowCards: 1, redCards: 0 },
    { rank: 10, name: "Michael Olise", country: "France", countryCode: "FRA", goals: 3, assists: 2, yellowCards: 1, redCards: 0 },
  ],
  redCards: [
    { rank: 1, name: "Nicolás Otamendi", country: "Argentina", countryCode: "ARG", goals: 0, assists: 0, yellowCards: 1, redCards: 1 },
    { rank: 2, name: "Remo Freuler", country: "Switzerland", countryCode: "SUI", goals: 0, assists: 0, yellowCards: 1, redCards: 1 },
    { rank: 3, name: "Azzedine Ounahi", country: "Morocco", countryCode: "MAR", goals: 0, assists: 1, yellowCards: 1, redCards: 0 },
    { rank: 4, name: "Leandro Paredes", country: "Argentina", countryCode: "ARG", goals: 0, assists: 1, yellowCards: 1, redCards: 0 },
    { rank: 5, name: "Aymeric Laporte", country: "Spain", countryCode: "ESP", goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    { rank: 6, name: "John Stones", country: "England", countryCode: "ENG", goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    { rank: 7, name: "Jan Vertonghen", country: "Belgium", countryCode: "BEL", goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    { rank: 8, name: "William Saliba", country: "France", countryCode: "FRA", goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    { rank: 9, name: "Manuel Akanji", country: "Switzerland", countryCode: "SUI", goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    { rank: 10, name: "Sofyan Amrabat", country: "Morocco", countryCode: "MAR", goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
  ],
};

export const getCategoryConfig = (category: StatCategory) =>
  STAT_CATEGORIES.find((item) => item.id === category) ?? STAT_CATEGORIES[0];

export const getTournamentStatRows = (category: StatCategory, limit = 5) =>
  TOURNAMENT_STATS[category].slice(0, limit);
