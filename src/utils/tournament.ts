import {
  FIXTURES,
  Fixture,
  GROUPS,
  getTeamByName,
  teamsInGroup,
} from "@/data/wc26";
import { LiveEvent, teamKey } from "@/hooks/useLiveScores";
import { AnnexCOptions } from "@/hooks/useAnnexC";

export type QualificationStatus = "Q" | "E" | null;

export type StandingRow = {
  team: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualificationStatus: QualificationStatus;
  tieBreakPending: boolean;
};

export type GroupTable = {
  group: string;
  rows: StandingRow[];
  complete: boolean;
  live: boolean;
  rankingComplete: boolean;
};

export type ThirdPlaceRow = StandingRow & {
  thirdRank: number;
  thirdTieBreakPending: boolean;
};

export type ResolvedFixture = Fixture & {
  provisional?: boolean;
  sourceLabel?: string;
};

export type TournamentState = {
  groups: GroupTable[];
  thirdPlaced: ThirdPlaceRow[];
  allGroupsComplete: boolean;
  fixtures: ResolvedFixture[];
  annexKey: string | null;
  annexExact: boolean;
  liveGroupMatches: number;
  thirdCutoffResolved: boolean;
};

type MatchRecord = {
  fixture: Fixture;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  finished: boolean;
  live: boolean;
};

type PairKey = (home: string, away: string) => string;

const ORIGINAL_FIXTURES: Fixture[] = FIXTURES.map((fixture) => ({
  ...fixture,
  score: fixture.score ? { ...fixture.score } : undefined,
}));

const scoreForFixture = (
  fixture: Fixture,
  liveScores: Map<string, LiveEvent>,
  pairKey: PairKey,
): MatchRecord | null => {
  const event = liveScores.get(pairKey(fixture.home, fixture.away));
  const usableEvent =
    event != null &&
    (event.live || event.finished) &&
    event.homeScore != null &&
    event.awayScore != null;

  if (usableEvent) {
    const sameOrder = teamKey(event.home) === teamKey(fixture.home);
    return {
      fixture,
      home: fixture.home,
      away: fixture.away,
      homeScore: sameOrder ? event.homeScore! : event.awayScore!,
      awayScore: sameOrder ? event.awayScore! : event.homeScore!,
      finished: event.finished,
      live: event.live,
    };
  }

  if (fixture.score) {
    return {
      fixture,
      home: fixture.home,
      away: fixture.away,
      homeScore: fixture.score.home,
      awayScore: fixture.score.away,
      finished: true,
      live: false,
    };
  }

  return null;
};

const emptyRow = (team: string, group: string): StandingRow => ({
  team,
  group,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  qualificationStatus: null,
  tieBreakPending: false,
});

const addResult = (row: StandingRow, scored: number, conceded: number) => {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;

  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
};

const compareOverall = (a: StandingRow, b: StandingRow) =>
  b.goalDifference - a.goalDifference ||
  b.goalsFor - a.goalsFor ||
  a.team.localeCompare(b.team);

const overallTieKey = (row: StandingRow) =>
  `${row.points}|${row.goalDifference}|${row.goalsFor}`;

const finishWithOverallCriteria = (rows: StandingRow[]) => {
  const ordered = [...rows].sort(compareOverall);
  const tiedByAvailableData = new Map<string, StandingRow[]>();

  ordered.forEach((row) => {
    const key = overallTieKey(row);
    const tied = tiedByAvailableData.get(key) ?? [];
    tied.push(row);
    tiedByAvailableData.set(key, tied);
  });

  tiedByAvailableData.forEach((tied) => {
    if (tied.length > 1) tied.forEach((row) => { row.tieBreakPending = true; });
  });

  return ordered;
};

const miniTable = (teamNames: string[], matches: MatchRecord[]) => {
  const allowed = new Set(teamNames);
  const rows = new Map(teamNames.map((team) => [team, emptyRow(team, "")]));

  matches.forEach((match) => {
    if (!allowed.has(match.home) || !allowed.has(match.away)) return;
    addResult(rows.get(match.home)!, match.homeScore, match.awayScore);
    addResult(rows.get(match.away)!, match.awayScore, match.homeScore);
  });

  return rows;
};

const miniKey = (row: StandingRow) =>
  `${row.points}|${row.goalDifference}|${row.goalsFor}`;

