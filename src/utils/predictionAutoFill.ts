import {
  type Fixture,
  fixtureKickoff,
  fixtureStatus,
  getTeamByName,
  TEAMS,
} from "@/data/wc26";
import {
  type LiveEvent,
  type LiveMap,
  teamKey,
} from "@/hooks/useLiveScores";
import {
  type PenaltyShootoutMap,
  shootoutPairKey,
} from "@/hooks/usePenaltyShootouts";
import type { TournamentState } from "@/utils/tournament";

export const PREDICTION_STORAGE_KEY = "wc26-prediction-v5";

export type StoredPredictionState = {
  groupOrder: Record<string, string[]>;
  thirdOrder: string[];
  winners: Record<string, string>;
};

export type OfficialPredictionUpdate = {
  groupOrder: Record<string, string[]>;
  thirdOrder: string[] | null;
  winners: Record<string, string>;
  signature: string;
};

type PairKey = (home: string, away: string) => string;

const MATCH_TOLERANCE_MS = 90 * 60 * 1000;

const NEXT_MATCHES: Record<number, number[]> = {
  73: [90],
  74: [89],
  75: [90],
  76: [91],
  77: [89],
  78: [91],
  79: [92],
  80: [92],
  81: [94],
  82: [94],
  83: [93],
  84: [93],
  85: [96],
  86: [95],
  87: [96],
  88: [95],
  89: [97],
  90: [97],
  91: [99],
  92: [99],
  93: [98],
  94: [98],
  95: [100],
  96: [100],
  97: [101],
  98: [101],
  99: [102],
  100: [102],
  101: [103, 104],
  102: [103, 104],
};

const emptyState = (): StoredPredictionState => ({
  groupOrder: {},
  thirdOrder: [],
  winners: {},
});

const canonicalTeamName = (name: string | null | undefined) => {
  if (!name) return null;

  const exact = getTeamByName(name);
  if (exact) return exact.name;

  const key = teamKey(name);
  return TEAMS.find((team) => teamKey(team.name) === key)?.name ?? name;
};

const collectDownstream = (matchId: number) => {
  const downstream = new Set<number>();

  const visit = (id: number) => {
    for (const next of NEXT_MATCHES[id] ?? []) {
      if (downstream.has(next)) continue;
      downstream.add(next);
      visit(next);
    }
  };

  visit(matchId);
  return downstream;
};

