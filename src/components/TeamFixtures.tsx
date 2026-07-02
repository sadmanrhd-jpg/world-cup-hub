import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Loader2,
  Radio,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import {
  Fixture,
  fixtureKickoff,
  getTeamByName,
} from "@/data/wc26";
import { useAnnexC } from "@/hooks/useAnnexC";
import {
  LiveMap,
  teamKey,
  useLiveScores,
} from "@/hooks/useLiveScores";
import {
  PenaltyShootoutMap,
  shootoutLabel,
  shootoutPairKey,
  usePenaltyShootouts,
} from "@/hooks/usePenaltyShootouts";
import {
  enrichMatchFeed,
  MatchFeedRow,
  stageLabel,
} from "@/utils/matchFeed";
import { buildTournamentState } from "@/utils/tournament";

type TeamFixturesProps = {
  teamName: string;
};

type PairKey = (home: string, away: string) => string;

type KnockoutOutcome = {
  winner: string;
  loser: string;
};

const STAGE_ORDER: Fixture["stage"][] = [
  "Group",
  "R32",
  "R16",
  "QF",
  "SF",
  "3rd",
  "Final",
];

const isRealTeam = (name: string) => Boolean(getTeamByName(name));

const resolveScoreOrder = (
  fixture: Fixture,
  liveScores: LiveMap,
  pairKey: PairKey,
) => {
  const event = liveScores.get(pairKey(fixture.home, fixture.away));
  if (!event || !event.finished) return null;

  const sameOrder = teamKey(event.home) === teamKey(fixture.home);
  const homeScore = sameOrder ? event.homeScore : event.awayScore;
  const awayScore = sameOrder ? event.awayScore : event.homeScore;

  if (homeScore == null || awayScore == null) return null;

  return { homeScore, awayScore };
};

const resolveOutcome = (
  fixture: Fixture,
  liveScores: LiveMap,
  pairKey: PairKey,
  shootouts: PenaltyShootoutMap,
): KnockoutOutcome | null => {
  if (fixture.stage === "Group") return null;
  if (!isRealTeam(fixture.home) || !isRealTeam(fixture.away)) return null;

  const liveScore = resolveScoreOrder(fixture, liveScores, pairKey);
  const storedScore = fixture.score
    ? {
        homeScore: fixture.score.home,
        awayScore: fixture.score.away,
      }
    : null;
  const score = liveScore ?? storedScore;

  if (!score) return null;

  if (score.homeScore > score.awayScore) {
    return { winner: fixture.home, loser: fixture.away };
  }

  if (score.awayScore > score.homeScore) {
    return { winner: fixture.away, loser: fixture.home };
  }

  const shootout = shootouts.get(
    shootoutPairKey(fixture.home, fixture.away),
  );

  if (!shootout?.winner) return null;

  const winner =
    teamKey(shootout.winner) === teamKey(fixture.home)
      ? fixture.home
      : fixture.away;
  const loser = winner === fixture.home ? fixture.away : fixture.home;

  return { winner, loser };
};

const resolveKnockoutParticipants = (
  fixtures: Fixture[],
  liveScores: LiveMap,
  pairKey: PairKey,
  shootouts: PenaltyShootoutMap,
) => {
  const outcomes = new Map<number, KnockoutOutcome>();

  const resolveSlot = (slot: string) => {
    const match = slot.match(/^([WL])(\d+)$/);
    if (!match) return slot;

    const outcome = outcomes.get(Number(match[2]));
    if (!outcome) return slot;

    return match[1] === "W" ? outcome.winner : outcome.loser;
  };

  return [...fixtures]
    .sort((a, b) => a.id - b.id)
    .map((fixture) => {
      const resolved: Fixture = {
        ...fixture,
        score: fixture.score ? { ...fixture.score } : undefined,
        home: resolveSlot(fixture.home),
        away: resolveSlot(fixture.away),
      };

      const outcome = resolveOutcome(
        resolved,
        liveScores,
        pairKey,
        shootouts,
      );

      if (outcome) outcomes.set(resolved.id, outcome);

      return resolved;
    });
};

const MatchFlag = ({ name }: { name: string }) => {
  const team = getTeamByName(name);

  return (
    <TeamFlag
      name={name}
      slug={team?.slug}
      className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9"
    />
  );
};

const statusLabel = (row: MatchFeedRow, hasShootout: boolean) => {
  if (row.live) return row.badge ?? "LIVE";
  if (row.finished) return hasShootout ? "PEN" : "FT";
  return "UPCOMING";
};

