type AnyRecord = Record<string, any>;

export type RatingSource = "provider" | "fan26" | "estimated" | null;

export type RatedPlayer = {
  id: string;
  name: string;
  position: string;
  jersey: string;
  starter: boolean;
  played: boolean;
  didNotPlay: boolean;
  rating: number | null;
  ratingSource: RatingSource;
};

export type RatedTeam = {
  team: string;
  players: RatedPlayer[];
};

export type RatingContext = {
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  matchStarted?: boolean;
};

type WorkingPlayer = RatedPlayer & {
  stats: Map<string, number>;
  providerRating: number | null;
};

type WorkingTeam = {
  team: string;
  players: Map<string, WorkingPlayer>;
};

const asArray = <T,>(value: T[] | undefined | null): T[] =>
  Array.isArray(value) ? value : [];

const stringValue = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const boolValue = (...values: unknown[]) =>
  values.some(
    (value) =>
      value === true ||
      value === 1 ||
      (typeof value === "string" && ["true", "yes", "1", "active"].includes(value.toLowerCase())),
  );

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const STAT_ALIASES: Record<string, string> = {
  min: "minutes",
  mins: "minutes",
  minute: "minutes",
  g: "goals",
  gl: "goals",
  goal: "goals",
  a: "assists",
  ast: "assists",
  assist: "assists",
  sh: "shots",
  shot: "shots",
  sog: "shotsontarget",
  sot: "shotsontarget",
  shotsongoal: "shotsontarget",
  kp: "keypasses",
  cc: "chancescreated",
  drb: "successfuldribbles",
  tk: "tackles",
  tkl: "tackles",
  int: "interceptions",
  clr: "clearances",
  sv: "saves",
  save: "saves",
  pa: "passaccuracy",
  passpct: "passaccuracy",
  passingpct: "passaccuracy",
  yc: "yellowcards",
  yellow: "yellowcards",
  rc: "redcards",
  red: "redcards",
  fc: "foulscommitted",
  foul: "foulscommitted",
  og: "owngoals",
  pm: "penaltiesmissed",
  gc: "goalsconceded",
  rtg: "rating",
};

const canonicalStatKey = (value: string) => {
  const key = normalize(value);
  return STAT_ALIASES[key] ?? key;
};

const teamName = (value?: AnyRecord) =>
  stringValue(
    value?.displayName,
    value?.shortDisplayName,
    value?.name,
    value?.team?.displayName,
    value?.team?.shortDisplayName,
    value?.team?.name,
  );

const athleteName = (value?: AnyRecord) =>
  stringValue(
    value?.displayName,
    value?.fullName,
    value?.shortName,
    value?.name,
    value?.athlete?.displayName,
    value?.athlete?.fullName,
    value?.player?.displayName,
  );

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "—") return null;

  const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(cleaned);
  if (percent) return Number(percent[1]);

  const fraction = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(cleaned);
  if (fraction) {
    const made = Number(fraction[1]);
    const attempted = Number(fraction[2]);
    return Number.isFinite(made) && Number.isFinite(attempted) && attempted !== 0
      ? (made / attempted) * 100
      : made;
  }

  const match = /-?\d+(?:\.\d+)?/.exec(cleaned);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ratingValue = (value: unknown): number | null => {
  const parsed = parseNumber(value);
  if (parsed == null || parsed < 0 || parsed > 10) return null;
  return Math.round(parsed * 10) / 10;
};

const setStat = (
  stats: Map<string, number>,
  label: unknown,
  value: unknown,
) => {
  const key = canonicalStatKey(stringValue(label));
  const numeric = parseNumber(value);
  if (!key || numeric == null) return;
  stats.set(key, numeric);
};

const addStat = (stats: Map<string, number>, label: string, amount = 1) => {
  const key = canonicalStatKey(label);
  stats.set(key, (stats.get(key) ?? 0) + amount);
};

