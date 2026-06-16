import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FIXTURES, Fixture, fixtureKickoff, fixtureStatus, getTeamByName } from "@/data/wc26";
import { Radio, Clock } from "lucide-react";

const flag = (name: string) => getTeamByName(name)?.flag ?? "🏳️";

const MatchRow = ({ f, live }: { f: Fixture; live: boolean }) => {
  const homeScore = f.score?.home ?? "-";
  const awayScore = f.score?.away ?? "-";
  return (
    <Link
      to={`/fixtures`}
      className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/40 px-3 sm:px-4 py-2.5 sm:py-3 transition-all"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className="text-xs sm:text-sm font-medium truncate text-right">{f.home}</span>
        <span className="text-base sm:text-lg shrink-0">{flag(f.home)}</span>
      </div>
      <div
        className={[
          "shrink-0 px-2.5 py-1 rounded-md font-mono text-xs sm:text-sm font-bold tabular-nums",
          live ? "bg-primary text-primary-foreground" : "bg-background border border-border",
        ].join(" ")}
      >
        {homeScore} – {awayScore}
      </div>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-base sm:text-lg shrink-0">{flag(f.away)}</span>
        <span className="text-xs sm:text-sm font-medium truncate">{f.away}</span>
      </div>
    </Link>
  );
};

const LiveMatches = () => {
  // tick every minute so live status auto-updates
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const playable = FIXTURES.filter((f) => f.stage === "Group" || !f.label);
  const live = playable.filter((f) => fixtureStatus(f, now) === "live");
  const recent = playable
    .filter((f) => f.score && fixtureStatus(f, now) === "finished")
    .sort((a, b) => fixtureKickoff(b).getTime() - fixtureKickoff(a).getTime())
    .slice(0, 3);

  const showingLive = live.length > 0;
  const items = showingLive ? live : recent;

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
        <Link to="/fixtures" className="text-xs text-muted-foreground hover:text-primary">
          All fixtures →
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {items.map((f) => (
          <MatchRow key={f.id} f={f} live={showingLive} />
        ))}
      </div>
    </section>
  );
};

export default LiveMatches;
