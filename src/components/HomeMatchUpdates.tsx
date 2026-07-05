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
      className="h-7 w-7 shrink-0 rounded-md sm:h-8 sm:w-8"
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

const UpcomingTeamRow = ({
  name,
  align = "left",
}: {
  name: string;
  align?: "left" | "right";
}) => (
  <div
    className={[
      "flex min-w-0 items-center gap-2",
      align === "right" ? "justify-end" : "",
    ].join(" ")}
  >
    {align === "right" ? (
      <>
        <span className="min-w-0 truncate text-right text-sm font-black sm:text-base">
          {name}
        </span>
        <MatchFlag name={name} />
      </>
    ) : (
      <>
        <MatchFlag name={name} />
        <span className="min-w-0 truncate text-sm font-black sm:text-base">
          {name}
        </span>
      </>
    )}
  </div>
);

const UpcomingMatchTile = ({
  row,
  now,
  index,
}: {
  row: MatchFeedRow;
  now: Date;
  index: number;
}) => {
  const alignRight = index % 2 === 1;

  return (
    <Link
      to={`/matches/${row.fixture.id}`}
      aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} match details`}
      className="group block min-w-0 overflow-hidden bg-background/15 p-4 transition-colors hover:bg-primary/[0.05] sm:p-5"
    >
      <div
        className={[
          "border-b border-border/70 pb-3",
          alignRight ? "text-right" : "text-left",
        ].join(" ")}
      >
        <div className="text-sm font-black text-primary sm:text-base">
          {relativeMatchDay(row.fixture, now)}
        </div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground sm:text-sm">
          {row.fixture.time} BST
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <UpcomingTeamRow
          name={row.fixture.home}
          align={alignRight ? "right" : "left"}
        />

        <div
          className={[
            "text-xs font-black uppercase tracking-[0.28em] text-muted-foreground",
            alignRight ? "pr-8 text-right" : "pl-9 text-left",
          ].join(" ")}
        >
          vs
        </div>

        <UpcomingTeamRow
          name={row.fixture.away}
          align={alignRight ? "right" : "left"}
        />
      </div>
    </Link>
  );
};

const RestTile = () => (
  <div className="grid min-h-[205px] place-items-center bg-background/10 p-6 text-center">
    <div>
      <div className="text-lg font-black text-primary sm:text-xl">
        Take Rest
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">
        Get Ready for next match
      </div>
    </div>
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

  // Only the next match day is shown. Up to four matches fill a 2 × 2 grid.
  const upcoming = useMemo(() => selectUpcomingMatchDay(rows, 4), [rows]);
  const showRestTile = upcoming.length > 0 && upcoming.length % 2 === 1;
  const hasLive = latest.some((row) => row.live);

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-4 overflow-hidden rounded-2xl border border-border/60 bg-secondary/25 p-3 backdrop-blur-sm sm:p-4">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/[0.07] via-background/40 to-secondary/30">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </span>
            <h2 className="min-w-0 truncate text-xl font-black sm:text-2xl">
              Upcoming Matches
            </h2>
          </div>

          <Link
            to="/fixtures?view=latest#upcoming-matches"
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary hover:underline sm:text-sm"
          >
            View all →
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 overflow-hidden border-t border-border/80 sm:grid-cols-2">
            {upcoming.map((row, index) => (
              <div
                key={row.fixture.id}
                className={[
                  "min-w-0",
                  index % 2 === 1 ? "sm:border-l sm:border-border/80" : "",
                  index >= 2 ? "border-t border-border/80" : "",
                ].join(" ")}
              >
                <UpcomingMatchTile row={row} now={now} index={index} />
              </div>
            ))}

            {showRestTile && (
              <div className="border-t border-border/80 sm:border-l sm:border-border/80">
                <RestTile />
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
            No upcoming match is currently scheduled.
          </div>
        )}
      </section>

      <section className="min-w-0">
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
      </section>

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