const rankTiedRows = (rows: StandingRow[], matches: MatchRecord[]): StandingRow[] => {
  if (rows.length <= 1) return rows;

  const mini = miniTable(rows.map((row) => row.team), matches);
  const ordered = [...rows].sort((a, b) => {
    const miniA = mini.get(a.team)!;
    const miniB = mini.get(b.team)!;
    return (
      miniB.points - miniA.points ||
      miniB.goalDifference - miniA.goalDifference ||
      miniB.goalsFor - miniA.goalsFor
    );
  });

  const partitions: StandingRow[][] = [];
  ordered.forEach((row) => {
    const key = miniKey(mini.get(row.team)!);
    const last = partitions[partitions.length - 1];
    if (!last || miniKey(mini.get(last[0].team)!) !== key) partitions.push([row]);
    else last.push(row);
  });

  if (partitions.length === 1) return finishWithOverallCriteria(ordered);

  return partitions.flatMap((partition) =>
    partition.length > 1 && partition.length < rows.length
      ? rankTiedRows(partition, matches)
      : partition,
  );
};

const sortGroupRows = (rows: StandingRow[], matches: MatchRecord[]) => {
  const byPoints = [...rows].sort((a, b) => b.points - a.points);
  const groups: StandingRow[][] = [];

  byPoints.forEach((row) => {
    const last = groups[groups.length - 1];
    if (!last || last[0].points !== row.points) groups.push([row]);
    else last.push(row);
  });

  return groups.flatMap((tied) => rankTiedRows(tied, matches));
};

const buildGroups = (liveScores: Map<string, LiveEvent>, pairKey: PairKey): GroupTable[] =>
  GROUPS.map((group) => {
    const rows = new Map(
      teamsInGroup(group).map((team) => [team.name, emptyRow(team.name, group)]),
    );
    const fixtures = ORIGINAL_FIXTURES.filter(
      (fixture) => fixture.stage === "Group" && fixture.group === group,
    );
    const matches = fixtures
      .map((fixture) => scoreForFixture(fixture, liveScores, pairKey))
      .filter((match): match is MatchRecord => match != null);

    matches.forEach((match) => {
      addResult(rows.get(match.home)!, match.homeScore, match.awayScore);
      addResult(rows.get(match.away)!, match.awayScore, match.homeScore);
    });

    const sortedRows = sortGroupRows(Array.from(rows.values()), matches);
    return {
      group,
      rows: sortedRows,
      complete: fixtures.length === 6 && matches.length === 6 && matches.every((match) => match.finished),
      live: matches.some((match) => match.live),
      rankingComplete: !sortedRows.some((row) => row.tieBreakPending),
    };
  });

const THIRD_WINNER_ORDER = ["A", "B", "D", "E", "G", "I", "K", "L"] as const;

type R32Slot =
  | { type: "rank"; group: string; position: 1 | 2 }
  | { type: "third"; winnerGroup: (typeof THIRD_WINNER_ORDER)[number] };

type R32Definition = {
  id: number;
  sourceId: number;
  home: R32Slot;
  away: R32Slot;
  label: string;
};

const rank = (group: string, position: 1 | 2): R32Slot => ({
  type: "rank",
  group,
  position,
});

const third = (winnerGroup: (typeof THIRD_WINNER_ORDER)[number]): R32Slot => ({
  type: "third",
  winnerGroup,
});

