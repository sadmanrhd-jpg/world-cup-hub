export type Team = {
  slug: string;
  name: string;
  flag: string; // emoji
  group: string;
  baseCamp: string;
  homeStadium: string;
  kits: { home: string; away: string; third?: string };
  squad: string[] | "TBA";
};

export const TEAMS: Team[] = [
  // Group A
  { slug: "mexico", name: "Mexico", flag: "🇲🇽", group: "A", baseCamp: "Mexico City, Mexico", homeStadium: "Estadio Azteca (Mexico City Stadium)", kits: { home: "Green & White", away: "Black", third: "Red" }, squad: "TBA" },
  { slug: "south-africa", name: "South Africa", flag: "🇿🇦", group: "A", baseCamp: "TBA", homeStadium: "FNB Stadium, Johannesburg", kits: { home: "Yellow & Green", away: "White" }, squad: "TBA" },
  { slug: "korea-republic", name: "Korea Republic", flag: "🇰🇷", group: "A", baseCamp: "TBA", homeStadium: "Seoul World Cup Stadium", kits: { home: "Red", away: "White" }, squad: "TBA" },
  { slug: "czechia", name: "Czechia", flag: "🇨🇿", group: "A", baseCamp: "TBA", homeStadium: "Fortuna Arena, Prague", kits: { home: "Red", away: "White" }, squad: "TBA" },

  // Group B
  { slug: "canada", name: "Canada", flag: "🇨🇦", group: "B", baseCamp: "Toronto, Canada", homeStadium: "BMO Field / BC Place", kits: { home: "Red", away: "White" }, squad: "TBA" },
  { slug: "bosnia-herzegovina", name: "Bosnia and Herzegovina", flag: "🇧🇦", group: "B", baseCamp: "TBA", homeStadium: "Bilino Polje, Zenica", kits: { home: "Blue", away: "White" }, squad: "TBA" },
  { slug: "qatar", name: "Qatar", flag: "🇶🇦", group: "B", baseCamp: "TBA", homeStadium: "Lusail Stadium", kits: { home: "Maroon", away: "White" }, squad: "TBA" },
  { slug: "switzerland", name: "Switzerland", flag: "🇨🇭", group: "B", baseCamp: "TBA", homeStadium: "St. Jakob-Park, Basel", kits: { home: "Red", away: "White" }, squad: "TBA" },

  // Group C
  { slug: "haiti", name: "Haiti", flag: "🇭🇹", group: "C", baseCamp: "TBA", homeStadium: "Stade Sylvio Cator, Port-au-Prince", kits: { home: "Blue", away: "Red" }, squad: "TBA" },
  { slug: "scotland", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C", baseCamp: "TBA", homeStadium: "Hampden Park, Glasgow", kits: { home: "Navy", away: "White" }, squad: "TBA" },
  { slug: "brazil", name: "Brazil", flag: "🇧🇷", group: "C", baseCamp: "TBA", homeStadium: "Maracanã, Rio de Janeiro", kits: { home: "Yellow & Blue", away: "Blue", third: "Black" }, squad: "TBA" },
  { slug: "morocco", name: "Morocco", flag: "🇲🇦", group: "C", baseCamp: "TBA", homeStadium: "Stade Mohammed V, Casablanca", kits: { home: "Red", away: "White" }, squad: "TBA" },

  // Group D
  { slug: "usa", name: "USA", flag: "🇺🇸", group: "D", baseCamp: "Atlanta, USA", homeStadium: "Mercedes-Benz Stadium, Atlanta", kits: { home: "White", away: "Navy" }, squad: "TBA" },
  { slug: "paraguay", name: "Paraguay", flag: "🇵🇾", group: "D", baseCamp: "TBA", homeStadium: "Estadio Defensores del Chaco", kits: { home: "Red & White stripes", away: "Blue" }, squad: "TBA" },
  { slug: "australia", name: "Australia", flag: "🇦🇺", group: "D", baseCamp: "TBA", homeStadium: "Stadium Australia, Sydney", kits: { home: "Gold", away: "Green" }, squad: "TBA" },
  { slug: "turkiye", name: "Türkiye", flag: "🇹🇷", group: "D", baseCamp: "TBA", homeStadium: "Atatürk Olympic Stadium, Istanbul", kits: { home: "Red", away: "White" }, squad: "TBA" },

  // Group E
  { slug: "cote-divoire", name: "Côte d'Ivoire", flag: "🇨🇮", group: "E", baseCamp: "TBA", homeStadium: "Stade Olympique Alassane Ouattara", kits: { home: "Orange", away: "White" }, squad: "TBA" },
  { slug: "ecuador", name: "Ecuador", flag: "🇪🇨", group: "E", baseCamp: "TBA", homeStadium: "Estadio Rodrigo Paz Delgado, Quito", kits: { home: "Yellow", away: "Blue" }, squad: "TBA" },
  { slug: "germany", name: "Germany", flag: "🇩🇪", group: "E", baseCamp: "TBA", homeStadium: "Allianz Arena, Munich", kits: { home: "White", away: "Pink/Black" }, squad: "TBA" },
  { slug: "curacao", name: "Curaçao", flag: "🇨🇼", group: "E", baseCamp: "TBA", homeStadium: "Ergilio Hato Stadium, Willemstad", kits: { home: "Blue", away: "White" }, squad: "TBA" },

  // Group F
  { slug: "netherlands", name: "Netherlands", flag: "🇳🇱", group: "F", baseCamp: "TBA", homeStadium: "Johan Cruijff ArenA, Amsterdam", kits: { home: "Orange", away: "Blue" }, squad: "TBA" },
  { slug: "japan", name: "Japan", flag: "🇯🇵", group: "F", baseCamp: "TBA", homeStadium: "Japan National Stadium, Tokyo", kits: { home: "Blue", away: "White" }, squad: "TBA" },
  { slug: "sweden", name: "Sweden", flag: "🇸🇪", group: "F", baseCamp: "TBA", homeStadium: "Friends Arena, Stockholm", kits: { home: "Yellow", away: "Blue" }, squad: "TBA" },
  { slug: "tunisia", name: "Tunisia", flag: "🇹🇳", group: "F", baseCamp: "TBA", homeStadium: "Stade Hammadi Agrebi, Radès", kits: { home: "White & Red", away: "Red" }, squad: "TBA" },

  // Group G
  { slug: "iran", name: "IR Iran", flag: "🇮🇷", group: "G", baseCamp: "TBA", homeStadium: "Azadi Stadium, Tehran", kits: { home: "White", away: "Red" }, squad: "TBA" },
  { slug: "new-zealand", name: "New Zealand", flag: "🇳🇿", group: "G", baseCamp: "TBA", homeStadium: "Eden Park, Auckland", kits: { home: "White", away: "Black" }, squad: "TBA" },
  { slug: "belgium", name: "Belgium", flag: "🇧🇪", group: "G", baseCamp: "TBA", homeStadium: "King Baudouin Stadium, Brussels", kits: { home: "Red", away: "White" }, squad: "TBA" },
  { slug: "egypt", name: "Egypt", flag: "🇪🇬", group: "G", baseCamp: "TBA", homeStadium: "Cairo International Stadium", kits: { home: "Red", away: "White" }, squad: "TBA" },

  // Group H
  { slug: "saudi-arabia", name: "Saudi Arabia", flag: "🇸🇦", group: "H", baseCamp: "TBA", homeStadium: "King Fahd Stadium, Riyadh", kits: { home: "White & Green", away: "Green" }, squad: "TBA" },
  { slug: "uruguay", name: "Uruguay", flag: "🇺🇾", group: "H", baseCamp: "TBA", homeStadium: "Estadio Centenario, Montevideo", kits: { home: "Sky Blue", away: "White" }, squad: "TBA" },
  { slug: "spain", name: "Spain", flag: "🇪🇸", group: "H", baseCamp: "TBA", homeStadium: "Santiago Bernabéu, Madrid", kits: { home: "Red", away: "Sky Blue" }, squad: "TBA" },
  { slug: "cabo-verde", name: "Cabo Verde", flag: "🇨🇻", group: "H", baseCamp: "TBA", homeStadium: "Estádio Nacional, Praia", kits: { home: "Blue", away: "White" }, squad: "TBA" },

  // Group I
  { slug: "france", name: "France", flag: "🇫🇷", group: "I", baseCamp: "TBA", homeStadium: "Stade de France, Saint-Denis", kits: { home: "Blue", away: "White" }, squad: "TBA" },
  { slug: "senegal", name: "Senegal", flag: "🇸🇳", group: "I", baseCamp: "TBA", homeStadium: "Stade Abdoulaye Wade, Diamniadio", kits: { home: "White", away: "Green" }, squad: "TBA" },
  { slug: "iraq", name: "Iraq", flag: "🇮🇶", group: "I", baseCamp: "TBA", homeStadium: "Basra International Stadium", kits: { home: "Green", away: "White" }, squad: "TBA" },
  { slug: "norway", name: "Norway", flag: "🇳🇴", group: "I", baseCamp: "TBA", homeStadium: "Ullevaal Stadion, Oslo", kits: { home: "Red", away: "White" }, squad: "TBA" },

  // Group J
  { slug: "argentina", name: "Argentina", flag: "🇦🇷", group: "J", baseCamp: "TBA", homeStadium: "Estadio Monumental, Buenos Aires", kits: { home: "Sky Blue & White", away: "Purple" }, squad: "TBA" },
  { slug: "algeria", name: "Algeria", flag: "🇩🇿", group: "J", baseCamp: "TBA", homeStadium: "Stade Nelson Mandela, Algiers", kits: { home: "White & Green", away: "Green" }, squad: "TBA" },
  { slug: "austria", name: "Austria", flag: "🇦🇹", group: "J", baseCamp: "TBA", homeStadium: "Ernst-Happel-Stadion, Vienna", kits: { home: "Red", away: "White" }, squad: "TBA" },
  { slug: "jordan", name: "Jordan", flag: "🇯🇴", group: "J", baseCamp: "TBA", homeStadium: "Amman International Stadium", kits: { home: "White", away: "Red" }, squad: "TBA" },

  // Group K
  { slug: "portugal", name: "Portugal", flag: "🇵🇹", group: "K", baseCamp: "TBA", homeStadium: "Estádio da Luz, Lisbon", kits: { home: "Red & Green", away: "White" }, squad: "TBA" },
  { slug: "congo-dr", name: "Congo DR", flag: "🇨🇩", group: "K", baseCamp: "TBA", homeStadium: "Stade des Martyrs, Kinshasa", kits: { home: "Blue", away: "White" }, squad: "TBA" },
  { slug: "uzbekistan", name: "Uzbekistan", flag: "🇺🇿", group: "K", baseCamp: "TBA", homeStadium: "Milliy Stadium, Tashkent", kits: { home: "White", away: "Blue" }, squad: "TBA" },
  { slug: "colombia", name: "Colombia", flag: "🇨🇴", group: "K", baseCamp: "TBA", homeStadium: "Estadio Metropolitano, Barranquilla", kits: { home: "Yellow", away: "Blue" }, squad: "TBA" },

  // Group L
  { slug: "ghana", name: "Ghana", flag: "🇬🇭", group: "L", baseCamp: "TBA", homeStadium: "Accra Sports Stadium", kits: { home: "White", away: "Red" }, squad: "TBA" },
  { slug: "panama", name: "Panama", flag: "🇵🇦", group: "L", baseCamp: "TBA", homeStadium: "Estadio Rommel Fernández, Panama City", kits: { home: "Red", away: "White" }, squad: "TBA" },
  { slug: "england", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L", baseCamp: "TBA", homeStadium: "Wembley Stadium, London", kits: { home: "White", away: "Navy" }, squad: "TBA" },
  { slug: "croatia", name: "Croatia", flag: "🇭🇷", group: "L", baseCamp: "TBA", homeStadium: "Stadion Maksimir, Zagreb", kits: { home: "Red & White checks", away: "Blue" }, squad: "TBA" },
];

export const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;

export const getTeam = (slug: string) => TEAMS.find(t => t.slug === slug);
export const teamsInGroup = (g: string) => TEAMS.filter(t => t.group === g);
export const getTeamByName = (name: string) => TEAMS.find(t => t.name === name);

// Match status helpers — assume "now" against the fixture local time string
const MATCH_DURATION_MS = 110 * 60 * 1000; // 90' + stoppage/HT

export const fixtureKickoff = (f: { date: string; time: string }) =>
  new Date(`${f.date}T${f.time}:00`);

export const fixtureStatus = (
  f: { date: string; time: string },
  now: Date = new Date(),
): "live" | "finished" | "upcoming" => {
  const ko = fixtureKickoff(f).getTime();
  const t = now.getTime();
  if (t < ko) return "upcoming";
  if (t < ko + MATCH_DURATION_MS) return "live";
  return "finished";
};

export type Fixture = {
  id: number;
  date: string; // ISO date (yyyy-mm-dd)
  time: string; // HH:MM local
  home: string; // team name
  away: string;
  group?: string;
  stadium: string;
  stage: "Group" | "R32" | "R16" | "QF" | "SF" | "3rd" | "Final";
  label?: string; // for knockouts when teams TBD
  score?: { home: number; away: number }; // present when match has been played
};

const G = (
  id: number,
  date: string,
  time: string,
  home: string,
  away: string,
  group: string,
  stadium: string,
  score?: { home: number; away: number },
): Fixture => ({ id, date, time, home, away, group, stadium, stage: "Group", score });

export const FIXTURES: Fixture[] = [
  // Matchday 1 — dates & times per official FIFA schedule
  G(1, "2026-06-12", "22:00", "Mexico", "South Africa", "A", "Mexico City Stadium", { home: 2, away: 0 }),
  G(2, "2026-06-12", "01:00", "Korea Republic", "Czechia", "A", "Estadio Guadalajara", { home: 2, away: 1 }),
  G(3, "2026-06-13", "22:00", "Canada", "Bosnia and Herzegovina", "B", "Toronto Stadium", { home: 1, away: 1 }),
  G(4, "2026-06-13", "01:00", "USA", "Paraguay", "D", "Los Angeles Stadium", { home: 4, away: 1 }),
  G(5, "2026-06-14", "22:00", "Qatar", "Switzerland", "B", "San Francisco Bay Area Stadium", { home: 1, away: 1 }),
  G(6, "2026-06-14", "19:00", "Brazil", "Morocco", "C", "New York New Jersey Stadium", { home: 1, away: 1 }),
  G(7, "2026-06-14", "01:00", "Haiti", "Scotland", "C", "Boston Stadium", { home: 0, away: 1 }),
  G(8, "2026-06-14", "04:00", "Australia", "Türkiye", "D", "BC Place Vancouver", { home: 2, away: 0 }),
  G(9, "2026-06-14", "07:00", "Germany", "Curaçao", "E", "Houston Stadium", { home: 7, away: 1 }),
  G(10, "2026-06-15", "22:00", "Netherlands", "Japan", "F", "Dallas Stadium", { home: 2, away: 2 }),
  G(11, "2026-06-15", "01:00", "Côte d'Ivoire", "Ecuador", "E", "Philadelphia Stadium", { home: 1, away: 0 }),
  G(12, "2026-06-15", "04:00", "Sweden", "Tunisia", "F", "Estadio Monterrey", { home: 5, away: 1 }),
  G(13, "2026-06-15", "19:00", "Spain", "Cabo Verde", "H", "Atlanta Stadium", { home: 0, away: 0 }),
  G(14, "2026-06-16", "22:00", "Belgium", "Egypt", "G", "Seattle Stadium", { home: 1, away: 1 }),
  G(15, "2026-06-16", "01:00", "Saudi Arabia", "Uruguay", "H", "Miami Stadium", { home: 1, away: 1 }),
  G(16, "2026-06-16", "04:00", "IR Iran", "New Zealand", "G", "Los Angeles Stadium", { home: 2, away: 2 }),
  G(17, "2026-06-17", "01:00", "France", "Senegal", "I", "New York New Jersey Stadium"),
  G(18, "2026-06-17", "10:00", "Austria", "Jordan", "J", "San Francisco Bay Area Stadium"),
  G(19, "2026-06-17", "23:00", "Portugal", "Congo DR", "K", "Houston Stadium"),
  G(20, "2026-06-18", "02:00", "England", "Croatia", "L", "Dallas Stadium"),
  G(21, "2026-06-18", "05:00", "Ghana", "Panama", "L", "Toronto Stadium"),
  G(22, "2026-06-18", "08:00", "Uzbekistan", "Colombia", "K", "Mexico City Stadium"),
  G(23, "2026-06-17", "13:00", "Iraq", "Norway", "I", "Boston Stadium"),
  G(24, "2026-06-17", "16:00", "Argentina", "Algeria", "J", "Kansas City Stadium"),

  // Matchday 2
  G(25, "2026-06-18", "22:00", "Czechia", "South Africa", "A", "Atlanta Stadium"),
  G(26, "2026-06-19", "01:00", "Switzerland", "Bosnia and Herzegovina", "B", "Los Angeles Stadium"),
  G(27, "2026-06-19", "04:00", "Canada", "Qatar", "B", "BC Place Vancouver"),
  G(28, "2026-06-19", "07:00", "Mexico", "Korea Republic", "A", "Estadio Guadalajara"),
  G(29, "2026-06-20", "01:00", "USA", "Australia", "D", "Seattle Stadium"),
  G(30, "2026-06-20", "04:00", "Scotland", "Morocco", "C", "Boston Stadium"),
  G(31, "2026-06-20", "06:30", "Brazil", "Haiti", "C", "Philadelphia Stadium"),
  G(32, "2026-06-20", "09:00", "Türkiye", "Paraguay", "D", "San Francisco Bay Area Stadium"),
  G(33, "2026-06-20", "23:00", "Netherlands", "Sweden", "F", "Houston Stadium"),
  G(34, "2026-06-21", "02:00", "Germany", "Côte d'Ivoire", "E", "Toronto Stadium"),
  G(35, "2026-06-21", "06:00", "Ecuador", "Curaçao", "E", "Kansas City Stadium"),
  G(36, "2026-06-21", "10:00", "Tunisia", "Japan", "F", "Estadio Monterrey"),
  G(37, "2026-06-21", "22:00", "Spain", "Saudi Arabia", "H", "Atlanta Stadium"),
  G(38, "2026-06-22", "01:00", "Belgium", "IR Iran", "G", "Los Angeles Stadium"),
  G(39, "2026-06-22", "04:00", "Uruguay", "Cabo Verde", "H", "Miami Stadium"),
  G(40, "2026-06-22", "07:00", "New Zealand", "Egypt", "G", "BC Place Vancouver"),
  G(41, "2026-06-22", "23:00", "Argentina", "Austria", "J", "Dallas Stadium"),
  G(42, "2026-06-23", "03:00", "France", "Iraq", "I", "Philadelphia Stadium"),
  G(43, "2026-06-23", "06:00", "Norway", "Senegal", "I", "New York New Jersey Stadium"),
  G(44, "2026-06-23", "09:00", "Jordan", "Algeria", "J", "San Francisco Bay Area Stadium"),
  G(45, "2026-06-23", "23:00", "Portugal", "Uzbekistan", "K", "Houston Stadium"),
  G(46, "2026-06-24", "02:00", "England", "Ghana", "L", "Boston Stadium"),
  G(47, "2026-06-24", "05:00", "Panama", "Croatia", "L", "Toronto Stadium"),
  G(48, "2026-06-24", "08:00", "Colombia", "Congo DR", "K", "Estadio Guadalajara"),

  // Matchday 3
  G(49, "2026-06-25", "01:00", "Switzerland", "Canada", "B", "BC Place Vancouver"),
  G(50, "2026-06-25", "01:00", "Bosnia and Herzegovina", "Qatar", "B", "Seattle Stadium"),
  G(51, "2026-06-25", "04:00", "Scotland", "Brazil", "C", "Miami Stadium"),
  G(52, "2026-06-25", "04:00", "Morocco", "Haiti", "C", "Atlanta Stadium"),
  G(53, "2026-06-25", "07:00", "Czechia", "Mexico", "A", "Mexico City Stadium"),
  G(54, "2026-06-25", "07:00", "South Africa", "Korea Republic", "A", "Estadio Monterrey"),
  G(55, "2026-06-26", "02:00", "Curaçao", "Côte d'Ivoire", "E", "Philadelphia Stadium"),
  G(56, "2026-06-26", "02:00", "Ecuador", "Germany", "E", "New York New Jersey Stadium"),
  G(57, "2026-06-26", "05:00", "Japan", "Sweden", "F", "Dallas Stadium"),
  G(58, "2026-06-26", "05:00", "Tunisia", "Netherlands", "F", "Kansas City Stadium"),
  G(59, "2026-06-26", "08:00", "Türkiye", "USA", "D", "Los Angeles Stadium"),
  G(60, "2026-06-26", "08:00", "Paraguay", "Australia", "D", "San Francisco Bay Area Stadium"),
  G(61, "2026-06-27", "01:00", "Norway", "France", "I", "Boston Stadium"),
  G(62, "2026-06-27", "01:00", "Senegal", "Iraq", "I", "Toronto Stadium"),
  G(63, "2026-06-27", "06:00", "Cabo Verde", "Saudi Arabia", "H", "Houston Stadium"),
  G(64, "2026-06-27", "06:00", "Uruguay", "Spain", "H", "Estadio Guadalajara"),
  G(65, "2026-06-27", "09:00", "Egypt", "IR Iran", "G", "Seattle Stadium"),
  G(66, "2026-06-27", "09:00", "New Zealand", "Belgium", "G", "BC Place Vancouver"),
  G(67, "2026-06-28", "03:00", "Panama", "England", "L", "New York New Jersey Stadium"),
  G(68, "2026-06-28", "03:00", "Croatia", "Ghana", "L", "Philadelphia Stadium"),
  G(69, "2026-06-28", "05:30", "Colombia", "Portugal", "K", "Miami Stadium"),
  G(70, "2026-06-28", "05:30", "Congo DR", "Uzbekistan", "K", "Atlanta Stadium"),
  G(71, "2026-06-28", "08:00", "Algeria", "Austria", "J", "Kansas City Stadium"),
  G(72, "2026-06-28", "08:00", "Jordan", "Argentina", "J", "Dallas Stadium"),

  // Round of 32 — official FIFA schedule
  { id: 73, date: "2026-06-29", time: "01:00", stage: "R32", home: "A2", away: "B2", stadium: "Los Angeles Stadium", label: "Runner-up Group A v Runner-up Group B" },
  { id: 74, date: "2026-06-29", time: "23:00", stage: "R32", home: "C1", away: "F2", stadium: "Houston Stadium", label: "Winner Group C v Runner-up Group F" },
  { id: 75, date: "2026-06-30", time: "02:30", stage: "R32", home: "E1", away: "3rd ABCDF", stadium: "Boston Stadium", label: "Winner Group E v 3rd Group A/B/C/D/F" },
  { id: 76, date: "2026-06-30", time: "07:00", stage: "R32", home: "F1", away: "C2", stadium: "Estadio Monterrey", label: "Winner Group F v Runner-up Group C" },
  { id: 77, date: "2026-06-30", time: "23:00", stage: "R32", home: "E2", away: "I2", stadium: "Dallas Stadium", label: "Runner-up Group E v Runner-up Group I" },
  { id: 78, date: "2026-07-01", time: "03:00", stage: "R32", home: "I1", away: "3rd CDFGH", stadium: "New York New Jersey Stadium", label: "Winner Group I v 3rd Group C/D/F/G/H" },
  { id: 79, date: "2026-07-01", time: "07:00", stage: "R32", home: "A1", away: "3rd CEFHI", stadium: "Mexico City Stadium", label: "Winner Group A v 3rd Group C/E/F/H/I" },
  { id: 80, date: "2026-07-01", time: "22:00", stage: "R32", home: "L1", away: "3rd EHIJK", stadium: "Atlanta Stadium", label: "Winner Group L v 3rd Group E/H/I/J/K" },
  { id: 81, date: "2026-07-02", time: "02:00", stage: "R32", home: "G1", away: "3rd AEHIJ", stadium: "Seattle Stadium", label: "Winner Group G v 3rd Group A/E/H/I/J" },
  { id: 82, date: "2026-07-02", time: "06:00", stage: "R32", home: "D1", away: "3rd BEFIJ", stadium: "San Francisco Bay Area Stadium", label: "Winner Group D v 3rd Group B/E/F/I/J" },
  { id: 83, date: "2026-07-03", time: "01:00", stage: "R32", home: "H1", away: "2J", stadium: "Los Angeles Stadium", label: "Winner Group H v Runner-up Group J" },
  { id: 84, date: "2026-07-03", time: "05:00", stage: "R32", home: "K2", away: "L2", stadium: "Toronto Stadium", label: "Runner-up Group K v Runner-up Group L" },
  { id: 85, date: "2026-07-03", time: "09:00", stage: "R32", home: "B1", away: "3rd EFGIJ", stadium: "BC Place Vancouver", label: "Winner Group B v 3rd Group E/F/G/I/J" },
  { id: 86, date: "2026-07-04", time: "00:00", stage: "R32", home: "D2", away: "G2", stadium: "Dallas Stadium", label: "Runner-up Group D v Runner-up Group G" },
  { id: 87, date: "2026-07-04", time: "04:00", stage: "R32", home: "J1", away: "H2", stadium: "Miami Stadium", label: "Winner Group J v Runner-up Group H" },
  { id: 88, date: "2026-07-04", time: "07:30", stage: "R32", home: "K1", away: "3rd DEIJL", stadium: "Kansas City Stadium", label: "Winner Group K v 3rd Group D/E/I/J/L" },

  // Round of 16
  { id: 89, date: "2026-07-04", time: "23:00", stage: "R16", home: "W73", away: "W75", stadium: "Houston Stadium" },
  { id: 90, date: "2026-07-05", time: "03:00", stage: "R16", home: "W74", away: "W77", stadium: "Philadelphia Stadium" },
  { id: 91, date: "2026-07-06", time: "02:00", stage: "R16", home: "W76", away: "W78", stadium: "New York New Jersey Stadium" },
  { id: 92, date: "2026-07-06", time: "06:00", stage: "R16", home: "W79", away: "W80", stadium: "Mexico City Stadium" },
  { id: 93, date: "2026-07-07", time: "01:00", stage: "R16", home: "W83", away: "W84", stadium: "Dallas Stadium" },
  { id: 94, date: "2026-07-07", time: "06:00", stage: "R16", home: "W81", away: "W82", stadium: "Seattle Stadium" },
  { id: 95, date: "2026-07-07", time: "22:00", stage: "R16", home: "W86", away: "W88", stadium: "Atlanta Stadium" },
  { id: 96, date: "2026-07-08", time: "02:00", stage: "R16", home: "W85", away: "W87", stadium: "BC Place Vancouver" },

  // QFs
  { id: 97, date: "2026-07-10", time: "02:00", stage: "QF", home: "W89", away: "W90", stadium: "Boston Stadium" },
  { id: 98, date: "2026-07-11", time: "01:00", stage: "QF", home: "W93", away: "W94", stadium: "Los Angeles Stadium" },
  { id: 99, date: "2026-07-12", time: "03:00", stage: "QF", home: "W91", away: "W92", stadium: "Miami Stadium" },
  { id: 100, date: "2026-07-12", time: "07:00", stage: "QF", home: "W95", away: "W96", stadium: "Kansas City Stadium" },

  // SFs
  { id: 101, date: "2026-07-15", time: "01:00", stage: "SF", home: "W97", away: "W98", stadium: "Dallas Stadium" },
  { id: 102, date: "2026-07-16", time: "01:00", stage: "SF", home: "W99", away: "W100", stadium: "Atlanta Stadium" },

  // 3rd place
  { id: 103, date: "2026-07-19", time: "03:00", stage: "3rd", home: "L101", away: "L102", stadium: "Miami Stadium" },

  // Final
  { id: 104, date: "2026-07-20", time: "01:00", stage: "Final", home: "W101", away: "W102", stadium: "New York New Jersey Stadium" },
];

// Tournament prediction (group standings + bracket)
export const PREDICTED_STANDINGS: Record<string, { first: string; second: string; third: string; fourth: string }> = {
  A: { first: "Mexico", second: "Korea Republic", third: "Czechia", fourth: "South Africa" },
  B: { first: "Switzerland", second: "Canada", third: "Bosnia and Herzegovina", fourth: "Qatar" },
  C: { first: "Brazil", second: "Morocco", third: "Scotland", fourth: "Haiti" },
  D: { first: "USA", second: "Australia", third: "Paraguay", fourth: "Türkiye" },
  E: { first: "Germany", second: "Ecuador", third: "Côte d'Ivoire", fourth: "Curaçao" },
  F: { first: "Netherlands", second: "Japan", third: "Sweden", fourth: "Tunisia" },
  G: { first: "Belgium", second: "IR Iran", third: "Egypt", fourth: "New Zealand" },
  H: { first: "Spain", second: "Uruguay", third: "Cabo Verde", fourth: "Saudi Arabia" },
  I: { first: "France", second: "Senegal", third: "Norway", fourth: "Iraq" },
  J: { first: "Argentina", second: "Austria", third: "Algeria", fourth: "Jordan" },
  K: { first: "Portugal", second: "Colombia", third: "Uzbekistan", fourth: "Congo DR" },
  L: { first: "England", second: "Croatia", third: "Ghana", fourth: "Panama" },
};

// Predicted knockout winners
export const PREDICTION = {
  champion: "Argentina",
  runnerUp: "France",
  third: "Brazil",
  fourth: "Spain",
  semis: ["Argentina v Spain", "France v Brazil"],
  quarters: [
    "Argentina v Germany",
    "Spain v Portugal",
    "France v England",
    "Brazil v Belgium",
  ],
  r16: [
    "Argentina v Switzerland",
    "Mexico v Germany",
    "Spain v Netherlands",
    "Portugal v Uruguay",
    "France v USA",
    "Senegal v England",
    "Brazil v Japan",
    "Belgium v Morocco",
  ],
};
