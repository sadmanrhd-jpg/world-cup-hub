type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

const SOURCE_URL =
  "https://en.wikipedia.org/w/index.php?title=Template%3A2026_FIFA_World_Cup_third-place_table&action=render";

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));

const cleanCell = (html: string) =>
  decodeEntities(
    html
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

const parseOptions = (html: string) => {
  const options: Record<string, string[]> = {};
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowPattern)) {
    const cells = Array.from(
      rowMatch[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi),
      (match) => cleanCell(match[1]),
    );

    const option = Number(cells[0]);
    if (!Number.isInteger(option) || option < 1 || option > 495) continue;

    const groups = cells.filter((cell) => /^[A-L]$/.test(cell)).slice(0, 8);
    const opponents = cells
      .filter((cell) => /^3[A-L]$/.test(cell))
      .slice(-8)
      .map((cell) => cell.slice(1));

    if (groups.length !== 8 || opponents.length !== 8) continue;
    options[[...groups].sort().join("")] = opponents;
  }

  return options;
};

export default async function handler(_request: unknown, response: ApiResponse) {
  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Fan26/1.0 (World Cup bracket data)",
      },
    });

    if (!upstream.ok) throw new Error(`Annex C source returned ${upstream.status}`);

    const html = await upstream.text();
    const options = parseOptions(html);

    if (Object.keys(options).length < 490) {
      throw new Error(`Only ${Object.keys(options).length} Annex C options were parsed`);
    }

    response.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    response.status(200).json({
      source: "FIFA World Cup 26 Regulations, Annex C",
      mirror: "Wikipedia rendered template",
      fetchedAt: new Date().toISOString(),
      count: Object.keys(options).length,
      options,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      error: error instanceof Error ? error.message : "Annex C request failed",
    });
  }
}
