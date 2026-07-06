import { useEffect, useMemo, useState, type ReactNode } from "react";
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

const MatchFlag = ({
  name,
  compact = false,
}: {
  name: string;
  compact?: boolean;
}) => {
  const team = getTeamByName(name);

  return (
    <TeamFlag
      name={name}
      slug={team?.slug}
      className={
        compact
          ? "h-5 w-5 shrink-0 rounded sm:h-7 sm:w-7"
          : "h-7 w-7 shrink-0 rounded-md sm:h-8 sm:w-8"
      }
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
  children: ReactNode;
}) => (
  <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/[0.07] via-background/40 to-secondary/30">
    <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary sm:h-9 sm:w-9">
          {live ? (
            <>
              <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
            </>
          ) : title === "Upcoming Matches" ? (
            <Clock3 className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </span>

        <h2 className="min-w-0 truncate text-lg font-black leading-tight sm:text-2xl">
          {title}
        </h2>
      </div>

      <Link
        to={link}
        className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-primary hover:underline sm:text-sm"
      >
        View all →
      </Link>
    </div>

    {children}
  </section>
);

const ScoreBox = ({ value }: { value: number | string }) => (
  <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-lg border border-primary/50 bg-primary/15 px-1.5 font-mono text-base font-black tabular-nums text-primary sm:h-10 sm:min-w-10 sm:rounded-xl sm:px-2 sm:text-lg">
    {value}
  </span>
);

const LatestResultBar = ({
  row,
  shootout,
}: {
  row: MatchFeedRow;
  shootout?: PenaltyShootoutResult;
}) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} result`}
    className="group block min-w-0 border-t border-border/65 bg-background/10 px-2.5 py-2 transition-colors hover:bg-primary/[0.05] sm:px-4 sm:py-3"
  >
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 rounded-xl border border-border/45 bg-background/60 px-2 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="min-w-0 break-words text-right text-[10px] font-extrabold leading-[1.05] sm:text-base sm:leading-tight">
          {row.fixture.home}
        </span>
        <MatchFlag name={row.fixture.home} compact />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <ScoreBox value={row.homeScore} />
        <span className="text-[8px] font-black uppercase tracking-wide text-muted-foreground sm:text-[10px]">
          vs
        </span>
        <ScoreBox value={row.awayScore} />
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <MatchFlag name={row.fixture.away} compact />
        <span className="min-w-0 break-words text-[10px] font-extrabold leading-[1.05] sm:text-base sm:leading-tight">
          {row.fixture.away}
        </span>
      </div>
    </div>

    {shootout && (
      <div className="mt-1.5 rounded-md bg-primary/10 px-2 py-1 text-center text-[9px] font-bold leading-relaxed text-primary sm:text-[11px]">
        {shootoutLabel(shootout)}
      </div>
    )}
  </Link>
);

const LatestStageGroup = ({
  label,
  rows,
  shootouts,
}: {
  label: string;
  rows: MatchFeedRow[];
  shootouts: ReturnType<typeof usePenaltyShootouts>;
}) => {
  const hasLive = rows.some((row) => row.live);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 border-t border-border/80 bg-background/20 px-3 py-2 sm:px-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
          {label}
        </span>
        <span
          className={[
            "text-[10px] font-black sm:text-xs",
            hasLive ? "text-red-500" : "text-primary",
          ].join(" ")}
        >
          {hasLive ? "LIVE" : "FT"}
        </span>
      </div>

      {rows.map((row) => (
        <LatestResultBar
          key={row.fixture.id}
          row={row}
          shootout={shootouts.get(
            shootoutPairKey(row.fixture.home, row.fixture.away),
          )}
        />
      ))}
    </div>
  );
};

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
        <span className="min-w-0 truncate text-right text-sm font-black leading-tight sm:text-lg">
          {name}
        </span>
        <MatchFlag name={name} />
      </>
    ) : (
      <>
        <MatchFlag name={name} />
        <span className="min-w-0 truncate text-sm font-black leading-tight sm:text-lg">
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
      className="group block min-h-[160px] min-w-0 overflow-hidden bg-background/15 p-3 transition-colors hover:bg-primary/[0.05] sm:min-h-[205px] sm:p-5"
    >
      <div
        className={[
          "border-b border-border/70 pb-2",
          alignRight ? "text-right" : "text-left",
        ].join(" ")}
      >
        <div className="text-xs font-black text-primary sm:text-sm">
          {relativeMatchDay(row.fixture, now)}
        </div>
        <div className="mt-0.5 font-mono text-[9px] text-muted-foreground sm:text-[11px]">
          {row.fixture.time} BST
        </div>
      </div>

      <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
        <UpcomingTeamRow
          name={row.fixture.home}
          align={alignRight ? "right" : "left"}
        />

        <div
          className={[
            "text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.28em]",
            alignRight ? "pr-7 text-right sm:pr-8" : "pl-8 text-left sm:pl-9",
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
  <div className="grid min-h-[160px] place-items-center bg-background/10 p-3 text-center sm:min-h-[205px] sm:p-6">
    <div>
      <div className="text-base font-black text-primary sm:text-xl">
        Take Rest
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.1em] text-muted-foreground sm:text-sm sm:tracking-[0.16em]">
        Get Ready for next match
      </div>
    </div>
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

  // Keep the landing page compact: show only the two newest live/completed matches.
  const latest = useMemo(
    () =>
      hasFreshScoreFeed
        ? selectLatestMatches(rows).slice(0, 2)
        : [],
    [hasFreshScoreFeed, rows],
  );

  const latestGroups = useMemo(() => {
    const groups = new Map<string, MatchFeedRow[]>();

    latest.forEach((row) => {
      const label = stageLabel(row.fixture);
      const existing = groups.get(label);

      if (existing) {
        existing.push(row);
      } else {
        groups.set(label, [row]);
      }
    });

    return Array.from(groups.entries()).map(([label, groupedRows]) => ({
      label,
      rows: groupedRows,
    }));
  }, [latest]);

  const upcoming = useMemo(() => selectUpcomingMatchDay(rows, 4), [rows]);
  const showRestTile = upcoming.length > 0 && upcoming.length % 2 === 1;
  const hasLive = latest.some((row) => row.live);

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-3 overflow-hidden rounded-2xl border border-border/60 bg-secondary/25 p-3 backdrop-blur-sm sm:space-y-4 sm:p-4">
      <SectionShell
        title={hasLive ? "Live Matches" : "Latest Results"}
        live={hasLive}
        link="/fixtures?view=latest#latest-matches"
      >
        {latestGroups.length > 0 ? (
          <div className="min-w-0">
            {latestGroups.map((group) => (
              <LatestStageGroup
                key={group.label}
                label={group.label}
                rows={group.rows}
                shootouts={shootouts}
              />
            ))}
          </div>
        ) : (
          <div className="border-t border-border/80">
            {!hasFreshScoreFeed && loading && (
              <div className="flex max-w-full items-start gap-2 px-4 py-5 text-sm leading-relaxed text-muted-foreground">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                <span className="min-w-0 break-words">
                  Loading the latest verified results…
                </span>
              </div>
            )}

            {!hasFreshScoreFeed && !loading && error && (
              <div className="flex max-w-full items-start gap-2 px-4 py-5 text-sm leading-relaxed text-muted-foreground">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="min-w-0 break-words">
                  Live scores are reconnecting. Old stored scores remain hidden.
                </span>
              </div>
            )}

            {hasFreshScoreFeed && !loading && (
              <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                No completed or live match is available yet.
              </div>
            )}
          </div>
        )}
      </SectionShell>

      <SectionShell
        title="Upcoming Matches"
        link="/fixtures?view=latest#upcoming-matches"
      >
        {upcoming.length > 0 ? (
          <div className="grid min-w-0 grid-cols-2 overflow-hidden border-t border-border/80">
            {upcoming.map((row, index) => (
              <div
                key={row.fixture.id}
                className={[
                  "min-w-0",
                  index % 2 === 1 ? "border-l border-border/80" : "",
                  index >= 2 ? "border-t border-border/80" : "",
                ].join(" ")}
              >
                <UpcomingMatchTile row={row} now={now} index={index} />
              </div>
            ))}

            {showRestTile && (
              <div className="border-l border-t border-border/80">
                <RestTile />
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-border/80 px-4 py-5 text-center text-sm text-muted-foreground">
            No upcoming match is currently scheduled.
          </div>
        )}
      </SectionShell>

      <div className="flex min-w-0 items-start justify-between gap-2 text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">
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
        <div className="flex max-w-full items-start gap-1.5 text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">
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