const readObjectStats = (value: unknown, stats: Map<string, number>) => {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const stat of value) {
      if (!stat || typeof stat !== "object") continue;
      const record = stat as AnyRecord;
      setStat(
        stats,
        stringValue(
          record.name,
          record.label,
          record.displayName,
          record.abbreviation,
          record.shortDisplayName,
        ),
        record.value ?? record.displayValue ?? record.stat,
      );
    }
    return;
  }

  for (const [key, raw] of Object.entries(value as AnyRecord)) {
    if (typeof raw === "string" || typeof raw === "number") {
      setStat(stats, key, raw);
    }
  }
};

const providerRatingFrom = (
  entry: AnyRecord,
  athlete: AnyRecord,
  stats: Map<string, number>,
): number | null => {
  const directCandidates = [
    entry.rating,
    entry.displayRating,
    entry.playerRating,
    entry.grade,
    athlete.rating,
    athlete.displayRating,
    athlete.playerRating,
  ];

  for (const candidate of directCandidates) {
    const rating = ratingValue(candidate);
    if (rating != null) return rating;
  }

  for (const [key, value] of stats) {
    if (key.includes("rating") || key === "rtg" || key === "grade") {
      const rating = ratingValue(value);
      if (rating != null) return rating;
    }
  }

  return null;
};

const stat = (stats: Map<string, number>, ...keys: string[]) => {
  for (const requested of keys) {
    const normalized = canonicalStatKey(requested);
    if (stats.has(normalized)) return stats.get(normalized) ?? 0;
  }

  for (const [key, value] of stats) {
    if (keys.some((requested) => key.includes(normalize(requested)))) return value;
  }

  return 0;
};

const hasAnyStat = (stats: Map<string, number>, keys: string[]) =>
  keys.some((requested) => {
    const normalized = canonicalStatKey(requested);
    if (stats.has(normalized)) return true;
    return Array.from(stats.keys()).some((key) => key.includes(normalized));
  });

const playerKey = (id: string, name: string) => id || normalize(name);

const emptyPlayer = (
  entry: AnyRecord,
  athlete: AnyRecord,
  fallbackId: string,
): WorkingPlayer => {
  const name = athleteName(athlete) || athleteName(entry);
  const starter = boolValue(entry.starter, entry.isStarter, athlete.starter);
  const didNotPlay = boolValue(
    entry.didNotPlay,
    entry.inactive,
    athlete.didNotPlay,
    entry.status?.type === "inactive",
  );
  const entered = boolValue(
    entry.subbedIn,
    entry.didEnter,
    entry.entered,
    entry.active,
    athlete.subbedIn,
  );

  return {
    id: stringValue(athlete.id, entry.id, fallbackId),
    name,
    position: stringValue(
      entry.position?.abbreviation,
      entry.position?.displayName,
      athlete.position?.abbreviation,
      athlete.position?.displayName,
    ),
    jersey: stringValue(entry.jersey, entry.jerseyNumber, athlete.jersey, athlete.jerseyNumber),
    starter,
    played: !didNotPlay && (starter || entered),
    didNotPlay,
    stats: new Map<string, number>(),
    providerRating: null,
    rating: null,
    ratingSource: null,
  };
};

const mergePlayer = (
  target: WorkingPlayer,
  incoming: WorkingPlayer,
): WorkingPlayer => {
  const stats = new Map(target.stats);
  for (const [key, value] of incoming.stats) stats.set(key, value);

  return {
    ...target,
    id: target.id || incoming.id,
    name: target.name || incoming.name,
    position: target.position || incoming.position,
    jersey: target.jersey || incoming.jersey,
    starter: target.starter || incoming.starter,
    played: target.played || incoming.played,
    didNotPlay: target.didNotPlay && incoming.didNotPlay,
    stats,
    providerRating: target.providerRating ?? incoming.providerRating,
    rating: null,
    ratingSource: null,
  };
};