// Official match numbering from FIFA World Cup 26 Regulations, article 12.6.
// sourceId points to the repository's previous fixture carrying the correct
// date/time/venue, because several pairings had been attached to the wrong ID.
export const OFFICIAL_R32: R32Definition[] = [
  { id: 73, sourceId: 73, home: rank("A", 2), away: rank("B", 2), label: "Runner-up Group A v Runner-up Group B" },
  { id: 74, sourceId: 75, home: rank("E", 1), away: third("E"), label: "Winner Group E v best third-place team" },
  { id: 75, sourceId: 76, home: rank("F", 1), away: rank("C", 2), label: "Winner Group F v Runner-up Group C" },
  { id: 76, sourceId: 74, home: rank("C", 1), away: rank("F", 2), label: "Winner Group C v Runner-up Group F" },
  { id: 77, sourceId: 78, home: rank("I", 1), away: third("I"), label: "Winner Group I v best third-place team" },
  { id: 78, sourceId: 77, home: rank("E", 2), away: rank("I", 2), label: "Runner-up Group E v Runner-up Group I" },
  { id: 79, sourceId: 79, home: rank("A", 1), away: third("A"), label: "Winner Group A v best third-place team" },
  { id: 80, sourceId: 80, home: rank("L", 1), away: third("L"), label: "Winner Group L v best third-place team" },
  { id: 81, sourceId: 82, home: rank("D", 1), away: third("D"), label: "Winner Group D v best third-place team" },
  { id: 82, sourceId: 81, home: rank("G", 1), away: third("G"), label: "Winner Group G v best third-place team" },
  { id: 83, sourceId: 84, home: rank("K", 2), away: rank("L", 2), label: "Runner-up Group K v Runner-up Group L" },
  { id: 84, sourceId: 83, home: rank("H", 1), away: rank("J", 2), label: "Winner Group H v Runner-up Group J" },
  { id: 85, sourceId: 85, home: rank("B", 1), away: third("B"), label: "Winner Group B v best third-place team" },
  { id: 86, sourceId: 87, home: rank("J", 1), away: rank("H", 2), label: "Winner Group J v Runner-up Group H" },
  { id: 87, sourceId: 88, home: rank("K", 1), away: third("K"), label: "Winner Group K v best third-place team" },
  { id: 88, sourceId: 86, home: rank("D", 2), away: rank("G", 2), label: "Runner-up Group D v Runner-up Group G" },
];

const placeholderFor = (slot: R32Slot) =>
  slot.type === "rank"
    ? `${slot.position}${slot.group}`
    : `Best 3rd for 1${slot.winnerGroup}`;

const resolveR32Slot = (
  slot: R32Slot,
  groups: GroupTable[],
  assignments: Record<string, string>,
) => {
  if (slot.type === "rank") {
    const row = groups.find((group) => group.group === slot.group)?.rows[slot.position - 1];
    return row && !row.tieBreakPending ? row.team : undefined;
  }

  const thirdGroup = assignments[slot.winnerGroup];
  const row = groups.find((group) => group.group === thirdGroup)?.rows[2];
  return row && !row.tieBreakPending ? row.team : undefined;
};

const resolveFixtures = (
  groups: GroupTable[],
  thirdPlaced: ThirdPlaceRow[],
  allGroupsComplete: boolean,
  thirdCutoffResolved: boolean,
  annexOptions: AnnexCOptions,
) => {
  const qualifiedThirds = thirdPlaced.slice(0, 8);
  const canResolveThirdSlots =
    qualifiedThirds.length === 8 &&
    qualifiedThirds.every((row) => !row.tieBreakPending) &&
    (!allGroupsComplete || thirdCutoffResolved);
  const annexKey = canResolveThirdSlots
    ? qualifiedThirds.map((row) => row.group).sort().join("")
    : null;
  const mapping = annexKey ? annexOptions[annexKey] : undefined;
  const assignments: Record<string, string> = {};

  if (mapping?.length === 8) {
    THIRD_WINNER_ORDER.forEach((winnerGroup, index) => {
      assignments[winnerGroup] = mapping[index];
    });
  }

  const r32ById = new Map(
    OFFICIAL_R32.map((definition) => {
      const source = ORIGINAL_FIXTURES.find((fixture) => fixture.id === definition.sourceId)!;
      const home = resolveR32Slot(definition.home, groups, assignments);
      const away = resolveR32Slot(definition.away, groups, assignments);
      const resolved = Boolean(home && away && getTeamByName(home) && getTeamByName(away));

      return [
        definition.id,
        {
          ...source,
          id: definition.id,
          stage: "R32" as const,
          home: home ?? placeholderFor(definition.home),
          away: away ?? placeholderFor(definition.away),
          label: resolved ? undefined : definition.label,
          sourceLabel: definition.label,
          provisional: resolved && !allGroupsComplete,
          score: undefined,
        } satisfies ResolvedFixture,
      ];
    }),
  );

  const fixtures = ORIGINAL_FIXTURES.map((fixture): ResolvedFixture => {
    if (fixture.stage === "R32") return r32ById.get(fixture.id)!;
    if (fixture.id === 89) {
      return { ...fixture, home: "W74", away: "W77", label: "Winner Match 74 v Winner Match 77" };
    }
    if (fixture.id === 90) {
      return { ...fixture, home: "W73", away: "W75", label: "Winner Match 73 v Winner Match 75" };
    }
    return { ...fixture };
  });

  return {
    fixtures,
    annexKey,
    annexExact: Boolean(mapping?.length === 8),
  };
};

