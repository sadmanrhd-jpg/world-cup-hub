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

const ResultCard = ({
  row,
  shootout,
}: {
  row: MatchFeedRow;
  shootout?: PenaltyShootoutResult;
}) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    className="group block rounded-xl border border-border bg-secondary/30 px-2.5 py-2 transition-all hover:border-primary/40 hover:bg-secondary/50 sm:px-3 sm:py-2.5"
  >
    <div className="mb-1.5 flex items-center justify-between gap-2 text-[8px] uppercase tracking-wider text-muted-foreground sm:text-[9px]">
      <span>{stageLabel(row.fixture)}</span>
      <span
        className={
          row.live
            ? "font-bold text-red-500"
            : shootout
              ? "font-bold text-primary"
              : ""
        }
      >
        {row.live ? row.badge ?? "LIVE" : shootout ? "PEN" : "FT"}
      </span>
    </div>

    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="truncate text-right text-[11px] font-semibold sm:text-xs">
          {row.fixture.home}
        </span>
        <MatchFlag name={row.fixture.home} />
      </div>

      <div
        className={`rounded-lg px-2 py-1 font-mono text-xs font-black tabular-nums sm:text-sm ${
          row.live
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background"
        }`}
      >
        {row.homeScore} - {row.awayScore}
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <MatchFlag name={row.fixture.away} />
        <span className="truncate text-[11px] font-semibold sm:text-xs">
          {row.fixture.away}
        </span>
      </div>
    </div>

    {shootout && (
      <div className="mt-1.5 rounded-lg bg-primary/10 px-2 py-1 text-center text-[9px] font-bold text-primary">
        {shootoutLabel(shootout)}
      </div>
    )}
  </Link>
);

const UpcomingCard = ({ row, now }: { row: MatchFeedRow; now: Date }) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    className="group grid grid-cols-[52px_1fr] items-center gap-2 rounded-xl border border-border bg-secondary/20 px-2.5 py-2 transition-all hover:border-primary/40 hover:bg-secondary/45 sm:grid-cols-[60px_1fr] sm:px-3 sm:py-2.5"
    aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} match details`}
  >
    <div className="shrink-0">
      <div className="text-[9px] font-semibold text-primary sm:text-[10px]">
        {relativeMatchDay(row.fixture, now)}
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground sm:text-[11px]">
        {row.fixture.time} BST
      </div>
    </div>

    <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-1.5">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="truncate text-right text-[11px] font-semibold sm:text-xs">
          {row.fixture.home}
        </span>
        <MatchFlag name={row.fixture.home} />
      </div>
      <span className="text-[9px] uppercase text-muted-foreground">vs</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <MatchFlag name={row.fixture.away} />
        <span className="truncate text-[11px] font-semibold sm:text-xs">
          {row.fixture.away}
        </span>
      </div>
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
  <div className="mb-2 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      {live ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      ) : (
        <Clock3 className="h-3.5 w-3.5 text-primary" />
      )}
      <h2 className="text-base font-bold sm:text-lg">{title}</h2>
    </div>

    <Link to={link} className="text-[10px] text-primary hover:underline">
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
    <div className="relative space-y-4 rounded-2xl border border-border/60 bg-secondary/25 p-3 backdrop-blur-sm sm:p-4">
      <div>
        <SectionHeading
          title="Upcoming Matches"
          link="/fixtures?view=latest#upcoming-matches"
        />

        <div className="space-y-1.5">
          {upcoming.map((row) => (
            <UpcomingCard key={row.fixture.id} row={row} now={now} />
          ))}

          {upcoming.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              No upcoming match is currently scheduled.
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeading
          title={hasLive ? "Live Matches" : "Latest Results"}
          live={hasLive}
          link="/fixtures?view=latest#latest-matches"
        />

        <div className="space-y-1.5">
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
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/30 px-3 py-3 text-[11px] text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Loading the latest verified results…
            </div>
          )}

          {!hasFreshScoreFeed && !loading && error && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-[11px] text-muted-foreground">
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              Live scores are reconnecting. Old stored scores remain hidden.
            </div>
          )}

          {hasFreshScoreFeed && latest.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              No completed or live match is available yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-4 items-center justify-between gap-3 text-[9px] text-muted-foreground">
        <span>
          {lastUpdated
            ? `Automatically updated ${lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : "Connecting to the live tournament feed…"}
        </span>

        {refreshing && !loading && (
          <RefreshCw className="h-3 w-3 shrink-0 animate-spin" />
        )}
      </div>

      {error && hasFreshScoreFeed && (
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          Last verified data remains visible while the feed reconnects.
        </div>
      )}
    </div>
  );
};

export default HomeMatchUpdates;