const parsePlayerEntry = (
  entry: AnyRecord,
  fallbackId: string,
  labels: unknown[] = [],
): WorkingPlayer | null => {
  const athlete = entry.athlete ?? entry.player ?? entry;
  const player = emptyPlayer(entry, athlete, fallbackId);
  if (!player.name) return null;

  const rawStats = asArray<unknown>(entry.stats ?? entry.statValues);
  rawStats.forEach((value, index) =>
    setStat(player.stats, labels[index] ?? `stat-${index}`, value),
  );

  readObjectStats(entry.statistics, player.stats);
  readObjectStats(entry.statsMap, player.stats);
  readObjectStats(athlete.statistics, player.stats);

  setStat(player.stats, "minutes", entry.minutes ?? athlete.minutes);
  setStat(player.stats, "goals", entry.goals ?? athlete.goals);
  setStat(player.stats, "assists", entry.assists ?? athlete.assists);

  player.providerRating = providerRatingFrom(entry, athlete, player.stats);
  player.played =
    !player.didNotPlay &&
    (player.played ||
      player.starter ||
      stat(player.stats, "minutes", "min") > 0 ||
      player.stats.size > 0);

  return player;
};

const findExistingPlayerKey = (
  players: Map<string, WorkingPlayer>,
  parsed: WorkingPlayer,
) => {
  const exactKey = playerKey(parsed.id, parsed.name);
  const nameKey = normalize(parsed.name);
  return Array.from(players.entries()).find(
    ([storedKey, stored]) =>
      storedKey === exactKey ||
      normalize(stored.name) === nameKey ||
      (parsed.id && stored.id === parsed.id),
  )?.[0];
};

const upsertPlayer = (team: WorkingTeam, parsed: WorkingPlayer) => {
  const existingKey = findExistingPlayerKey(team.players, parsed);
  if (existingKey) {
    team.players.set(existingKey, mergePlayer(team.players.get(existingKey)!, parsed));
  } else {
    team.players.set(playerKey(parsed.id, parsed.name), parsed);
  }
};

const collectRosterTeams = (summary: AnyRecord): Map<string, WorkingTeam> => {
  const teams = new Map<string, WorkingTeam>();

  asArray<AnyRecord>(summary?.rosters).forEach((roster, teamIndex) => {
    const name = teamName(roster.team) || `Team ${teamIndex + 1}`;
    const key = normalize(name);
    const team = teams.get(key) ?? {
      team: name,
      players: new Map<string, WorkingPlayer>(),
    };
    const rawPlayers = asArray<AnyRecord>(
      roster.roster ?? roster.entries ?? roster.athletes,
    );

    rawPlayers.forEach((entry, playerIndex) => {
      const parsed = parsePlayerEntry(entry, `roster-${teamIndex}-${playerIndex}`);
      if (parsed) upsertPlayer(team, parsed);
    });

    teams.set(key, team);
  });

  return teams;
};

const mergeBoxscorePlayers = (
  summary: AnyRecord,
  teams: Map<string, WorkingTeam>,
) => {
  asArray<AnyRecord>(summary?.boxscore?.players).forEach((block, teamIndex) => {
    const name = teamName(block.team) || `Team ${teamIndex + 1}`;
    const key = normalize(name);
    const team = teams.get(key) ?? {
      team: name,
      players: new Map<string, WorkingPlayer>(),
    };

    asArray<AnyRecord>(block.statistics).forEach((group, groupIndex) => {
      const labels = asArray<unknown>(
        group.labels ?? group.names ?? group.keys ?? group.descriptions,
      );
      const athletes = asArray<AnyRecord>(group.athletes ?? group.players);

      athletes.forEach((entry, playerIndex) => {
        const parsed = parsePlayerEntry(
          entry,
          `box-${teamIndex}-${groupIndex}-${playerIndex}`,
          labels,
        );
        if (parsed) upsertPlayer(team, parsed);
      });
    });

    teams.set(key, team);
  });
};

const allEvents = (summary: AnyRecord) => [
  ...asArray<AnyRecord>(summary?.details),
  ...asArray<AnyRecord>(summary?.keyEvents),
  ...asArray<AnyRecord>(summary?.scoringPlays),
];

const findPlayerAcrossTeams = (
  teams: Map<string, WorkingTeam>,
  participant: AnyRecord,
) => {
  const athlete = participant.athlete ?? participant.player ?? participant;
  const id = stringValue(athlete.id, participant.id);
  const name = athleteName(athlete) || athleteName(participant);
  const normalizedName = normalize(name);

  for (const team of teams.values()) {
    const entry = Array.from(team.players.entries()).find(
      ([, player]) =>
        (id && player.id === id) ||
        (normalizedName && normalize(player.name) === normalizedName),
    );
    if (entry) return { team, key: entry[0], player: entry[1] };
  }

  return null;
};

