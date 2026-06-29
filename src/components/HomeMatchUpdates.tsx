import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Gamepad2, RefreshCw, WifiOff } from "lucide-react";
import { FIXTURES, getTeamByName } from "@/data/wc26";
import TeamFlag from "@/components/TeamFlag";
import { useLiveScores } from "@/hooks/useLiveScores";
import {
  enrichMatchFeed,
  MatchFeedRow,
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
      className="h-7 w-7 shrink-0 rounded-md"
    />
  );
};

const ResultCard = ({ row }: { row: MatchFeedRow }) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    className="group block rounded-xl border border-border bg-secondary/30 p-3 transition-all hover:border-primary/40 hover:bg-secondary/50"
  >
    <div className="mb-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">
      <span>{stageLabel(row.fixture)}</span>
      <span className={row.live ? "font-bold text-red-500" : ""}>
        {row.live ? row.badge ?? "LIVE" : "FT"}
      </span>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="truncate text-right text-xs font-semibold sm:text-sm">
          {row.fixture.home}
        </span>
        <MatchFlag name={row.fixture.home} />
      </div>
      <div
        className={`rounded-lg px-2.5 py-1 font-mono text-sm font-black tabular-nums ${
          row.live
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background"
        }`}
      >
        {row.homeScore} - {row.awayScore}
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <MatchFlag name={row.fixture.away} />
        <span className="truncate text-xs font-semibold sm:text-sm">
          {row.fixture.away}
        </span>
      </div>
    </div>
  </Link>
);

const UpcomingCard = ({ row, now }: { row: MatchFeedRow; now: Date }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-3 transition-all hover:border-primary/40 hover:bg-secondary/45">
    <Link
      to={`/matches/${row.fixture.id}`}
      className="group flex items-center gap-3"
      aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} match details`}
    >
      <div className="w-16 shrink-0">
        <div className="text-[10px] font-semibold text-primary">
          {relativeMatchDay(row.fixture, now)}
        </div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
          {row.fixture.time} BST
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <MatchFlag name={row.fixture.home} />
        <span className="truncate text-xs font-semibold">{row.fixture.home}</span>
        <span className="text-[10px] uppercase text-muted-foreground">vs</span>
        <span className="truncate text-xs font-semibold">{row.fixture.away}</span>
        <MatchFlag name={row.fixture.away} />
      </div>
    </Link>
    <Link
      to={`/mini-game?match=${row.fixture.id}`}
      className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary hover:text-primary-foreground"
    >
      <Gamepad2 className="h-3.5 w-3.5" /> Play Penalty Challenge
    </Link>
  </div>
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
  <div className="mb-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      {live ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      ) : (
        <Clock3 className="h-3.5 w-3.5 text-primary" />
      )}
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
    </div>
    <Link to={link} className="text-[11px] text-primary hover:underline">
      View all →
    </Link>
  </div>
);

const HomeMatchUpdates = () => {
  const [now, setNow] = useState(() => new Date());
  const { data, loading, refreshing, error } = useLiveScores(60_000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () => enrichMatchFeed(FIXTURES, data, now),
    [data, now],
  );
  const latest = useMemo(() => selectLatestMatches(rows), [rows]);
  const upcoming = useMemo(() => selectUpcomingMatchDay(rows, 4), [rows]);
  const hasLive = latest.some((row) => row.live);

  return (
    <div className="relative space-y-6 rounded-2xl border border-border/60 bg-secondary/25 p-4 backdrop-blur-sm sm:p-5">
      <div>
        <SectionHeading
          title={hasLive ? "Live Matches" : "Latest Results"}
          live={hasLive}
          link="/fixtures?view=latest#latest-matches"
        />
        <div className="space-y-2">
          {latest.map((row) => (
            <ResultCard key={row.fixture.id} row={row} />
          ))}
          {latest.length === 0 && loading && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/30 px-4 py-4 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading match updates…
            </div>
          )}
          {latest.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-border px-4 py-4 text-xs text-muted-foreground">
              No completed or live match is available yet.
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeading
          title="Upcoming Matches"
          link="/fixtures?view=latest#upcoming-matches"
        />
        <div className="space-y-2">
          {upcoming.map((row) => (
            <UpcomingCard key={row.fixture.id} row={row} now={now} />
          ))}
          {upcoming.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-4 text-xs text-muted-foreground">
              No upcoming match is currently scheduled.
            </div>
          )}
        </div>
      </div>

      {refreshing && !loading && (
        <RefreshCw className="absolute right-3 top-3 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <WifiOff className="h-3 w-3" /> Stored match data is shown while the feed reconnects.
        </div>
      )}
    </div>
  );
};

export default HomeMatchUpdates;
