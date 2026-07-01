export type TeamDefinition = {
  slug: string;
  name: string;
  group: string;
};

export const TEAMS: TeamDefinition[] = [
  ["mexico", "Mexico", "A"], ["south-africa", "South Africa", "A"], ["korea-republic", "Korea Republic", "A"], ["czechia", "Czechia", "A"],
  ["canada", "Canada", "B"], ["bosnia-herzegovina", "Bosnia and Herzegovina", "B"], ["qatar", "Qatar", "B"], ["switzerland", "Switzerland", "B"],
  ["haiti", "Haiti", "C"], ["scotland", "Scotland", "C"], ["brazil", "Brazil", "C"], ["morocco", "Morocco", "C"],
  ["usa", "USA", "D"], ["paraguay", "Paraguay", "D"], ["australia", "Australia", "D"], ["turkiye", "Türkiye", "D"],
  ["cote-divoire", "Côte d'Ivoire", "E"], ["ecuador", "Ecuador", "E"], ["germany", "Germany", "E"], ["curacao", "Curaçao", "E"],
  ["netherlands", "Netherlands", "F"], ["japan", "Japan", "F"], ["sweden", "Sweden", "F"], ["tunisia", "Tunisia", "F"],
  ["iran", "IR Iran", "G"], ["new-zealand", "New Zealand", "G"], ["belgium", "Belgium", "G"], ["egypt", "Egypt", "G"],
  ["saudi-arabia", "Saudi Arabia", "H"], ["uruguay", "Uruguay", "H"], ["spain", "Spain", "H"], ["cabo-verde", "Cabo Verde", "H"],
  ["france", "France", "I"], ["senegal", "Senegal", "I"], ["iraq", "Iraq", "I"], ["norway", "Norway", "I"],
  ["argentina", "Argentina", "J"], ["algeria", "Algeria", "J"], ["austria", "Austria", "J"], ["jordan", "Jordan", "J"],
  ["portugal", "Portugal", "K"], ["congo-dr", "Congo DR", "K"], ["uzbekistan", "Uzbekistan", "K"], ["colombia", "Colombia", "K"],
  ["ghana", "Ghana", "L"], ["panama", "Panama", "L"], ["england", "England", "L"], ["croatia", "Croatia", "L"],
].map(([slug, name, group]) => ({ slug, name, group }));

export const FALLBACK_MANAGERS: Record<string, string> = {
  mexico: "Javier Aguirre",
  "south-africa": "Hugo Broos",
  "korea-republic": "Hong Myung-bo",
  czechia: "Miroslav Koubek",
  canada: "Jesse Marsch",
  "bosnia-herzegovina": "Sergej Barbarez",
  qatar: "Julen Lopetegui",
  switzerland: "Murat Yakin",
  haiti: "Sébastien Migné",
  scotland: "Steve Clarke",
  brazil: "Carlo Ancelotti",
  morocco: "Mohamed Ouahbi",
  usa: "Mauricio Pochettino",
  paraguay: "Gustavo Alfaro",
  australia: "Tony Popovic",
  turkiye: "Vincenzo Montella",
  "cote-divoire": "Emerse Faé",
  ecuador: "Sebastián Beccacece",
  germany: "Julian Nagelsmann",
  curacao: "Dick Advocaat",
  netherlands: "Ronald Koeman",
  japan: "Hajime Moriyasu",
  sweden: "Graham Potter",
  tunisia: "Hervé Renard",
  iran: "Amir Ghalenoei",
  "new-zealand": "Darren Bazeley",
  belgium: "Rudi Garcia",
  egypt: "Hossam Hassan",
  "saudi-arabia": "Georgios Donis",
  uruguay: "Marcelo Bielsa",
  spain: "Luis de la Fuente",
  "cabo-verde": "Bubista",
  france: "Didier Deschamps",
  senegal: "Pape Thiaw",
  iraq: "Graham Arnold",
  norway: "Ståle Solbakken",
  argentina: "Lionel Scaloni",
  algeria: "Vladimir Petković",
  austria: "Ralf Rangnick",
  jordan: "Jamal Sellami",
  portugal: "Roberto Martínez",
  "congo-dr": "Sébastien Desabre",
  uzbekistan: "Fabio Cannavaro",
  colombia: "Néstor Lorenzo",
  ghana: "Carlos Queiroz",
  panama: "Thomas Christiansen",
  england: "Thomas Tuchel",
  croatia: "Zlatko Dalić",
};

export const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const aliasPairs: Array<[string, string]> = [
  ["South Korea", "korea-republic"],
  ["Korea Republic", "korea-republic"],
  ["Republic of Korea", "korea-republic"],
  ["Czech Republic", "czechia"],
  ["United States", "usa"],
  ["United States of America", "usa"],
  ["USMNT", "usa"],
  ["Turkey", "turkiye"],
  ["Türkiye", "turkiye"],
  ["Ivory Coast", "cote-divoire"],
  ["Côte d’Ivoire", "cote-divoire"],
  ["Cote d'Ivoire", "cote-divoire"],
  ["Iran", "iran"],
  ["Cape Verde", "cabo-verde"],
  ["Cabo Verde", "cabo-verde"],
  ["DR Congo", "congo-dr"],
  ["Congo DR", "congo-dr"],
  ["Democratic Republic of Congo", "congo-dr"],
  ["Bosnia & Herzegovina", "bosnia-herzegovina"],
  ["Bosnia-Herzegovina", "bosnia-herzegovina"],
  ["Curacao", "curacao"],
];

const teamAliases = new Map<string, TeamDefinition>();
for (const team of TEAMS) {
  teamAliases.set(normalize(team.name), team);
  teamAliases.set(normalize(team.slug), team);
}
for (const [alias, slug] of aliasPairs) {
  const team = TEAMS.find((item) => item.slug === slug);
  if (team) teamAliases.set(normalize(alias), team);
}

export const resolveTeam = (value: unknown) => teamAliases.get(normalize(value));

export const cleanText = (value: string) =>
  value
    .replace(/\[[^\]]*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\((?:c|vc)\)/gi, "")
    .trim();

export const mapPosition = (value: string): "GK" | "DEF" | "MID" | "FWD" | null => {
  const normalized = cleanText(value).toUpperCase().replace(/[^A-Z]/g, "");
  if (normalized.includes("GOALKEEPER") || normalized.endsWith("GK")) return "GK";
  if (normalized.includes("DEFENDER") || normalized.endsWith("DF") || normalized.endsWith("DEF")) return "DEF";
  if (normalized.includes("MIDFIELDER") || normalized.endsWith("MF") || normalized.endsWith("MID")) return "MID";
  if (normalized.includes("FORWARD") || normalized.endsWith("FW") || normalized.endsWith("FWD") || normalized.endsWith("ST")) return "FWD";
  return null;
};

export const playerKey = (teamSlug: string, playerName: string) =>
  `${teamSlug}:${normalize(playerName)}`;
