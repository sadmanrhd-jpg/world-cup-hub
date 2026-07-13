import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock3, RefreshCw, Trophy, WifiOff } from "lucide-react";
import { FIXTURES, getTeamByName } from "@/data/wc26";
import TeamFlag from "@/components/TeamFlag";
import MvpStatsTable from "@/components/MvpStatsTable";
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

const TEAM_SHORT_CODES: Record<string, string> = {
  "Mexico": "MEX",
  "South Africa": "RSA",
  "Korea Republic": "KOR",
  "Czechia": "CZE",
  "Canada": "CAN",
  "Bosnia and Herzegovina": "BIH",
  "Qatar": "QAT",
  "Switzerland": "SUI",
  "Haiti": "HAI",
  "Scotland": "SCO",
  "Brazil": "BRA",
  "Morocco": "MAR",
  "USA": "USA",
  "Paraguay": "PAR",
  "Australia": "AUS",
  "Türkiye": "TUR",
  "Côte d'Ivoire": "CIV",
  "Ecuador": "ECU",
  "Germany": "GER",
  "Curaçao": "CUW",
  "Netherlands": "NED",
  "Japan": "JPN",
  "Sweden": "SWE",
  "Tunisia": "TUN",
  "IR Iran": "IRN",
  "New Zealand": "NZL",
  "Belgium": "BEL",
  "Egypt": "EGY",
  "Saudi Arabia": "KSA",
  "Uruguay": "URU",
  "Spain": "ESP",
  "Cabo Verde": "CPV",
  "France": "FRA",
  "Senegal": "SEN",
  "Iraq": "IRQ",
  "Norway": "NOR",
  "Argentina": "ARG",
  "Algeria": "ALG",
  "Austria": "AUT",
  "Jordan": "JOR",
  "Portugal": "POR",
  "Congo DR": "COD",
  "Uzbekistan": "UZB",
  "Colombia": "COL",
  "Ghana": "GHA",
  "Panama": "PAN",
  "England": "ENG",
  "Croatia": "CRO",
};

const teamShortCode = (name: string) =>
  TEAM_SHORT_CODES[name] ??
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();

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
  <section className="min-w-0 overflow-hidden rounded-2xl border border-primary/65 bg-gradient-to-br from-primary/[0.09] via-background/45 to-secondary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.14),0_0_18px_hsl(var(--primary)/0.08)]">
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
  <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-lg border border-primary/55 bg-primary/15 px-1 font-mono text-sm font-black tabular-nums text-primary sm:h-10 sm:min-w-10 sm:rounded-xl sm:px-2 sm:text-lg">
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
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 rounded-xl border border-primary/35 bg-background/65 px-2 py-2.5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.06)] sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="min-w-0 break-words text-right text-[11px] font-extrabold leading-[1.05] sm:text-[15px] sm:leading-tight">
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
        <span className="min-w-0 break-words text-[11px] font-extrabold leading-[1.05] sm:text-[15px] sm:leading-tight">
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
      <div className="flex items-center justify-between gap-3 border-t border-primary/35 bg-background/25 px-3 py-2 sm:px-4">
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

const UpcomingCompactMatch = ({
  row,
  now,
}: {
  row: MatchFeedRow;
  now: Date;
}) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    aria-label={`Open ${row.fixture.home} versus ${row.fixture.away} match details`}
    className="group flex min-w-0 flex-col justify-center px-2.5 py-2.5 transition-colors hover:bg-primary/[0.06] sm:px-4 sm:py-3"
  >
    <div className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2">
      <MatchFlag name={row.fixture.home} compact />
      <span className="shrink-0 text-sm font-black tracking-wide sm:text-base">
        {teamShortCode(row.fixture.home)}
      </span>
      <span className="shrink-0 text-[10px] font-black text-primary sm:text-xs">
        -
      </span>
      <span className="shrink-0 text-sm font-black tracking-wide sm:text-base">
        {teamShortCode(row.fixture.away)}
      </span>
      <MatchFlag name={row.fixture.away} compact />
    </div>

    <div className="mt-1 flex min-w-0 items-center justify-center gap-1.5 text-[8px] font-semibold text-muted-foreground sm:text-[10px]">
      <span className="truncate">{relativeMatchDay(row.fixture, now)}</span>
      <span aria-hidden="true">·</span>
      <span className="shrink-0 font-mono">{row.fixture.time} BST</span>
    </div>
  </Link>
);

const UpcomingRestCell = () => (
  <div className="grid min-h-[58px] place-items-center px-2 py-2.5 text-center sm:min-h-[68px] sm:px-4 sm:py-3">
    <div>
      <div className="text-xs font-black text-primary sm:text-sm">
        Take Rest
      </div>
      <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px]">
        Get Ready for next match
      </div>
    </div>
  </div>
);

const UpcomingMatchRows = ({
  rows,
  now,
}: {
  rows: MatchFeedRow[];
  now: Date;
}) => {
  const pairs: Array<[MatchFeedRow, MatchFeedRow | null]> = [];

  for (let index = 0; index < rows.length; index += 2) {
    pairs.push([rows[index], rows[index + 1] ?? null]);
  }

  return (
    <div className="space-y-2 border-t border-primary/35 p-2 sm:space-y-3 sm:p-3">
      {pairs.map(([first, second]) => (
        <div
          key={`${first.fixture.id}-${second?.fixture.id ?? "rest"}`}
          className="grid min-w-0 grid-cols-2 overflow-hidden rounded-xl border border-primary/40 bg-background/55 shadow-[0_0_0_1px_hsl(var(--primary)/0.05)]"
        >
          <UpcomingCompactMatch row={first} now={now} />

          <div className="min-w-0 border-l border-primary/35">
            {second ? (
              <UpcomingCompactMatch row={second} now={now} />
            ) : (
              <UpcomingRestCell />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

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
  const hasLive = latest.some((row) => row.live);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start lg:gap-7">
      <div className="min-w-0 space-y-4 lg:space-y-7">
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
            <UpcomingMatchRows rows={upcoming} now={now} />
          ) : (
            <div className="border-t border-border/80 px-4 py-5 text-center text-sm text-muted-foreground">
              No upcoming match is currently scheduled.
            </div>
          )}
        </SectionShell>

        <div className="flex min-w-0 items-start justify-between gap-2 px-1 text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">
          <span className="min-w-0 break-words">
            {lastUpdated
              ? `Match feed updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Connecting to the live match feed…"}
          </span>

          {refreshing && !loading && (
            <RefreshCw className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
          )}
        </div>
      </div>

      <div className="min-w-0">
        <MvpStatsTable limit={5} compact />
      </div>

      {error && hasFreshScoreFeed && (
        <div className="flex max-w-full items-start gap-1.5 px-1 text-[9px] leading-relaxed text-muted-foreground sm:text-[10px] lg:col-span-2">
          <WifiOff className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 break-words">
            Last verified match data remains visible while the feed reconnects.
          </span>
        </div>
      )}
    </div>
  );
};

export default HomeMatchUpdates;
