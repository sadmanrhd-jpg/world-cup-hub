import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, RefreshCw, Trophy, WifiOff } from "lucide-react";
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

const SectionShell = ({
  title,
  link,
  live = false,
  children,
}: {
  title: string;
  link: string;
  live?: boolean;
  children: React.ReactNode;
}) => (
  <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/[0.07] via-background/40 to-secondary/30">
    <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary">
          {live ? (
            <>
              <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
            </>
          ) : title === "Upcoming Matches" ? (
            <Clock3 className="h-5 w-5" />
          ) : (
            <Trophy className="h-5 w-5" />
          )}
        </span>

        <h2 className="min-w-0 truncate text-xl font-black sm:text-2xl">
          {title}
        </h2>
      </div>

      <Link
        to={link}
        className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary hover:underline sm:text-sm"
      >
        View all →
      </Link>
    </div>

    {children}
  </section>
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
      className="group block min-h-[205px] min-w-0 overflow-hidden bg-background/15 p-4 transition-colors hover:bg-primary/[0.05] sm:p-5"
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

const ResultTeamRow = ({
  name,
  score,
  align = "left",
}: {
  name: string;
  score: number | string;
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
        <span className="grid h-10 min-w-10 shrink-0 place-items-center rounded-xl border border-primary/50 bg-primary/15 px-2.5 font-mono text-lg font-black tabular-nums text-primary shadow-sm shadow-primary/20 sm:h-11 sm:min-w-11 sm:text-xl">
          {score}
        </span>
        <span className="min-w-0 truncate text-right text-sm font-black sm:text-base">
          {name}
        </span>
        <MatchFlag name={name} />
      </>
    ) : (
      <>
        <MatchFlag name={name} />
        <span className="min-w-0 flex-1 truncate text-sm font-black sm:text-base">
          {name}
        </span>
        <span className="grid h-10 min-w-10 shrink-0 place-items-center rounded-xl border border-primary/50 bg-primary/15 px-2.5 font-mono text-lg font-black tabular-nums text-primary shadow-sm shadow-primary/20 sm:h-11 sm:min-w-11 sm:text-xl">
          {score}
        </span>
      </>
    )}
  </div>
);

const ResultMatchTile = ({
  row,
  shootout,
  index,
}: {
  row: MatchFeedRow;
  shootout?: PenaltyShootoutResult;
  index: number;
}) => {
  const alignRight = index % 2 === 1;
  const status = row.live ? row.badge ?? "LIVE" : shootout ? "PEN" : "FT";

  return (
    <Link
      to={`/matches/${row.fixture.id}`}
      aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} result`}
      className="group block min-h-[205px] min-w-0 overflow-hidden bg-background/15 p-4 transition-colors hover:bg-primary/[0.05] sm:p-5"
    >
      <div
        className={[
          "flex min-w-0 items-center justify-between gap-2 border-b border-border/70 pb-3",
          alignRight ? "flex-row-reverse text-right" : "text-left",
        ].join(" ")}
      >
        <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
          {stageLabel(row.fixture)}
        </span>
        <span
          className={[
            "shrink-0 text-sm font-black",
            row.live ? "text-red-500" : "text-primary",
          ].join(" ")}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <ResultTeamRow
          name={row.fixture.home}
          score={row.homeScore}
          align={alignRight ? "right" : "left"}
        />

        <div
          className={[
            "text-xs font-black uppercase tracking-[0.28em] text-primary/80",
            alignRight ? "pr-8 text-right" : "pl-9 text-left",
          ].join(" ")}
        >
          vs
        </div>

        <ResultTeamRow
          name={row.fixture.away}
          score={row.awayScore}
          align={alignRight ? "right" : "left"}
        />
      </div>

      {shootout && (
        <div className="mt-3 break-words rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[9px] font-bold leading-relaxed text-primary">
          {shootoutLabel(shootout)}
        </div>
      )}
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

const EmptyGridTile = () => (
  <div
    aria-hidden="true"
    className="hidden min-h-[205px] bg-background/[0.06] sm:block"
  />
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
    () =>
      hasFreshScoreFeed
        ? selectLatestMatches(rows).slice(0, 4)
        : [],
    [hasFreshScoreFeed, rows],
  );
  const upcoming = useMemo(() => selectUpcomingMatchDay(rows, 4), [rows]);

  const showRestTile = upcoming.length > 0 && upcoming.length % 2 === 1;
  const showResultSpacer = latest.length > 0 && latest.length % 2 === 1;
  const hasLive = latest.some((row) => row.live);

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-4 overflow-hidden rounded-2xl border border-border/60 bg-secondary/25 p-3 backdrop-blur-sm sm:p-4">
      <SectionShell
        title="Upcoming Matches"
        link="/fixtures?view=latest#upcoming-matches"
      >
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
      </SectionShell>

      <SectionShell
        title={hasLive ? "Live Matches" : "Latest Results"}
        live={hasLive}
        link="/fixtures?view=latest#latest-matches"
      >
        {latest.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 overflow-hidden border-t border-border/80 sm:grid-cols-2">
            {latest.map((row, index) => (
              <div
                key={row.fixture.id}
                className={[
                  "min-w-0",
                  index % 2 === 1 ? "sm:border-l sm:border-border/80" : "",
                  index >= 2 ? "border-t border-border/80" : "",
                ].join(" ")}
              >
                <ResultMatchTile
                  row={row}
                  index={index}
                  shootout={shootouts.get(
                    shootoutPairKey(row.fixture.home, row.fixture.away),
                  )}
                />
              </div>
            ))}

            {showResultSpacer && (
              <div className="border-t border-border/80 sm:border-l sm:border-border/80">
                <EmptyGridTile />
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-border/80">
            {!hasFreshScoreFeed && loading && (
              <div className="flex max-w-full items-start gap-2 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                <span className="min-w-0 break-words">
                  Loading the latest verified results…
                </span>
              </div>
            )}

            {!hasFreshScoreFeed && !loading && error && (
              <div className="flex max-w-full items-start gap-2 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="min-w-0 break-words">
                  Live scores are reconnecting. Old stored scores remain hidden.
                </span>
              </div>
            )}

            {hasFreshScoreFeed && !loading && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No completed or live match is available yet.
              </div>
            )}
          </div>
        )}
      </SectionShell>

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
