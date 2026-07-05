import {
  type Fixture,
  fixtureKickoff,
  fixtureStatus,
} from "@/data/wc26";
import {
  type LiveMap,
  teamKey,
} from "@/hooks/useLiveScores";
import {
  findLiveEventForFixture,
  resolveLiveFixtureParticipants,
} from "@/utils/liveFixtureParticipants";

export type MatchFeedRow = {
  fixture: Fixture;
  live: boolean;
  finished: boolean;
  upcoming: boolean;
  homeScore: number | string;
  awayScore: number | string;
  badge: string | null;
};

const playable = (fixture: Fixture) =>
  fixture.stage === "Group" || !fixture.label;

export const enrichMatchFeed = (
  fixtures: Fixture[],
  liveScores: LiveMap,
  now: Date,
): MatchFeedRow[] => {
  const pairKey = (home: string, away: string) =>
    [teamKey(home), teamKey(away)].sort().join("|");

  const resolvedFixtures = resolveLiveFixtureParticipants(
    fixtures,
    liveScores,
    pairKey,
  );

  // Keep the caller's fixture catalogue synchronized too. This makes the
  // Fixtures page's full schedule, match pages and any other consumers show
  // the same newly resolved country names after this feed is enriched.
  resolvedFixtures.forEach((next) => {
    const current = fixtures.find((fixture) => fixture.id === next.id);
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

  return resolvedFixtures
    .filter(playable)
    .map((fixture) => {
      const event = findLiveEventForFixture(
        fixture,
        liveScores,
        pairKey,
      );
      const sameOrder = event
        ? teamKey(event.home) === teamKey(fixture.home)
        : true;
      const eventHomeScore = event
        ? sameOrder
          ? event.homeScore
          : event.awayScore
        : null;
      const eventAwayScore = event
        ? sameOrder
          ? event.awayScore
          : event.homeScore
        : null;
      const storedStatus = fixtureStatus(fixture, now);
      const live = event?.live === true;
      const finished =
        event?.finished === true ||
        (!live && fixture.score != null && storedStatus === "finished");

      return {
        fixture,
        live,
        finished,
        upcoming: !live && !finished && storedStatus === "upcoming",
        homeScore: eventHomeScore ?? fixture.score?.home ?? "-",
        awayScore: eventAwayScore ?? fixture.score?.away ?? "-",
        badge: live
          ? event?.progress ?? "LIVE"
          : finished
            ? "FT"
            : null,
      };
    });
};

export const selectLatestMatches = (rows: MatchFeedRow[]) => {
  const liveRows = rows
    .filter((row) => row.live)
    .sort(
      (a, b) =>
        fixtureKickoff(a.fixture).getTime() -
        fixtureKickoff(b.fixture).getTime(),
    );
  const finishedRows = rows
    .filter((row) => row.finished)
    .sort(
      (a, b) =>
        fixtureKickoff(b.fixture).getTime() -
        fixtureKickoff(a.fixture).getTime(),
    );

  const currentStage =
    liveRows[0]?.fixture.stage ?? finishedRows[0]?.fixture.stage;
  if (!currentStage) return [];

  const currentStageLive = liveRows.filter(
    (row) => row.fixture.stage === currentStage,
  );
  const currentStageFinished = finishedRows
    .filter((row) => row.fixture.stage === currentStage)
    .slice(0, 2);

  const ids = new Set<number>();
  return [...currentStageLive, ...currentStageFinished].filter((row) => {
    if (ids.has(row.fixture.id)) return false;
    ids.add(row.fixture.id);
    return true;
  });
};

export const selectUpcomingMatchDay = (
  rows: MatchFeedRow[],
  limit = Number.POSITIVE_INFINITY,
) => {
  const upcoming = rows
    .filter((row) => row.upcoming)
    .sort(
      (a, b) =>
        fixtureKickoff(a.fixture).getTime() -
        fixtureKickoff(b.fixture).getTime(),
    );

  const firstDate = upcoming[0]?.fixture.date;
  if (!firstDate) return [];

  return upcoming
    .filter((row) => row.fixture.date === firstDate)
    .slice(0, limit);
};

export const stageLabel = (fixture: Fixture) => {
  if (fixture.stage === "Group") return `Group ${fixture.group}`;

  const labels: Record<Fixture["stage"], string> = {
    Group: "Group Stage",
    R32: "Round of 32",
    R16: "Round of 16",
    QF: "Quarter-finals",
    SF: "Semi-finals",
    "3rd": "Third-place",
    Final: "Final",
  };

  return labels[fixture.stage];
};

const bstDateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const relativeMatchDay = (
  fixture: Fixture,
  now = new Date(),
) => {
  const fixtureDate = fixture.date;
  const today = bstDateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = bstDateKey(tomorrowDate);

  if (fixtureDate === today) return "Today";
  if (fixtureDate === tomorrow) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
  }).format(fixtureKickoff(fixture));
};
