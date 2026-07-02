import type { WorldCupPlayer } from "@/types/fanProfile";

export type PlayerStageRatings = {
  group: number | null;
  r32: number | null;
  r16: number | null;
  qf: number | null;
  sf: number | null;
  final: number | null;
};

export type PlayerBio = {
  playerId: string;
  name: string;
  teamName: string;
  club: string | null;
  age: number | null;
  label: string;
  summary: string;
  portraitUrl: string | null;
  shirtNumber: number | null;
  position: string;
  ratings: PlayerStageRatings;
  source: "licensed" | "fan26";
};

export type PlayerBioOverride = Partial<
  Omit<PlayerBio, "playerId" | "name" | "teamName">
> & {
  name: string;
  teamName: string;
};

/**
 * Add licensed player profiles here using the key:
 *
 *   `${teamName.toLowerCase()}|${playerName.toLowerCase()}`
 *
 * The UI works without overrides by generating an original Fan26 summary from
 * the existing squad data. Licensed profiles added here replace that fallback.
 */
export const PLAYER_BIO_OVERRIDES: Record<string, PlayerBioOverride> = {};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const playerBioKey = (teamName: string, playerName: string) =>
  `${normalize(teamName)}|${normalize(playerName)}`;

const labelFor = (player: WorldCupPlayer) => {
  const starts = player.stats?.starts ?? 0;
  const appearances = player.stats?.appearances ?? 0;

  if (player.position === "GK") {
    return (player.stats?.cleanSheets ?? 0) > 0 ? "Commanding" : "Composed";
  }

  if (player.position === "DEF") {
    return (player.stats?.tackles ?? 0) + (player.stats?.interceptions ?? 0) > 5
      ? "Relentless"
      : "Reliable";
  }

  if (player.position === "MID") {
    return (player.stats?.assists ?? 0) > 0 ? "Inventive" : "Intelligent";
  }

  if ((player.stats?.goals ?? 0) > 0) return "Clinical";
  if (starts > 0 || appearances > 0) return "Direct";
  return "Ambitious";
};

const positionText = (player: WorldCupPlayer) =>
  player.detailedPosition ??
  {
    GK: "goalkeeper",
    DEF: "defender",
    MID: "midfielder",
    FWD: "forward",
  }[player.position];

const originalSummary = (player: WorldCupPlayer) => {
  const role = positionText(player).toLowerCase();
  const club = player.club
    ? ` At club level, ${player.name} represents ${player.club}.`
    : "";
  const appearances = player.stats?.appearances ?? 0;
  const goals = player.stats?.goals ?? 0;
  const assists = player.stats?.assists ?? 0;
  const saves = player.stats?.saves ?? 0;

  let tournament = "";

  if (appearances > 0) {
    const contributions: string[] = [];

    if (goals > 0) {
      contributions.push(`${goals} ${goals === 1 ? "goal" : "goals"}`);
    }

    if (assists > 0) {
      contributions.push(`${assists} ${assists === 1 ? "assist" : "assists"}`);
    }

    if (saves > 0) {
      contributions.push(`${saves} ${saves === 1 ? "save" : "saves"}`);
    }

    tournament = contributions.length
      ? ` In the tournament so far, the ${role} has made ${appearances} ${
          appearances === 1 ? "appearance" : "appearances"
        } and recorded ${contributions.join(" and ")}.`
      : ` In the tournament so far, the ${role} has made ${appearances} ${
          appearances === 1 ? "appearance" : "appearances"
        }.`;
  }

  return `${player.name} is part of ${player.teamName}'s 2026 World Cup squad and is listed as a ${role}.${club}${tournament}`;
};

const emptyRatings = (): PlayerStageRatings => ({
  group: null,
  r32: null,
  r16: null,
  qf: null,
  sf: null,
  final: null,
});

export const getPlayerBio = (player: WorldCupPlayer): PlayerBio => {
  const override =
    PLAYER_BIO_OVERRIDES[playerBioKey(player.teamName, player.name)];

  const fallback: PlayerBio = {
    playerId: player.id,
    name: player.name,
    teamName: player.teamName,
    club: player.club,
    age: null,
    label: labelFor(player),
    summary: originalSummary(player),
    portraitUrl: player.imageUrl,
    shirtNumber: player.shirtNumber,
    position: positionText(player),
    ratings: emptyRatings(),
    source: "fan26",
  };

  if (!override) return fallback;

  return {
    ...fallback,
    ...override,
    playerId: player.id,
    name: player.name,
    teamName: player.teamName,
    ratings: {
      ...fallback.ratings,
      ...(override.ratings ?? {}),
    },
    source: "licensed",
  };
};
