// Lightweight extra info for the home spotlight. Not exhaustive.
export type TeamInfo = {
  titles: number; // World Cup titles won
  bestFinish: string;
  appearances: number; // WC appearances incl. 2026
  highlightPlayer: { name: string; role: string };
  blurb: string;
};

export const TEAM_INFO: Record<string, TeamInfo> = {
  Brazil:        { titles: 5, bestFinish: "Champions (1958, 62, 70, 94, 2002)", appearances: 23, highlightPlayer: { name: "Vinícius Júnior", role: "Forward" }, blurb: "The most successful nation in World Cup history, returning to chase a sixth star." },
  Germany:       { titles: 4, bestFinish: "Champions (1954, 74, 90, 2014)", appearances: 21, highlightPlayer: { name: "Florian Wirtz", role: "Midfielder" }, blurb: "Four-time champions rebuilding around a new generation." },
  Argentina:     { titles: 3, bestFinish: "Champions (1978, 86, 2022)", appearances: 19, highlightPlayer: { name: "Lionel Messi", role: "Forward & Captain" }, blurb: "Reigning world champions defending the crown." },
  France:        { titles: 2, bestFinish: "Champions (1998, 2018)", appearances: 17, highlightPlayer: { name: "Kylian Mbappé", role: "Forward & Captain" }, blurb: "Always among the favourites, packed with elite attacking talent." },
  Uruguay:       { titles: 2, bestFinish: "Champions (1930, 1950)", appearances: 15, highlightPlayer: { name: "Federico Valverde", role: "Midfielder" }, blurb: "First-ever world champions, now driven by a fearless new core." },
  England:       { titles: 1, bestFinish: "Champions (1966)", appearances: 17, highlightPlayer: { name: "Jude Bellingham", role: "Midfielder" }, blurb: "Built around a generational midfielder and clinical attackers." },
  Spain:         { titles: 1, bestFinish: "Champions (2010)", appearances: 17, highlightPlayer: { name: "Lamine Yamal", role: "Forward" }, blurb: "European champions blending tiki-taka heritage with teenage flair." },
  Italy:         { titles: 4, bestFinish: "Champions (1934, 38, 82, 2006)", appearances: 18, highlightPlayer: { name: "—", role: "Squad TBA" }, blurb: "Four-time champions seeking their return to the world stage." },
  Netherlands:   { titles: 0, bestFinish: "Runners-up (1974, 78, 2010)", appearances: 12, highlightPlayer: { name: "Cody Gakpo", role: "Forward" }, blurb: "Total Football pioneers — three finals, still chasing the trophy." },
  Portugal:      { titles: 0, bestFinish: "4th place (1966, 2006)", appearances: 9, highlightPlayer: { name: "Cristiano Ronaldo", role: "Forward & Captain" }, blurb: "A golden generation built around a record-breaking captain." },
  Belgium:       { titles: 0, bestFinish: "3rd place (2018)", appearances: 14, highlightPlayer: { name: "Kevin De Bruyne", role: "Midfielder" }, blurb: "The Red Devils return with a transitioning golden generation." },
  Croatia:       { titles: 0, bestFinish: "Runners-up (2018), 3rd (2022)", appearances: 7, highlightPlayer: { name: "Luka Modrić", role: "Midfielder & Captain" }, blurb: "Small nation, giant footprint — Modrić leads one final dance." },
  Mexico:        { titles: 0, bestFinish: "Quarter-finals (1970, 86)", appearances: 18, highlightPlayer: { name: "Edson Álvarez", role: "Midfielder" }, blurb: "Co-host nation aiming to break past the Round of 16 at home." },
  USA:           { titles: 0, bestFinish: "3rd place (1930)", appearances: 12, highlightPlayer: { name: "Christian Pulisic", role: "Forward & Captain" }, blurb: "Co-hosts with the deepest player pool in their history." },
  Canada:        { titles: 0, bestFinish: "Group stage", appearances: 3, highlightPlayer: { name: "Alphonso Davies", role: "Defender" }, blurb: "Co-hosts back on the biggest stage with their best-ever squad." },
  Japan:         { titles: 0, bestFinish: "Round of 16 (×4)", appearances: 8, highlightPlayer: { name: "Takefusa Kubo", role: "Forward" }, blurb: "Asia's benchmark side, dreaming of a quarter-final breakthrough." },
  "Korea Republic": { titles: 0, bestFinish: "4th place (2002)", appearances: 12, highlightPlayer: { name: "Son Heung-min", role: "Forward & Captain" }, blurb: "Captain Son leads the Taegeuk Warriors one more time." },
  Morocco:       { titles: 0, bestFinish: "4th place (2022)", appearances: 7, highlightPlayer: { name: "Achraf Hakimi", role: "Defender" }, blurb: "First African team to ever reach a World Cup semi-final." },
  Senegal:       { titles: 0, bestFinish: "Quarter-finals (2002)", appearances: 4, highlightPlayer: { name: "Sadio Mané", role: "Forward" }, blurb: "The Lions of Teranga, African powerhouse on the rise." },
  Australia:     { titles: 0, bestFinish: "Round of 16 (2006, 2022)", appearances: 7, highlightPlayer: { name: "Mathew Ryan", role: "Goalkeeper & Captain" }, blurb: "The Socceroos return for a sixth consecutive World Cup." },
  Switzerland:   { titles: 0, bestFinish: "Quarter-finals (1934, 38, 54)", appearances: 13, highlightPlayer: { name: "Granit Xhaka", role: "Midfielder & Captain" }, blurb: "Reliably reach knockouts — chasing a deeper run this time." },
  Colombia:      { titles: 0, bestFinish: "Quarter-finals (2014)", appearances: 7, highlightPlayer: { name: "James Rodríguez", role: "Midfielder & Captain" }, blurb: "Returning after missing 2022 with a settled and exciting squad." },
  Norway:        { titles: 0, bestFinish: "Round of 16 (1998)", appearances: 4, highlightPlayer: { name: "Erling Haaland", role: "Forward & Captain" }, blurb: "Back at the World Cup after 28 years with a generational striker." },
  Egypt:         { titles: 0, bestFinish: "Group stage", appearances: 4, highlightPlayer: { name: "Mohamed Salah", role: "Forward & Captain" }, blurb: "The Pharaohs return led by one of the world's best forwards." },
  Algeria:       { titles: 0, bestFinish: "Round of 16 (2014)", appearances: 5, highlightPlayer: { name: "Riyad Mahrez", role: "Forward & Captain" }, blurb: "The Desert Foxes return after missing the last two cycles." },
  Austria:       { titles: 0, bestFinish: "3rd place (1954)", appearances: 8, highlightPlayer: { name: "David Alaba", role: "Defender" }, blurb: "Back at the World Cup after a long absence, well-organised and dangerous." },
  Ecuador:       { titles: 0, bestFinish: "Round of 16 (2006)", appearances: 5, highlightPlayer: { name: "Moisés Caicedo", role: "Midfielder" }, blurb: "Young, athletic and with a midfield engine of the highest level." },
  Paraguay:      { titles: 0, bestFinish: "Quarter-finals (2010)", appearances: 9, highlightPlayer: { name: "Miguel Almirón", role: "Forward" }, blurb: "Back after missing three straight tournaments." },
  Iran:          { titles: 0, bestFinish: "Group stage", appearances: 7, highlightPlayer: { name: "Mehdi Taremi", role: "Forward" }, blurb: "Asia's most consistent qualifier in the modern era." },
  "IR Iran":     { titles: 0, bestFinish: "Group stage", appearances: 7, highlightPlayer: { name: "Mehdi Taremi", role: "Forward" }, blurb: "Asia's most consistent qualifier in the modern era." },
  Tunisia:       { titles: 0, bestFinish: "Group stage", appearances: 7, highlightPlayer: { name: "Hannibal Mejbri", role: "Midfielder" }, blurb: "The Eagles of Carthage, ever-present North African challenger." },
  "Saudi Arabia":{ titles: 0, bestFinish: "Round of 16 (1994)", appearances: 7, highlightPlayer: { name: "Salem Al-Dawsari", role: "Forward" }, blurb: "Famous Argentina-slayers in 2022, now hosting in 2034." },
  Ghana:         { titles: 0, bestFinish: "Quarter-finals (2010)", appearances: 5, highlightPlayer: { name: "Mohammed Kudus", role: "Midfielder" }, blurb: "The Black Stars are back with a new wave of European-based talent." },
  Panama:        { titles: 0, bestFinish: "Group stage", appearances: 2, highlightPlayer: { name: "Adalberto Carrasquilla", role: "Midfielder" }, blurb: "CONCACAF challenger eyeing a first knockout appearance." },
  "Côte d'Ivoire": { titles: 0, bestFinish: "Group stage", appearances: 4, highlightPlayer: { name: "Sébastien Haller", role: "Forward" }, blurb: "Reigning African champions return to football's biggest stage." },
  Scotland:      { titles: 0, bestFinish: "Group stage", appearances: 9, highlightPlayer: { name: "Scott McTominay", role: "Midfielder" }, blurb: "Tartan Army back at the World Cup after nearly three decades." },
  Czechia:       { titles: 0, bestFinish: "Runners-up (1934, 1962 as Czechoslovakia)", appearances: 10, highlightPlayer: { name: "Patrik Schick", role: "Forward" }, blurb: "Czech footballing tradition returns to the World Cup." },
  Sweden:        { titles: 0, bestFinish: "Runners-up (1958)", appearances: 13, highlightPlayer: { name: "Alexander Isak", role: "Forward" }, blurb: "Scandinavian power back with one of Europe's elite strikers." },
  "Bosnia and Herzegovina": { titles: 0, bestFinish: "Group stage (2014)", appearances: 2, highlightPlayer: { name: "Edin Džeko", role: "Forward & Captain" }, blurb: "Returning for only the second time in their history." },
  Qatar:         { titles: 0, bestFinish: "Group stage", appearances: 2, highlightPlayer: { name: "Akram Afif", role: "Forward" }, blurb: "Reigning Asian champions, back after hosting in 2022." },
  Haiti:         { titles: 0, bestFinish: "Group stage (1974)", appearances: 2, highlightPlayer: { name: "Duckens Nazon", role: "Forward" }, blurb: "Back at the World Cup for the first time in 52 years." },
  "South Africa":{ titles: 0, bestFinish: "Group stage", appearances: 4, highlightPlayer: { name: "Lyle Foster", role: "Forward" }, blurb: "Bafana Bafana return after a 16-year absence." },
  "Cabo Verde":  { titles: 0, bestFinish: "Debut", appearances: 1, highlightPlayer: { name: "Ryan Mendes", role: "Forward & Captain" }, blurb: "The Blue Sharks make a historic World Cup debut." },
  Curaçao:       { titles: 0, bestFinish: "Debut", appearances: 1, highlightPlayer: { name: "Tahith Chong", role: "Midfielder" }, blurb: "Tiny island nation makes a fairy-tale World Cup debut." },
  Jordan:        { titles: 0, bestFinish: "Debut", appearances: 1, highlightPlayer: { name: "Musa Al-Taamari", role: "Forward" }, blurb: "Al-Nashama make their long-awaited World Cup debut." },
  Uzbekistan:    { titles: 0, bestFinish: "Debut", appearances: 1, highlightPlayer: { name: "Eldor Shomurodov", role: "Forward" }, blurb: "The White Wolves make a historic first-ever appearance." },
  "Congo DR":    { titles: 0, bestFinish: "Quarter-finals (1974 as Zaire)", appearances: 2, highlightPlayer: { name: "Cédric Bakambu", role: "Forward" }, blurb: "Back on the World Cup stage after a 52-year wait." },
  Iraq:          { titles: 0, bestFinish: "Group stage (1986)", appearances: 2, highlightPlayer: { name: "Aymen Hussein", role: "Forward" }, blurb: "Lions of Mesopotamia return for only their second World Cup." },
  "New Zealand": { titles: 0, bestFinish: "Group stage (undefeated 2010)", appearances: 3, highlightPlayer: { name: "Chris Wood", role: "Forward & Captain" }, blurb: "The All Whites are back, undefeated last time they appeared." },
  "Türkiye":     { titles: 0, bestFinish: "3rd place (2002)", appearances: 3, highlightPlayer: { name: "Arda Güler", role: "Midfielder" }, blurb: "Returning after a long wait with one of Europe's brightest talents." },
};

export const fallbackInfo = (name: string): TeamInfo => ({
  titles: 0,
  bestFinish: "—",
  appearances: 1,
  highlightPlayer: { name: "TBA", role: "Squad to be announced" },
  blurb: `${name} take their place among the 48 nations at FIFA World Cup 2026.`,
});

export const getTeamInfo = (name: string): TeamInfo => TEAM_INFO[name] ?? fallbackInfo(name);