const eventKickoff = (event: LiveEvent) => {
  if (!event.dateUTC) return null;

  const date = new Date(event.dateUTC);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hasKnownParticipants = (fixture: Fixture) =>
  Boolean(getTeamByName(fixture.home) && getTeamByName(fixture.away));

const nearestEvent = (
  fixture: Fixture,
  liveScores: LiveMap,
  pairKey: PairKey,
) => {
  const exact = liveScores.get(pairKey(fixture.home, fixture.away));
  if (exact) return exact;

  if (hasKnownParticipants(fixture)) return undefined;

  const kickoff = fixtureKickoff(fixture).getTime();

  return Array.from(liveScores.values())
    .filter((event) => {
      const date = eventKickoff(event);
      return (
        date != null &&
        Math.abs(date.getTime() - kickoff) <= MATCH_TOLERANCE_MS
      );
    })
    .sort((a, b) => {
      const aKickoff = eventKickoff(a)?.getTime() ?? 0;
      const bKickoff = eventKickoff(b)?.getTime() ?? 0;

      return (
        Math.abs(aKickoff - kickoff) -
        Math.abs(bKickoff - kickoff)
      );
    })[0];
};

const resolveFixture = (
  fixture: Fixture,
  liveScores: LiveMap,
  pairKey: PairKey,
) => {
  const event = nearestEvent(fixture, liveScores, pairKey);
  if (!event) return fixture;

  const home = canonicalTeamName(event.home);
  const away = canonicalTeamName(event.away);

  if (!home || !away) return fixture;

  return {
    ...fixture,
    home,
    away,
    label: undefined,
  };
};

const scoreWinner = (
  fixture: Fixture,
  liveScores: LiveMap,
  shootouts: PenaltyShootoutMap,
  pairKey: PairKey,
) => {
  const event = nearestEvent(fixture, liveScores, pairKey);
  const shootout = shootouts.get(
    shootoutPairKey(fixture.home, fixture.away),
  );

  const completed =
    event?.finished === true ||
    (fixture.score != null && fixtureStatus(fixture) === "finished");

  if (!completed) return undefined;

  const shootoutWinner = canonicalTeamName(shootout?.winner);
  if (shootoutWinner) return shootoutWinner;

  const sameOrder =
    event == null ||
    teamKey(event.home) === teamKey(fixture.home);

  const homeScore =
    event?.finished && event.homeScore != null && event.awayScore != null
      ? sameOrder
        ? event.homeScore
        : event.awayScore
      : fixture.score?.home;

  const awayScore =
    event?.finished && event.homeScore != null && event.awayScore != null
      ? sameOrder
        ? event.awayScore
        : event.homeScore
      : fixture.score?.away;

  if (homeScore == null || awayScore == null || homeScore === awayScore) {
    return undefined;
  }

  return homeScore > awayScore ? fixture.home : fixture.away;
};

export const buildOfficialPredictionUpdate = (
  tournament: TournamentState,
  liveScores: LiveMap,
  shootouts: PenaltyShootoutMap,
  pairKey: PairKey,
): OfficialPredictionUpdate => {
  const groupOrder = Object.fromEntries(
    tournament.groups
      .filter((group) => group.complete && group.rankingComplete)
      .map((group) => [
        group.group,
        group.rows.map((row) => row.team),
      ]),
  );

  const thirdOrder = tournament.allGroupsComplete
    ? tournament.thirdPlaced.map((row) => row.team)
    : null;

  const winners: Record<string, string> = {};

  tournament.fixtures
    .filter((fixture) => fixture.id >= 73 && fixture.id <= 104)
    .sort((a, b) => a.id - b.id)
    .forEach((fixture) => {
      const resolved = resolveFixture(fixture, liveScores, pairKey);
      const winner = scoreWinner(
        resolved,
        liveScores,
        shootouts,
        pairKey,
      );

      if (winner) {
        winners[String(resolved.id)] = winner;
      }
    });

  const signature = JSON.stringify({
    groupOrder,
    thirdOrder,
    winners,
  });

  return {
    groupOrder,
    thirdOrder,
    winners,
    signature,
  };
};

const readStoredState = (): StoredPredictionState => {
  try {
    const raw = localStorage.getItem(PREDICTION_STORAGE_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Partial<StoredPredictionState>;

    return {
      groupOrder: parsed.groupOrder ?? {},
      thirdOrder: parsed.thirdOrder ?? [],
      winners: parsed.winners ?? {},
    };
  } catch {
    return emptyState();
  }
};

export const synchronizePredictionStorage = (
  update: OfficialPredictionUpdate,
) => {
  const current = readStoredState();

  const next: StoredPredictionState = {
    groupOrder: { ...current.groupOrder },
    thirdOrder: [...current.thirdOrder],
    winners: { ...current.winners },
  };

  Object.entries(update.groupOrder).forEach(([group, order]) => {
    next.groupOrder[group] = [...order];
  });

  if (update.thirdOrder) {
    next.thirdOrder = [...update.thirdOrder];
  }

  Object.entries(update.winners)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([id, winner]) => {
      if (next.winners[id] === winner) return;

      collectDownstream(Number(id)).forEach((downstream) => {
        delete next.winners[String(downstream)];
      });

      next.winners[id] = winner;
    });

  const before = JSON.stringify(current);
  const after = JSON.stringify(next);
  const changed = before !== after;

  if (changed) {
    localStorage.setItem(PREDICTION_STORAGE_KEY, after);
  }

  return changed;
};
