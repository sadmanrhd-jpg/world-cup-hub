import { getManager } from "@/data/managers";
import { TEAMS } from "@/data/wc26";
import type {
  PlayerPosition,
  PlayerTournamentStats,
  WorldCupManager,
  WorldCupPlayer,
} from "@/types/fanProfile";

const CACHE_KEY = "fan26.world-cup-player-data-v3";
const CACHE_TTL = 6 * 60 * 60 * 1000;

const emptyStats = (): PlayerTournamentStats => ({
  appearances: 0,
  starts: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  tackles: 0,
  interceptions: 0,
  saves: 0,
  cleanSheets: 0,
  source: "manual",
  updatedAt: null,
});

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const clean = (value: string) =>
  value
    .replace(/\[[^\]]*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\((?:c|vc)\)/gi, "")
    .trim();

const mapPosition = (value: string): PlayerPosition | null => {
  const position = clean(value).toUpperCase().replace(/[^A-Z]/g, "");

  if (position.includes("GOALKEEPER") || position.endsWith("GK")) return "GK";
  if (
    position.includes("DEFENDER") ||
    position.endsWith("DF") ||
    position.endsWith("DEF")
  ) {
    return "DEF";
  }
  if (
    position.includes("MIDFIELDER") ||
    position.endsWith("MF") ||
    position.endsWith("MID")
  ) {
    return "MID";
  }
  if (
    position.includes("FORWARD") ||
    position.endsWith("FW") ||
    position.endsWith("FWD") ||
    position.endsWith("ST")
  ) {
    return "FWD";
  }

  return null;
};

const aliasToSlug: Record<string, string> = {
  southkorea: "korea-republic",
  republicofkorea: "korea-republic",
  czechrepublic: "czechia",
  unitedstates: "usa",
  unitedstatesofamerica: "usa",
  turkey: "turkiye",
  ivorycoast: "cote-divoire",
  cotedivoire: "cote-divoire",
  iran: "iran",
  capeverde: "cabo-verde",
  drcongo: "congo-dr",
  democraticrepublicofcongo: "congo-dr",
  bosniaherzegovina: "bosnia-herzegovina",
  curacao: "curacao",
};

const teamByHeading = (value: string) => {
  const key = normalize(value);
  const slug = aliasToSlug[key];

  return TEAMS.find(
    (team) =>
      team.slug === slug ||
      normalize(team.name) === key ||
      normalize(team.slug) === key,
  );
};

const playerId = (teamSlug: string, name: string) =>
  `${teamSlug}:${normalize(name)}`;

const mapStats = (
  value: Partial<PlayerTournamentStats> | undefined,
): PlayerTournamentStats => ({
  ...emptyStats(),
  ...value,
  source: value?.source ?? "manual",
  updatedAt: value?.updatedAt ?? null,
});

type SquadPayload = {
  players?: Array<Omit<WorldCupPlayer, "stats">>;
  managers?: WorldCupManager[];
};

type StatsPayload = {
  playerStatsCount?: number;
  stats?: Record<string, Partial<PlayerTournamentStats>>;
};

type CachedData = {
  storedAt: number;
  statsLoaded: boolean;
  players: WorldCupPlayer[];
  managers: WorldCupManager[];
};

const readCache = (): CachedData | null => {
  if (typeof window === "undefined") return null;

  try {
    const value = JSON.parse(
      localStorage.getItem(CACHE_KEY) ?? "null",
    ) as CachedData | null;

    if (!value?.players?.length || !value?.managers?.length) return null;
    return value;
  } catch {
    return null;
  }
};

const writeCache = (
  players: WorldCupPlayer[],
  managers: WorldCupManager[],
  statsLoaded: boolean,
) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        storedAt: Date.now(),
        statsLoaded,
        players,
        managers,
      } satisfies CachedData),
    );
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(body?.error || `${url} returned ${response.status}`);
  }

  return (await response.json()) as T;
};