export const buildTournamentState = (
  liveScores: Map<string, LiveEvent>,
  pairKey: PairKey,
  annexOptions: AnnexCOptions,
): TournamentState => {
  const initialGroups = buildGroups(liveScores, pairKey);
  const allGroupsComplete = initialGroups.every((group) => group.complete);
  const initialThirds = initialGroups
    .map((group) => group.rows[2])
    .filter(Boolean)
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team),
    );

  const thirdTieCounts = new Map<string, number>();
  initialThirds.forEach((row) => {
    const key = overallTieKey(row);
    thirdTieCounts.set(key, (thirdTieCounts.get(key) ?? 0) + 1);
  });

  const allThirdPlacesKnown = initialGroups.every(
    (group) => !group.rows[2]?.tieBreakPending,
  );
  const thirdCutoffResolved = Boolean(
    allGroupsComplete &&
      allThirdPlacesKnown &&
      initialThirds.length === 12 &&
      overallTieKey(initialThirds[7]) !== overallTieKey(initialThirds[8]),
  );
  const cutoffTieKey =
    allGroupsComplete && initialThirds.length === 12 && !thirdCutoffResolved
      ? overallTieKey(initialThirds[7])
      : null;

  const thirdStatus = new Map<string, QualificationStatus>();
  if (allGroupsComplete && allThirdPlacesKnown) {
    initialThirds.forEach((row, index) => {
      if (cutoffTieKey && overallTieKey(row) === cutoffTieKey) return;
      thirdStatus.set(row.team, index < 8 ? "Q" : "E");
    });
  }

  const groups = initialGroups.map((group) => {
    const secondThirdBoundaryResolved = !(
      group.rows[1]?.tieBreakPending &&
      group.rows[2]?.tieBreakPending &&
      overallTieKey(group.rows[1]) === overallTieKey(group.rows[2])
    );
    const thirdFourthBoundaryResolved = !(
      group.rows[2]?.tieBreakPending &&
      group.rows[3]?.tieBreakPending &&
      overallTieKey(group.rows[2]) === overallTieKey(group.rows[3])
    );

    return {
      ...group,
      rows: group.rows.map((row, index) => ({
        ...row,
        qualificationStatus:
          index < 2 && group.complete && secondThirdBoundaryResolved
            ? "Q"
            : index === 3 && group.complete && thirdFourthBoundaryResolved
              ? "E"
              : index === 2
                ? thirdStatus.get(row.team) ?? null
                : null,
      })),
    };
  });

  const thirdPlaced = groups
    .map((group) => group.rows[2])
    .filter(Boolean)
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team),
    )
    .map((row, index) => ({
      ...row,
      thirdRank: index + 1,
      thirdTieBreakPending: (thirdTieCounts.get(overallTieKey(row)) ?? 0) > 1,
    }));

  const fixtureResolution = resolveFixtures(
    groups,
    thirdPlaced,
    allGroupsComplete,
    thirdCutoffResolved,
    annexOptions,
  );

  return {
    groups,
    thirdPlaced,
    allGroupsComplete,
    fixtures: fixtureResolution.fixtures,
    annexKey: fixtureResolution.annexKey,
    annexExact: fixtureResolution.annexExact,
    liveGroupMatches: groups.filter((group) => group.live).length,
    thirdCutoffResolved,
  };
};

export const applyResolvedFixturesInPlace = (resolved: ResolvedFixture[]) => {
  resolved.forEach((next) => {
    const current = FIXTURES.find((fixture) => fixture.id === next.id);
    if (!current) return;
    Object.assign(current, {
      date: next.date,
      time: next.time,
      home: next.home,
      away: next.away,
      group: next.group,
      stadium: next.stadium,
      stage: next.stage,
      score: next.score,
    });
    if (next.label) current.label = next.label;
    else delete current.label;
  });
};
