import * as cheerio from "cheerio";
import {
  cleanText,
  FALLBACK_MANAGERS,
  mapPosition,
  playerKey,
  resolveTeam,
  TEAMS,
} from "./_lib/world-cup-data";

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type PlayerRow = {
  id: string;
  sourceKey: string;
  name: string;
  teamSlug: string;
  teamName: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  detailedPosition: string | null;
  shirtNumber: number | null;
  club: string | null;
  imageUrl: null;
  active: true;
};

type ManagerRow = {
  id: string;
  name: string;
  teamSlug: string;
  teamName: string;
  nationality: null;
};

const WIKIPEDIA_API =
  "https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=text&format=json&formatversion=2";

const fetchWikipediaHtml = async () => {
  const response = await fetch(WIKIPEDIA_API, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Fan26SquadReader/2.0 (World Cup fan application)",
    },
  });
  if (!response.ok) throw new Error(`Wikipedia returned ${response.status}`);
  const payload = (await response.json()) as { parse?: { text?: string } };
  if (!payload.parse?.text) throw new Error("Wikipedia returned no squad page HTML.");
  return payload.parse.text;
};

const sectionAfterHeading = ($: any, heading: any) => {
  const nodes: string[] = [];
  const headingNode = $(heading);
  const container = headingNode.parent().hasClass("mw-heading")
    ? headingNode.parent()
    : headingNode;
  let cursor = container.next();

  while (cursor.length) {
    const nextHeading =
      cursor.is("h2, h3") ||
      cursor.hasClass("mw-heading2") ||
      cursor.hasClass("mw-heading3") ||
      cursor.children("h2, h3").length > 0;
    if (nextHeading) break;

    nodes.push($.html(cursor));
    cursor = cursor.next();
  }

  return nodes.join("\n");
};

const parseSquads = (html: string) => {
  const $ = cheerio.load(html);
  const players = new Map<string, PlayerRow>();
  const managerNames = new Map<string, string>();

  $("h3").each((_headingIndex: number, heading: any) => {
    const headingText = cleanText(
      $(heading).find(".mw-headline").text() || $(heading).text(),
    );
    const team = resolveTeam(headingText);
    if (!team) return;

    const sectionHtml = sectionAfterHeading($, heading);
    const section$ = cheerio.load(`<section>${sectionHtml}</section>`);
    const coachParagraph = section$("section p")
      .filter((_index: number, paragraph: any) =>
        /^(?:Head coach|Coach)\s*:/i.test(cleanText(section$(paragraph).text())),
      )
      .first();
    const coachLink = cleanText(coachParagraph.find("a").last().text());
    const coachText = cleanText(coachParagraph.text()).replace(
      /^(?:Head coach|Coach)\s*:\s*/i,
      "",
    );
    managerNames.set(
      team.slug,
      coachLink || coachText || FALLBACK_MANAGERS[team.slug] || "TBA",
    );

    const table = section$("section table.wikitable").first();
    table.find("tr").each((_rowIndex: number, row: any) => {
      const cells = section$(row)
        .find("th, td")
        .map((_index: number, cell: any) => cleanText(section$(cell).text()))
        .get();
      const positionIndex = cells.findIndex((cell: string) => mapPosition(cell));
      if (positionIndex < 0) return;

      const position = mapPosition(cells[positionIndex]);
      const playerName = cleanText(cells[positionIndex + 1] || "");
      if (!position || !playerName || /player/i.test(playerName)) return;

      const id = playerKey(team.slug, playerName);
      const shirtNumber = Number.parseInt(cells[0] || "", 10);
      const clubCandidate = cleanText(cells[cells.length - 1] || "");
      players.set(id, {
        id,
        sourceKey: id,
        name: playerName,
        teamSlug: team.slug,
        teamName: team.name,
        position,
        detailedPosition: cleanText(cells[positionIndex]) || null,
        shirtNumber: Number.isFinite(shirtNumber) ? shirtNumber : null,
        club:
          clubCandidate && clubCandidate !== playerName ? clubCandidate : null,
        imageUrl: null,
        active: true,
      });
    });
  });

  const managers: ManagerRow[] = TEAMS.map((team) => ({
    id: `manager:${team.slug}`,
    name: managerNames.get(team.slug) || FALLBACK_MANAGERS[team.slug] || "TBA",
    teamSlug: team.slug,
    teamName: team.name,
    nationality: null,
  }));

  return {
    players: Array.from(players.values()).sort((a, b) =>
      a.teamSlug.localeCompare(b.teamSlug) ||
      a.position.localeCompare(b.position) ||
      a.name.localeCompare(b.name),
    ),
    managers,
    parsedTeams: new Set(Array.from(players.values()).map((player) => player.teamSlug)).size,
  };
};

export default async function handler(_request: unknown, response: ApiResponse) {
  try {
    const html = await fetchWikipediaHtml();
    const parsed = parseSquads(html);

    if (parsed.parsedTeams < 44 || parsed.players.length < 900) {
      throw new Error(
        `Squad source returned only ${parsed.parsedTeams} teams and ${parsed.players.length} players.`,
      );
    }

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=21600, stale-while-revalidate=86400",
    );
    response.status(200).json({
      source: "Wikipedia 2026 FIFA World Cup squads",
      fetchedAt: new Date().toISOString(),
      teamCount: parsed.parsedTeams,
      playerCount: parsed.players.length,
      players: parsed.players,
      managers: parsed.managers,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      error: error instanceof Error ? error.message : "Squad request failed",
    });
  }
}