const applyEventData = (
  summary: AnyRecord,
  teams: Map<string, WorkingTeam>,
) => {
  for (const event of allEvents(summary)) {
    const text = stringValue(
      event.type?.text,
      event.type?.displayName,
      event.type?.name,
      event.playType?.text,
      event.text,
      event.description,
    );
    const eventKey = normalize(text);
    const participants = asArray<AnyRecord>(event.participants);

    participants.forEach((participant, index) => {
      const found = findPlayerAcrossTeams(teams, participant);
      if (!found) return;

      const player = found.player;
      const role = normalize(
        stringValue(
          participant.type,
          participant.type?.text,
          participant.type?.name,
          participant.role,
          participant.role?.text,
          participant.role?.name,
        ),
      );

      player.played = true;
      player.didNotPlay = false;

      const isOwnGoal = eventKey.includes("owngoal");
      const isGoal =
        !eventKey.includes("goalkick") &&
        (event.scoringPlay === true || eventKey.includes("goal"));
      const isAssist = role.includes("assist") || eventKey.includes("assist");

      if (isGoal && !isAssist) {
        if (isOwnGoal) addStat(player.stats, "owngoals");
        else if (index === 0 || role.includes("scorer") || role.includes("goal")) {
          addStat(player.stats, "goals");
        }
      }
      if (isAssist) addStat(player.stats, "assists");
      if (eventKey.includes("yellowcard")) addStat(player.stats, "yellowcards");
      if (eventKey.includes("redcard")) addStat(player.stats, "redcards");
      if (eventKey.includes("penaltymiss")) addStat(player.stats, "penaltiesmissed");
    });
  }
};

const resultForTeam = (
  team: string,
  context: RatingContext,
): { scored: number; conceded: number } | null => {
  const homeScore = parseNumber(context.homeScore);
  const awayScore = parseNumber(context.awayScore);
  if (homeScore == null || awayScore == null) return null;

  const key = normalize(team);
  if (key === normalize(context.homeTeam ?? "")) {
    return { scored: homeScore, conceded: awayScore };
  }
  if (key === normalize(context.awayTeam ?? "")) {
    return { scored: awayScore, conceded: homeScore };
  }
  return null;
};

