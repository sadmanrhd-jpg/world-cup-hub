import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FIXTURES, Fixture, fixtureKickoff, fixtureStatus, getTeamByName } from "@/data/wc26";
import { useLiveScores, teamKey } from "@/hooks/useLiveScores";
import { Radio, Clock, RefreshCw } from "lucide-react";

const flag = (name: string) => getTeamByName(name)?.flag ?? "🏳️";

const pairKey = (a: string, b: string) => [teamKey(a), teamKey(b)].sort().join("|");

type Row = {
  f: Fixture;
  live: boolean;
  homeScore: number | string;
  awayScore: number | string;
  badge?: string | null;
};

const MatchRow = ({ row }: { row: Row }) => {
  const { f, live, homeScore, awayScore, badge } = row;
  return (
    <Link
      to={`/fixtures`}
      className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/40 px-3 sm:px-4 py-2.5 sm:py-3 transition-all"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className="text-xs sm:text-sm font-medium truncate text-right">{f.home}</span>
        <span className="text-base sm:text-lg shrink-0">{flag(f.home)}</span>
      </div>
      <div className="flex flex-col items-center shrink-0">
        <div
          className={[
            "px-2.5 py-1 rounded-md font-mono text-xs sm:text-sm font-bold tabular-nums",
            live ? "bg-primary text-primary-foreground" : "bg-background border border-border",
          ].join(" ")}
        >
          {homeScore} – {awayScore}
        </div>
        {badge && (
          <span className="mt-0.5 text-[10px] font-semibold text-red-500">{badge}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-base sm:text-lg shrink-0">{flag(f.away)}</span>
        <span className="text-xs sm:text-sm font-medium truncate">{f.away}</span>
      </div>
    </Link>
  );
};

const LiveMatches = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: live, loading, lastUpdated } = useLiveScores(60_000);

  const playable = FIXTURES.filter((f) => f.stage === "Group" || !f.label);

  // Merge live API data into fixtures
  const enriched = playable.map((f) => {
    const ev = live.get(pairKey(f.home, f.away));
    if (ev) {
      const isLive = ev.live;
      const isDone = ev.finished;
      return {
        f,
        liveApi: ev,
        live: isLive,
        finished: isDone || (f.score != null && fixtureStatus(f, now) === "finished"),
        homeScore: ev.homeScore ?? f.score?.home ?? "-",
        awayScore: ev.awayScore ?? f.score?.away ?? "-",
        badge: isLive ? (ev.progress ? `${ev.progress}'` : "LIVE") : null,
      };
    }
    return {
      f,
      liveApi: null,
      live: fixtureStatus(f, now) === "live",
      finished: f.score != null && fixtureStatus(f, now) === "finished",
      homeScore: f.score?.home ?? "-",
      awayScore: f.score?.away ?? "-",
      badge: fixtureStatus(f, now) === "live" ? "LIVE" : null,
    };
  });

  const liveRows = enriched.filter((r) => r.live);
  const recentRows = enriched
    .filter((r) => r.finished)
    .sort((a, b) => fixtureKickoff(b.f).getTime() - fixtureKickoff(a.f).getTime())
    .slice(0, 3);

  const showingLive = liveRows.length > 0;
  const items: Row[] = showingLive ? liveRows : recentRows;

  if (items.length === 0 && loading) {
    return (
      <section className="container py-6 sm:py-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading live scores…
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
          {lastUpdated && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Link to="/fixtures" className="text-xs text-muted-foreground hover:text-primary">
            All fixtures →
          </Link>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {items.map((r) => (
          <MatchRow key={r.f.id} row={r} />
        ))}
      </div>
    </section>
  );
};

export default LiveMatches;
