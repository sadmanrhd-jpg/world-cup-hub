export type TeamPalette = {
  primary: string;
  secondary: string;
  shorts: string;
  socks: string;
};

const TEAM_PALETTES: Record<string, TeamPalette> = {
  Mexico: { primary: "#0b7a3b", secondary: "#ffffff", shorts: "#f4f4f4", socks: "#b6202e" },
  "South Africa": { primary: "#f2c500", secondary: "#0a7c3b", shorts: "#0a7c3b", socks: "#f2c500" },
  "South Korea": { primary: "#e61f3c", secondary: "#111827", shorts: "#111827", socks: "#e61f3c" },
  Czechia: { primary: "#d91f36", secondary: "#ffffff", shorts: "#1e3a8a", socks: "#d91f36" },
  Canada: { primary: "#d71920", secondary: "#ffffff", shorts: "#d71920", socks: "#ffffff" },
  "Bosnia and Herzegovina": { primary: "#1f4fa3", secondary: "#f4c900", shorts: "#1f4fa3", socks: "#f4c900" },
  Qatar: { primary: "#7b1237", secondary: "#ffffff", shorts: "#7b1237", socks: "#ffffff" },
  Switzerland: { primary: "#d71920", secondary: "#ffffff", shorts: "#d71920", socks: "#ffffff" },
  Brazil: { primary: "#f5d328", secondary: "#177245", shorts: "#2455a6", socks: "#ffffff" },
  Morocco: { primary: "#d71920", secondary: "#177245", shorts: "#d71920", socks: "#177245" },
  Haiti: { primary: "#1d4ed8", secondary: "#d71920", shorts: "#1d4ed8", socks: "#d71920" },
  Scotland: { primary: "#122c69", secondary: "#ffffff", shorts: "#122c69", socks: "#ffffff" },
  "United States": { primary: "#ffffff", secondary: "#c8102e", shorts: "#1f3f77", socks: "#ffffff" },
  Paraguay: { primary: "#d71920", secondary: "#ffffff", shorts: "#2455a6", socks: "#ffffff" },
  Australia: { primary: "#f2c500", secondary: "#0b6b3a", shorts: "#0b6b3a", socks: "#f2c500" },
  Turkey: { primary: "#d71920", secondary: "#ffffff", shorts: "#d71920", socks: "#ffffff" },
  Germany: { primary: "#ffffff", secondary: "#111111", shorts: "#111111", socks: "#ffffff" },
  Curacao: { primary: "#1555a2", secondary: "#f2c500", shorts: "#1555a2", socks: "#f2c500" },
  "Ivory Coast": { primary: "#f36f21", secondary: "#ffffff", shorts: "#ffffff", socks: "#0b7a3b" },
  Ecuador: { primary: "#f2c500", secondary: "#1555a2", shorts: "#1555a2", socks: "#d71920" },
  Netherlands: { primary: "#f36f21", secondary: "#111111", shorts: "#f36f21", socks: "#111111" },
  Japan: { primary: "#1b3f8b", secondary: "#ffffff", shorts: "#1b3f8b", socks: "#ffffff" },
  Sweden: { primary: "#f2c500", secondary: "#1555a2", shorts: "#1555a2", socks: "#f2c500" },
  Tunisia: { primary: "#ffffff", secondary: "#d71920", shorts: "#ffffff", socks: "#d71920" },
  Belgium: { primary: "#d71920", secondary: "#111111", shorts: "#111111", socks: "#d71920" },
  Egypt: { primary: "#d71920", secondary: "#ffffff", shorts: "#111111", socks: "#d71920" },
  Iran: { primary: "#ffffff", secondary: "#0b7a3b", shorts: "#ffffff", socks: "#d71920" },
  "New Zealand": { primary: "#111111", secondary: "#ffffff", shorts: "#111111", socks: "#ffffff" },
  Spain: { primary: "#d71920", secondary: "#f2c500", shorts: "#1f3f77", socks: "#d71920" },
  "Cape Verde": { primary: "#1555a2", secondary: "#ffffff", shorts: "#1555a2", socks: "#ffffff" },
  "Saudi Arabia": { primary: "#ffffff", secondary: "#0b7a3b", shorts: "#ffffff", socks: "#0b7a3b" },
  Uruguay: { primary: "#72c7ec", secondary: "#111111", shorts: "#111111", socks: "#72c7ec" },
  France: { primary: "#173f82", secondary: "#ffffff", shorts: "#173f82", socks: "#d71920" },
  Senegal: { primary: "#ffffff", secondary: "#0b7a3b", shorts: "#ffffff", socks: "#f2c500" },
  Iraq: { primary: "#0b7a3b", secondary: "#ffffff", shorts: "#0b7a3b", socks: "#d71920" },
  Norway: { primary: "#d71920", secondary: "#ffffff", shorts: "#173f82", socks: "#d71920" },
  Argentina: { primary: "#75bfe9", secondary: "#ffffff", shorts: "#111111", socks: "#ffffff" },
  Algeria: { primary: "#ffffff", secondary: "#0b7a3b", shorts: "#ffffff", socks: "#0b7a3b" },
  Austria: { primary: "#d71920", secondary: "#ffffff", shorts: "#d71920", socks: "#ffffff" },
  Jordan: { primary: "#ffffff", secondary: "#d71920", shorts: "#ffffff", socks: "#111111" },
  Portugal: { primary: "#c8102e", secondary: "#0b7a3b", shorts: "#0b7a3b", socks: "#c8102e" },
  "DR Congo": { primary: "#3bb7df", secondary: "#d71920", shorts: "#3bb7df", socks: "#f2c500" },
  Uzbekistan: { primary: "#ffffff", secondary: "#1555a2", shorts: "#ffffff", socks: "#0b7a3b" },
  Colombia: { primary: "#f2c500", secondary: "#1555a2", shorts: "#1555a2", socks: "#d71920" },
  England: { primary: "#ffffff", secondary: "#173f82", shorts: "#173f82", socks: "#ffffff" },
  Croatia: { primary: "#ffffff", secondary: "#d71920", shorts: "#173f82", socks: "#173f82" },
  Ghana: { primary: "#ffffff", secondary: "#111111", shorts: "#ffffff", socks: "#d71920" },
  Panama: { primary: "#d71920", secondary: "#ffffff", shorts: "#d71920", socks: "#ffffff" },
};

const hashHue = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
};

export const getTeamPalette = (teamName: string): TeamPalette => {
  const known = TEAM_PALETTES[teamName];
  if (known) return known;

  const hue = hashHue(teamName);
  return {
    primary: `hsl(${hue} 68% 44%)`,
    secondary: "#ffffff",
    shorts: `hsl(${hue} 58% 24%)`,
    socks: "#ffffff",
  };
};
