export type Stadium = {
  id: string;
  name: string; // World Cup tournament name
  realName: string;
  city: string;
  country: "USA" | "Mexico" | "Canada";
  capacity: number;
  surface: string;
  opened: number;
  wikiTitle: string; // for Wikipedia REST API
};

export const STADIUMS: Stadium[] = [
  // USA
  { id: "atlanta", name: "Atlanta Stadium", realName: "Mercedes-Benz Stadium", city: "Atlanta, GA", country: "USA", capacity: 71000, surface: "Hybrid grass", opened: 2017, wikiTitle: "Mercedes-Benz_Stadium" },
  { id: "boston", name: "Boston Stadium", realName: "Gillette Stadium", city: "Foxborough, MA", country: "USA", capacity: 65878, surface: "Natural grass", opened: 2002, wikiTitle: "Gillette_Stadium" },
  { id: "dallas", name: "Dallas Stadium", realName: "AT&T Stadium", city: "Arlington, TX", country: "USA", capacity: 80000, surface: "Natural grass", opened: 2009, wikiTitle: "AT%26T_Stadium" },
  { id: "houston", name: "Houston Stadium", realName: "NRG Stadium", city: "Houston, TX", country: "USA", capacity: 72220, surface: "Natural grass", opened: 2002, wikiTitle: "NRG_Stadium" },
  { id: "kansas-city", name: "Kansas City Stadium", realName: "Arrowhead Stadium", city: "Kansas City, MO", country: "USA", capacity: 76416, surface: "Natural grass", opened: 1972, wikiTitle: "Arrowhead_Stadium" },
  { id: "los-angeles", name: "Los Angeles Stadium", realName: "SoFi Stadium", city: "Inglewood, CA", country: "USA", capacity: 70240, surface: "Natural grass", opened: 2020, wikiTitle: "SoFi_Stadium" },
  { id: "miami", name: "Miami Stadium", realName: "Hard Rock Stadium", city: "Miami Gardens, FL", country: "USA", capacity: 65326, surface: "Natural grass", opened: 1987, wikiTitle: "Hard_Rock_Stadium" },
  { id: "new-york-new-jersey", name: "New York New Jersey Stadium", realName: "MetLife Stadium", city: "East Rutherford, NJ", country: "USA", capacity: 82500, surface: "Natural grass", opened: 2010, wikiTitle: "MetLife_Stadium" },
  { id: "philadelphia", name: "Philadelphia Stadium", realName: "Lincoln Financial Field", city: "Philadelphia, PA", country: "USA", capacity: 69796, surface: "Natural grass", opened: 2003, wikiTitle: "Lincoln_Financial_Field" },
  { id: "san-francisco", name: "San Francisco Bay Area Stadium", realName: "Levi's Stadium", city: "Santa Clara, CA", country: "USA", capacity: 68500, surface: "Natural grass", opened: 2014, wikiTitle: "Levi%27s_Stadium" },
  { id: "seattle", name: "Seattle Stadium", realName: "Lumen Field", city: "Seattle, WA", country: "USA", capacity: 68740, surface: "Hybrid grass", opened: 2002, wikiTitle: "Lumen_Field" },
  // Canada
  { id: "toronto", name: "Toronto Stadium", realName: "BMO Field", city: "Toronto, ON", country: "Canada", capacity: 45000, surface: "Natural grass", opened: 2007, wikiTitle: "BMO_Field" },
  { id: "vancouver", name: "BC Place Vancouver", realName: "BC Place", city: "Vancouver, BC", country: "Canada", capacity: 54500, surface: "Hybrid grass", opened: 1983, wikiTitle: "BC_Place" },
  // Mexico
  { id: "mexico-city", name: "Mexico City Stadium", realName: "Estadio Azteca (Banorte)", city: "Mexico City", country: "Mexico", capacity: 87000, surface: "Natural grass", opened: 1966, wikiTitle: "Estadio_Azteca" },
  { id: "guadalajara", name: "Estadio Guadalajara", realName: "Estadio Akron", city: "Zapopan, Jalisco", country: "Mexico", capacity: 49850, surface: "Natural grass", opened: 2010, wikiTitle: "Estadio_Akron" },
  { id: "monterrey", name: "Estadio Monterrey", realName: "Estadio BBVA", city: "Guadalupe, NL", country: "Mexico", capacity: 53500, surface: "Natural grass", opened: 2015, wikiTitle: "Estadio_BBVA" },
];

export const getStadiumByMatchName = (name: string) =>
  STADIUMS.find((s) => s.name === name);