const TeamFixtureCard = ({
  row,
  shootouts,
}: {
  row: MatchFeedRow;
  shootouts: PenaltyShootoutMap;
}) => {
  const shootout = shootouts.get(
    shootoutPairKey(row.fixture.home, row.fixture.away),
  );
  const completed = row.live || row.finished;

  return (
    <Link
      to={`/matches/${row.fixture.id}`}
      className="card-elevated block rounded-2xl border border-border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5 text-primary" />
          <span>
            {new Intl.DateTimeFormat("en-US", {
              timeZone: "Asia/Dhaka",
              month: "short",
              day: "numeric",
            }).format(fixtureKickoff(row.fixture))}
            {" · "}
            {row.fixture.time} BST
          </span>
        </div>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider",
            row.live
              ? "bg-red-500/15 text-red-400"
              : row.finished
                ? "bg-primary/12 text-primary"
                : "bg-secondary text-muted-foreground",
          ].join(" ")}
        >
          {statusLabel(row, Boolean(shootout))}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-xs font-bold sm:text-sm">
            {row.fixture.home}
          </span>
          <MatchFlag name={row.fixture.home} />
        </div>

        <div
          className={[
            "min-w-[64px] rounded-xl px-2 py-2 text-center font-mono font-black tabular-nums",
            completed
              ? row.live
                ? "bg-primary text-base text-primary-foreground sm:text-lg"
                : "border border-border bg-background text-base sm:text-lg"
              : "border border-border bg-secondary/35 text-xs text-muted-foreground",
          ].join(" ")}
        >
          {completed ? `${row.homeScore} - ${row.awayScore}` : "VS"}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <MatchFlag name={row.fixture.away} />
          <span className="truncate text-xs font-bold sm:text-sm">
            {row.fixture.away}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[10px] text-muted-foreground sm:text-xs">
        <span className="truncate">{row.fixture.stadium}</span>
        <span className="shrink-0 text-primary">
          Match details →
        </span>
      </div>

      {shootout && (
        <div className="mt-2 rounded-xl bg-primary/10 px-3 py-2 text-center text-[10px] font-bold text-primary sm:text-[11px]">
          {shootoutLabel(shootout)}
        </div>
      )}
    </Link>
  );
};

const TeamFixtures = ({ teamName }: TeamFixturesProps) => {
  const [now, setNow] = useState(() => new Date());
  const {
    data: liveScores,
    loading,
    refreshing,
    error,
    pairKey,
  } = useLiveScores(60_000);
  const shootouts = usePenaltyShootouts(60_000);
  const annex = useAnnexC();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const tournament = useMemo(
    () => buildTournamentState(liveScores, pairKey, annex.options),
    [liveScores, pairKey, annex.options],
  );

  const resolvedFixtures = useMemo(
    () =>
      resolveKnockoutParticipants(
        tournament.fixtures,
        liveScores,
        pairKey,
        shootouts,
      ),
    [tournament.fixtures, liveScores, pairKey, shootouts],
  );

  const rows = useMemo(
    () => enrichMatchFeed(resolvedFixtures, liveScores, now),
    [resolvedFixtures, liveScores, now],
  );

  const teamRows = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            teamKey(row.fixture.home) === teamKey(teamName) ||
            teamKey(row.fixture.away) === teamKey(teamName),
        )
        .sort(
          (a, b) =>
            fixtureKickoff(a.fixture).getTime() -
            fixtureKickoff(b.fixture).getTime(),
        ),
    [rows, teamName],
  );

  const stageSections = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        stage,
        rows: teamRows.filter((row) => row.fixture.stage === stage),
      })).filter((section) => section.rows.length > 0),
    [teamRows],
  );

  const waitingForFirstFeed = loading && liveScores.size === 0;

  return (
    <section id="fixtures" className="scroll-mt-28">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
            <CalendarDays className="h-4 w-4" />
            Tournament schedule
          </div>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Fixtures
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Group-stage matches, knockout fixtures and completed results.
          </p>
        </div>

        {refreshing && !loading && (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {waitingForFirstFeed ? (
        <div className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border border-border card-elevated text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading the latest fixtures and results
        </div>
      ) : stageSections.length > 0 ? (
        <div className="space-y-7">
          {stageSections.map((section) => (
            <div key={section.stage}>
              <div className="mb-3 flex items-center gap-2">
                {section.rows.some((row) => row.live) ? (
                  <Radio className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
                <h3 className="text-lg font-black sm:text-xl">
                  {stageLabel(section.rows[0].fixture)}
                </h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {section.rows.length}
                </span>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {section.rows.map((row) => (
                  <TeamFixtureCard
                    key={row.fixture.id}
                    row={row}
                    shootouts={shootouts}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No fixture is available for this team yet.
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[11px] text-muted-foreground">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
          The last available schedule is shown while the live result feed reconnects.
        </div>
      )}
    </section>
  );
};

export default TeamFixtures;
