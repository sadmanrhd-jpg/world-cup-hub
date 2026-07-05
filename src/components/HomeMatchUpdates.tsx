import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, RefreshCw, WifiOff } from "lucide-react";
import { FIXTURES, getTeamByName } from "@/data/wc26";
import TeamFlag from "@/components/TeamFlag";
import { useLiveScores } from "@/hooks/useLiveScores";
import {
  shootoutLabel,
  shootoutPairKey,
  usePenaltyShootouts,
} from "@/hooks/usePenaltyShootouts";
import type { PenaltyShootoutResult } from "@/hooks/usePenaltyShootouts";
import {
  enrichMatchFeed,
  type MatchFeedRow,
  relativeMatchDay,
  selectLatestMatches,
  selectUpcomingMatchDay,
  stageLabel,
} from "@/utils/matchFeed";

const MatchFlag = ({ name }: { name: string }) => {
  const team = getTeamByName(name);

  return (
    <TeamFlag
      name={name}
      slug={team?.slug}
      className="h-6 w-6 shrink-0 rounded-md sm:h-7 sm:w-7"
    />
  );
};

const TeamResultRow = ({
  name,
  score,
}: {
  name: string;
  score: number | string;
}) => (
  <div className="flex min-w-0 items-center gap-2 rounded-lg bg-background/45 px-2.5 py-2">
    <MatchFlag name={name} />
    <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
      {name}
    </span>
    <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-md border border-border bg-background px-1.5 font-mono text-xs font-black tabular-nums">
      {score}
    </span>
  </div>
);

const ResultCard = ({
  row,
  shootout,
}: {
  row: MatchFeedRow;
  shootout?: PenaltyShootoutResult;
}) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    className="group block w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-secondary/30 p-2.5 transition-all hover:border-primary/40 hover:bg-secondary/50 sm:p-3"
  >
    <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">
      <span className="min-w-0 truncate">{stageLabel(row.fixture)}</span>
      <span
        className={`shrink-0 ${
          row.live
            ? "font-bold text-red-500"
            : shootout
              ? "font-bold text-primary"
              : ""
        }`}
      >
        {row.live ? row.badge ?? "LIVE" : shootout ? "PEN" : "FT"}
      </span>
    </div>

    <div className="space-y-1.5">
      <TeamResultRow name={row.fixture.home} score={row.homeScore} />
      <TeamResultRow name={row.fixture.away} score={row.awayScore} />
    </div>

    {shootout && (
      <div className="mt-2 break-words rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[9px] font-bold leading-relaxed text-primary">
        {shootoutLabel(shootout)}
      </div>
    )}
  </Link>
);

const UpcomingTeamRow = ({ name }: { name: string }) => (
  <div className="flex min-w-0 items-center gap-2">
    <MatchFlag name={name} />
    <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
      {name}
    </span>
  </div>
);

const UpcomingCard = ({ row, now }: { row: MatchFeedRow; now: Date }) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    className="group block w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-secondary/20 p-2.5 transition-all hover:border-primary/40 hover:bg-secondary/45 sm:p-3"
    aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} match details`}
  >
    <div className="mb-2 flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-2">
      <span className="min-w-0 truncate text-[10px] font-semibold text-primary sm:text-xs">
        {relativeMatchDay(row.fixture, now)}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground sm:text-xs">
        {row.fixture.time} BST
      </span>
    </div>

    <div className="min-w-0 space-y-1.5">
      <UpcomingTeamRow name={row.fixture.home} />
      <div className="pl-8 text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        vs
      </div>
      <UpcomingTeamRow name={row.fixture.away} />
    </div>
  </Link>
);

const SectionHeading = ({
  title,
  live,
  link,
}: {
  title: string;
  live?: boolean;
  link: string;
}) => (
  <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
    <div className="flex min-w-0 items-center gap-2">
      {live ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      ) : (
        <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <h2 className="min-w-0 truncate text-base font-bold sm:text-lg">
        {title}
      </h2>
    </div>

    <Link
      to={link}
      className="shrink-0 whitespace-nowrap text-[10px] text-primary hover:underline"
    >
      View all →
    </Link>
  </div>
);

const HomeMatchUpdates = () => {
  const [now, setNow] = useState(() => new Date());
  const {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
  } = useLiveScores();
  const shootouts = usePenaltyShootouts(30_000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () => enrichMatchFeed(FIXTURES, data, now),
    [data, now],
  );

  const hasFreshScoreFeed = data.size > 0;
  const latest = useMemo(
    () => (hasFreshScoreFeed ? selectLatestMatches(rows) : []),
    [hasFreshScoreFeed, rows],
  );
  const upcoming = useMemo(() => selectUpcomingMatchDay(rows, 3), [rows]);
  const hasLive = latest.some((row) => row.live);

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-4 overflow-hidden rounded-2xl border border-border/60 bg-secondary/25 p-3 backdrop-blur-sm sm:p-4">
      <div className="min-w-0">
        <SectionHeading
          title="Upcoming Matches"
          link="/fixtures?view=latest#upcoming-matches"
        />

        <div className="min-w-0 space-y-1.5">
          {upcoming.map((row) => (
            <UpcomingCard key={row.fixture.id} row={row} now={now} />
          ))}

          {upcoming.length === 0 && (
            <div className="max-w-full break-words rounded-xl border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              No upcoming match is currently scheduled.
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <SectionHeading
          title={hasLive ? "Live Matches" : "Latest Results"}
          live={hasLive}
          link="/fixtures?view=latest#latest-matches"
        />

        <div className="min-w-0 space-y-1.5">
          {latest.map((row) => (
            <ResultCard
              key={row.fixture.id}
              row={row}
              shootout={shootouts.get(
                shootoutPairKey(row.fixture.home, row.fixture.away),
              )}
            />
          ))}

          {!hasFreshScoreFeed && loading && (
            <div className="flex max-w-full items-start gap-2 rounded-xl border border-border bg-background/30 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
              <span className="min-w-0 break-words">
                Loading the latest verified results…
              </span>
            </div>
          )}

          {!hasFreshScoreFeed && !loading && error && (
            <div className="flex max-w-full items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
              <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="min-w-0 break-words">
                Live scores are reconnecting. Old stored scores remain hidden.
              </span>
            </div>
          )}

          {hasFreshScoreFeed && latest.length === 0 && !loading && (
            <div className="max-w-full break-words rounded-xl border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              No completed or live match is available yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-start justify-between gap-2 text-[9px] leading-relaxed text-muted-foreground">
        <span className="min-w-0 break-words">
          {lastUpdated
            ? `Automatically updated ${lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : "Connecting to the live tournament feed…"}
        </span>

        {refreshing && !loading && (
          <RefreshCw className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
        )}
      </div>

      {error && hasFreshScoreFeed && (
        <div className="flex max-w-full items-start gap-1.5 text-[9px] leading-relaxed text-muted-foreground">
          <WifiOff className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 break-words">
            Last verified data remains visible while the feed reconnects.
          </span>
        </div>
      )}
    </div>
  );
};

export default HomeMatchUpdates;
