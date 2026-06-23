import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FIXTURES,
  Fixture,
  fixtureKickoff,
  fixtureStatus,
  getTeamByName,
} from "@/data/wc26";
import { useLiveScores, teamKey } from "@/hooks/useLiveScores";
import { Radio, Clock, RefreshCw, WifiOff } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";

const pairKey = (a: string, b: string) =>
  [teamKey(a), teamKey(b)].sort().join("|");

type Row = {
  f: Fixture;
  live: boolean;
  homeScore: number | string;
  awayScore: number | string;
  badge?: string | null;
};

type LiveMatchesProps = {
  showAllFixturesLink?: boolean;
};

const MatchFlag = ({ name }: { name: string }) => {
  const team = getTeamByName(name);

  return (
    <TeamFlag
      name={name}
      slug={team?.slug}
      className="h-6 w-6 sm:h-7 sm:w-7 rounded-md shrink-0"
    />
  );
};

const MatchRow = ({ row }: { row: Row }) => {
  const { f, live, homeScore, awayScore, badge } = row;

  return (
    <Link
      to="/fixtures"
      className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/40 px-3 sm:px-4 py-2.5 sm:py-3 transition-all"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className="text-xs sm:text-sm font-medium truncate text-right">
          {f.home}
        </span>
        <MatchFlag name={f.home} />
      </div>

      <div className="flex flex-col items-center shrink-0">
        <div
          className={[
            "px-2.5 py-1 rounded-md font-mono text-xs sm:text-sm font-bold tabular-nums",
            live
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border",
          ].join(" ")}
        >
          {homeScore} - {awayScore}
        </div>
        {badge && (
          <span className="mt-0.5 text-[10px] font-semibold text-red-500">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <MatchFlag name={f.away} />
        <span className="text-xs sm:text-sm font-medium truncate">{f.away}</span>
      </div>
    </Link>
  );
};

const LiveMatches = ({ showAllFixturesLink = true }: LiveMatchesProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const {
    data: live,
    loading,
    refreshing,
    lastUpdated,
    error,
  } = useLiveScores(60_000);

  const playable = FIXTURES.filter((fixture) => fixture.stage === "Group" || !fixture.label);

  const enriched = playable.map((fixture) => {
    const event = live.get(pairKey(fixture.home, fixture.away));

    if (event) {
      return {
        f: fixture,
        live: event.live,
        finished:
          event.finished ||
          (fixture.score != null && fixtureStatus(fixture, now) === "finished"),
        homeScore: event.homeScore ?? fixture.score?.home ?? "-",
        awayScore: event.awayScore ?? fixture.score?.away ?? "-",
        badge: event.live ? event.progress ?? "LIVE" : null,
      };
    }

    return {
      f: fixture,
      live: false,
      finished:
        fixture.score != null && fixtureStatus(fixture, now) === "finished",
      homeScore: fixture.score?.home ?? "-",
      awayScore: fixture.score?.away ?? "-",
      badge: null,
    };
  });

  const liveRows = enriched.filter((row) => row.live);
  const recentRows = enriched
    .filter((row) => row.finished)
    .sort(
      (a, b) =>
        fixtureKickoff(b.f).getTime() - fixtureKickoff(a.f).getTime(),
    )
    .slice(0, 3);

  const showingLive = liveRows.length > 0;
  const items: Row[] = showingLive ? liveRows : recentRows;

  if (items.length === 0 && loading) {
    return (
      <section className="container py-6 sm:py-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading live scores...
        </div>
      </section>
    );
  }

  if (items.length === 0 && error) {
    return (
      <section className="container py-6 sm:py-10">
        <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <WifiOff className="h-4 w-4 text-primary shrink-0" />
          <span>Live scores are temporarily unavailable. Retrying automatically every minute.</span>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="container py-6 sm:py-10">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest">
          {showingLive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <Radio className="h-3 w-3 text-red-500" />
              <span className="text-red-500 font-semibold">Live now</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-primary font-semibold">Latest results</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {refreshing && !loading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {lastUpdated && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground">
              Updated{" "}
              {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {showAllFixturesLink && (
            <Link
              to="/fixtures"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              All fixtures →
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {items.map((row) => (
          <MatchRow key={row.f.id} row={row} />
        ))}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          The latest stored scores are shown while the feed reconnects.
        </div>
      )}
    </section>
  );
};

export default LiveMatches;