const calculateRating = (
  player: WorkingPlayer,
  team: string,
  context: RatingContext,
): { rating: number | null; source: RatingSource } => {
  if (player.providerRating != null) {
    return { rating: player.providerRating, source: "provider" };
  }

  if (!context.matchStarted || player.didNotPlay || !player.played) {
    return { rating: null, source: null };
  }

  const performanceKeys = [
    "goals",
    "assists",
    "shotsontarget",
    "shots",
    "keypasses",
    "chancescreated",
    "successfuldribbles",
    "tackleswon",
    "tackles",
    "interceptions",
    "clearances",
    "saves",
    "passaccuracy",
    "yellowcards",
    "redcards",
    "foulscommitted",
    "owngoals",
    "penaltiesmissed",
  ];
  const hasPerformanceData = hasAnyStat(player.stats, performanceKeys);
  const minutes = stat(player.stats, "minutes", "min", "mins");

  let rating = player.starter ? 6.3 : 6.0;
  const result = resultForTeam(team, context);
  if (result) {
    const difference = result.scored - result.conceded;
    if (difference > 0) rating += 0.25;
    else if (difference < 0) rating -= 0.2;
    rating += clamp(difference, -4, 4) * 0.04;

    const position = normalize(player.position);
    const goalkeeper = position === "gk" || position === "g" || position.includes("goalkeeper");
    const defender = position === "d" || position.includes("def") || position.includes("back");
    if (result.conceded === 0) {
      if (goalkeeper) rating += 0.35;
      else if (defender) rating += 0.15;
    }
  }

  const goals = stat(player.stats, "goals", "goal");
  const assists = stat(player.stats, "assists", "assist");
  const shotsOnTarget = stat(player.stats, "shotsontarget", "shotsongoal");
  const shots = stat(player.stats, "totalshots", "shots");
  const keyPasses = stat(player.stats, "keypasses", "chancescreated");
  const dribbles = stat(player.stats, "successfuldribbles", "dribblescompleted");
  const tackles = stat(player.stats, "tackleswon", "totaltackles", "tackles");
  const interceptions = stat(player.stats, "interceptions");
  const clearances = stat(player.stats, "clearances");
  const saves = stat(player.stats, "saves", "goalkeepersaves");
  const passAccuracy = stat(player.stats, "passaccuracy", "passingaccuracy");
  const yellowCards = stat(player.stats, "yellowcards", "yellowcard");
  const redCards = stat(player.stats, "redcards", "redcard");
  const fouls = stat(player.stats, "foulscommitted", "fouls");
  const ownGoals = stat(player.stats, "owngoals", "owngoal");
  const penaltiesMissed = stat(player.stats, "penaltiesmissed", "penaltymissed");
  const errors = stat(player.stats, "errorsleadingtogoal", "errorleadingtogoal");

  rating += goals * 1.05;
  rating += assists * 0.65;
  rating += shotsOnTarget * 0.08;
  rating += Math.max(0, shots - shotsOnTarget) * 0.015;
  rating += keyPasses * 0.08;
  rating += dribbles * 0.05;
  rating += tackles * 0.055;
  rating += interceptions * 0.06;
  rating += clearances * 0.025;
  rating += saves * 0.12;

  if (passAccuracy >= 90) rating += 0.2;
  else if (passAccuracy >= 80) rating += 0.1;
  else if (passAccuracy > 0 && passAccuracy < 60) rating -= 0.15;

  rating -= yellowCards * 0.3;
  rating -= redCards * 1.15;
  rating -= fouls * 0.025;
  rating -= ownGoals * 0.9;
  rating -= penaltiesMissed * 0.55;
  rating -= errors * 0.75;

  if (minutes > 0 && minutes < 15 && goals === 0 && assists === 0) {
    rating -= 0.15;
  }

  return {
    rating: Math.round(clamp(rating, 3, 10) * 10) / 10,
    source: hasPerformanceData ? "fan26" : "estimated",
  };
};

const finalizePlayer = (
  player: WorkingPlayer,
  team: string,
  context: RatingContext,
): RatedPlayer => {
  const calculated = calculateRating(player, team, context);
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    jersey: player.jersey,
    starter: player.starter,
    played: player.played,
    didNotPlay: player.didNotPlay,
    rating: calculated.rating,
    ratingSource: calculated.source,
  };
};

export const buildPlayerRatingTeams = (
  summary: AnyRecord | undefined,
  context: RatingContext = {},
): RatedTeam[] => {
  if (!summary) return [];

  const teams = collectRosterTeams(summary);
  mergeBoxscorePlayers(summary, teams);
  applyEventData(summary, teams);

  return Array.from(teams.values())
    .map((team) => ({
      team: team.team,
      players: Array.from(team.players.values())
        .map((player) => finalizePlayer(player, team.team, context))
        .filter((player) => player.name)
        .sort((a, b) => {
          if (a.starter !== b.starter) return a.starter ? -1 : 1;
          if (a.played !== b.played) return a.played ? -1 : 1;
          if (a.rating != null && b.rating != null && a.rating !== b.rating) {
            return b.rating - a.rating;
          }
          if (a.rating != null) return -1;
          if (b.rating != null) return 1;
          return a.name.localeCompare(b.name);
        }),
    }))
    .filter((team) => team.players.length > 0);
};

export const ratingTone = (rating: number | null) => {
  if (rating == null) return "border-border bg-secondary/40 text-muted-foreground";
  if (rating >= 8.5) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-500";
  if (rating >= 7.5) return "border-primary/40 bg-primary/15 text-primary";
  if (rating >= 6.5) return "border-border bg-secondary text-foreground";
  if (rating >= 5.5) return "border-amber-500/40 bg-amber-500/15 text-amber-500";
  return "border-red-500/40 bg-red-500/15 text-red-500";
};