const parseWikipediaInBrowser = async (): Promise<SquadPayload> => {
  const endpoint = new URL("https://en.wikipedia.org/w/api.php");
  endpoint.searchParams.set("origin", "*");
  endpoint.searchParams.set("action", "parse");
  endpoint.searchParams.set("page", "2026_FIFA_World_Cup_squads");
  endpoint.searchParams.set("prop", "text");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("formatversion", "2");

  const payload = await fetchJson<{ parse?: { text?: string } }>(
    endpoint.toString(),
  );

  if (!payload.parse?.text) {
    throw new Error("Wikipedia returned no squad page HTML.");
  }

  const documentNode = new DOMParser().parseFromString(
    payload.parse.text,
    "text/html",
  );
  const players = new Map<string, Omit<WorldCupPlayer, "stats">>();
  const managerNames = new Map<string, string>();

  for (const heading of Array.from(documentNode.querySelectorAll("h3"))) {
    const team = teamByHeading(clean(heading.textContent ?? ""));
    if (!team) continue;

    const section = documentNode.createElement("section");
    const headingContainer = heading.parentElement?.classList.contains(
      "mw-heading",
    )
      ? heading.parentElement
      : heading;

    let cursor = headingContainer.nextElementSibling;

    while (cursor) {
      if (
        cursor.matches("h2, h3") ||
        cursor.querySelector(":scope > h2, :scope > h3")
      ) {
        break;
      }

      section.appendChild(cursor.cloneNode(true));
      cursor = cursor.nextElementSibling;
    }

    const coachParagraph = Array.from(section.querySelectorAll("p")).find(
      (paragraph) =>
        /^(?:Head coach|Coach)\s*:/i.test(
          clean(paragraph.textContent ?? ""),
        ),
    );
    const coachLinks = coachParagraph
      ? Array.from(coachParagraph.querySelectorAll("a"))
      : [];
    const linkedCoach = clean(
      coachLinks[coachLinks.length - 1]?.textContent ?? "",
    );
    const textCoach = clean(coachParagraph?.textContent ?? "").replace(
      /^(?:Head coach|Coach)\s*:\s*/i,
      "",
    );

    managerNames.set(
      team.slug,
      linkedCoach || textCoach || getManager(team.name),
    );

    const table = section.querySelector("table.wikitable");
    if (!table) continue;

    for (const row of Array.from(table.querySelectorAll("tr"))) {
      const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
        clean(cell.textContent ?? ""),
      );
      const positionIndex = cells.findIndex((cell) => mapPosition(cell));

      if (positionIndex < 0) continue;

      const position = mapPosition(cells[positionIndex]);
      const name = clean(cells[positionIndex + 1] ?? "");

      if (!position || !name || /player/i.test(name)) continue;

      const id = playerId(team.slug, name);
      const shirtNumber = Number.parseInt(cells[0] ?? "", 10);
      const club = clean(cells[cells.length - 1] ?? "");

      players.set(id, {
        id,
        sourceKey: id,
        name,
        teamSlug: team.slug,
        teamName: team.name,
        position,
        detailedPosition: clean(cells[positionIndex]) || null,
        shirtNumber: Number.isFinite(shirtNumber) ? shirtNumber : null,
        club: club && club !== name ? club : null,
        imageUrl: null,
        active: true,
      });
    }
  }

  return {
    players: Array.from(players.values()),
    managers: TEAMS.map((team) => ({
      id: `manager:${team.slug}`,
      name: managerNames.get(team.slug) || getManager(team.name),
      teamSlug: team.slug,
      teamName: team.name,
      nationality: null,
    })),
  };
};

let dataPromise: Promise<CachedData> | null = null;

const loadData = async (): Promise<CachedData> => {
  const cached = readCache();
  const cacheFresh =
    cached && Date.now() - cached.storedAt < CACHE_TTL;

  if (cacheFresh && cached.statsLoaded) {
    return cached;
  }

  try {
    let squads: SquadPayload;

    try {
      squads = await fetchJson<SquadPayload>("/api/world-cup-squads");
    } catch {
      squads = await parseWikipediaInBrowser();
    }

    if (!squads.players?.length || !squads.managers?.length) {
      throw new Error("The squad source returned no usable player data.");
    }

    const statPayload = await fetchJson<StatsPayload>(
      "/api/world-cup-stats?v=5",
    ).catch((): StatsPayload => ({ stats: {}, playerStatsCount: 0 }));

    const statMap = statPayload.stats ?? {};
    const statsLoaded =
      (statPayload.playerStatsCount ?? Object.keys(statMap).length) > 0;

    const players = squads.players.map((player) => ({
      ...player,
      stats: mapStats(statMap[player.sourceKey]),
    }));

    const value: CachedData = {
      storedAt: Date.now(),
      statsLoaded,
      players,
      managers: squads.managers,
    };

    writeCache(value.players, value.managers, value.statsLoaded);
    return value;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
};

const getData = () => {
  if (!dataPromise) {
    dataPromise = loadData().finally(() => {
      window.setTimeout(() => {
        dataPromise = null;
      }, 1000);
    });
  }

  return dataPromise;
};

export const fetchWorldCupPlayers = async (): Promise<WorldCupPlayer[]> =>
  (await getData()).players;

export const fetchWorldCupManagers = async (): Promise<WorldCupManager[]> =>
  (await getData()).managers;
