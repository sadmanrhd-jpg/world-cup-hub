import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock3, Gamepad2, Radio, RefreshCw } from "lucide-react";
import { useAnnexC } from "@/hooks/useAnnexC";
import { teamKey, useLiveScores } from "@/hooks/useLiveScores";
import {
  shootoutLabel,
  shootoutPairKey,
  usePenaltyShootouts,
} from "@/hooks/usePenaltyShootouts";
import type { PenaltyShootoutResult } from "@/hooks/usePenaltyShootouts";
import TeamFlag from "@/components/TeamFlag";
import {
  Fixture,
  TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE,
  formatFixtureTime,
  formatFixtureDateKey,
  formatFixtureDateLong,
  getTeamByName,
} from "@/data/wc26";
import { buildTournamentState } from "@/utils/tournament";
import {
  enrichMatchFeed,
  MatchFeedRow,
  relativeMatchDay,
  selectLatestMatches,
  selectUpcomingMatchDay,
  stageLabel,
} from "@/utils/matchFeed";

const STAGE_LABELS: Record<Fixture["stage"], string> = {
  Group: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3rd": "Third-place",
  Final: "Final",
};

const STAGES: Fixture["stage"][] = [
  "Group",
  "R32",
  "R16",
  "QF",
  "SF",
  "3rd",
  "Final",
];
const TZ_STORAGE_KEY = "wc26.timezone";

type ViewMode = "latest" | "all";

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

const LatestResultCard = ({
  row,
  shootout,
}: {
  row: MatchFeedRow;
  shootout?: PenaltyShootoutResult;
}) => (
  <Link
    to={`/matches/${row.fixture.id}`}
    className="group rounded-2xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 card-elevated"
  >
    <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span>{stageLabel(row.fixture)}</span>
      <span className={row.live ? "font-bold text-red-500" : shootout ? "font-bold text-primary" : ""}>
        {row.live ? row.badge ?? "LIVE" : shootout ? "PEN" : "FT"}
      </span>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex min-w-0 flex-col items-center gap-2 text-center">
        <MatchFlag name={row.fixture.home} />
        <span className="line-clamp-2 text-xs font-semibold sm:text-sm">
          {row.fixture.home}
        </span>
      </div>
      <div
        className={`rounded-xl px-3 py-2 font-mono text-xl font-black tabular-nums sm:text-2xl ${
          row.live
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-secondary/40"
        }`}
      >
        {row.homeScore} - {row.awayScore}
      </div>
      <div className="flex min-w-0 flex-col items-center gap-2 text-center">
        <MatchFlag name={row.fixture.away} />
        <span className="line-clamp-2 text-xs font-semibold sm:text-sm">
          {row.fixture.away}
        </span>
      </div>
    </div>
    {shootout && (
      <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-center text-[11px] font-bold text-primary">
        {shootoutLabel(shootout)}
      </div>
    )}
    <div className="mt-3 text-center text-[10px] font-semibold text-primary opacity-80 transition-opacity group-hover:opacity-100">
      Open match details →
    </div>
  </Link>
);

const UpcomingFixtureCard = ({
  row,
  now,
}: {
  row: MatchFeedRow;
  now: Date;
}) => (
  <div className="rounded-xl border border-border p-4 transition-all hover:border-primary/50 card-elevated">
    <Link
      to={`/matches/${row.fixture.id}`}
      className="group flex items-center gap-3"
      aria-label={`View ${row.fixture.home} versus ${row.fixture.away} match details`}
    >
      <div className="w-20 shrink-0">
        <div className="text-xs font-semibold text-primary">
          {relativeMatchDay(row.fixture, now)}
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          {row.fixture.time} BST
        </div>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-xs font-semibold sm:text-sm">
            {row.fixture.home}
          </span>
          <MatchFlag name={row.fixture.home} />
        </div>
        <span className="text-[10px] uppercase text-muted-foreground">vs</span>
        <div className="flex min-w-0 items-center gap-2">
          <MatchFlag name={row.fixture.away} />
          <span className="truncate text-xs font-semibold sm:text-sm">
            {row.fixture.away}
          </span>
        </div>
      </div>
    </Link>
    <Link
      to={`/mini-game?match=${row.fixture.id}`}
      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
    >
      <Gamepad2 className="h-4 w-4" /> Play Penalty Challenge
    </Link>
  </div>
);

const Fixtures = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: ViewMode = searchParams.get("view") === "latest" ? "latest" : "all";
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Fixture["stage"] | "All">("All");
  const [tz, setTz] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TIMEZONE;
    return localStorage.getItem(TZ_STORAGE_KEY) || DEFAULT_TIMEZONE;
  });
  const [now, setNow] = useState(() => new Date());

  const {
    data: liveScores,
    refreshing,
    error: liveScoreError,
    pairKey,
  } = useLiveScores(60_000);
  const shootouts = usePenaltyShootouts(60_000);
  const annex = useAnnexC();
  const tournament = useMemo(
    () => buildTournamentState(liveScores, pairKey, annex.options),
    [liveScores, pairKey, annex.options],
  );

  useEffect(() => {
    localStorage.setItem(TZ_STORAGE_KEY, tz);
  }, [tz]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const tzShort =
    TIMEZONE_OPTIONS.find((option) => option.value === tz)?.short ?? tz;

  const feedRows = useMemo(
    () => enrichMatchFeed(tournament.fixtures, liveScores, now),
    [tournament.fixtures, liveScores, now],
  );
  const latestRows = useMemo(() => selectLatestMatches(feedRows), [feedRows]);
  const upcomingRows = useMemo(
    () => selectUpcomingMatchDay(feedRows),
    [feedRows],
  );
  const latestHasLive = latestRows.some((row) => row.live);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tournament.fixtures.filter((fixture) => {
      if (stage !== "All" && fixture.stage !== stage) return false;
      if (!term) return true;
      return (
        fixture.home.toLowerCase().includes(term) ||
        fixture.away.toLowerCase().includes(term) ||
        fixture.stadium.toLowerCase().includes(term) ||
        (fixture.label?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [q, stage, tournament.fixtures]);

  const byDate = useMemo(() => {
    const matches = new Map<string, typeof filtered>();
    filtered.forEach((fixture) => {
      const key = formatFixtureDateKey(fixture, tz);
      if (!matches.has(key)) matches.set(key, []);
      matches.get(key)!.push(fixture);
    });
    matches.forEach((list) =>
      list.sort((a, b) =>
        formatFixtureTime(a, tz).localeCompare(formatFixtureTime(b, tz)),
      ),
    );
    return Array.from(matches.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [filtered, tz]);

  const setView = (next: ViewMode) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "latest") nextParams.set("view", "latest");
    else nextParams.delete("view");
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="container pb-12 pt-10 md:pt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Fixtures</h1>
          <p className="mt-2 text-muted-foreground">
            Latest results, the next match day and all 104 tournament fixtures.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 sm:items-end">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Time zone
          </span>
          <select
            value={tz}
            onChange={(event) => setTz(event.target.value)}
            className="min-w-[220px] rounded-full border border-border bg-input px-4 py-2 text-sm font-medium outline-none transition-colors focus:border-primary"
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-7 inline-flex rounded-full border border-border bg-secondary/40 p-1">
        <button
          type="button"
          onClick={() => setView("latest")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            view === "latest"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Latest Matches
        </button>
        <button
          type="button"
          onClick={() => setView("all")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            view === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Fixtures
        </button>
      </div>

      {view === "latest" ? (
        <div className="mt-8 space-y-10">
          <section id="latest-matches" className="scroll-mt-28">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {latestHasLive ? (
                    <Radio className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-primary" />
                  )}
                  <h2 className="text-2xl font-bold md:text-3xl">
                    {latestHasLive ? "Live Matches" : "Latest Results"}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only the current tournament stage is shown. Older-stage results
                  are excluded.
                </p>
              </div>
              {refreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {latestRows.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {latestRows.map((row) => (
                  <LatestResultCard
                    key={row.fixture.id}
                    row={row}
                    shootout={shootouts.get(
                      shootoutPairKey(row.fixture.home, row.fixture.away),
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No completed or live match is available yet.
              </div>
            )}
          </section>

          <section id="upcoming-matches" className="scroll-mt-28">
            <div className="mb-4">
              <h2 className="text-2xl font-bold md:text-3xl">Upcoming Matches</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Matches from the next available match day.
              </p>
            </div>
            {upcomingRows.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {upcomingRows.map((row) => (
                  <UpcomingFixtureCard key={row.fixture.id} row={row} now={now} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No upcoming match is currently scheduled.
              </div>
            )}
          </section>

          {(liveScoreError || annex.error) && (
            <div className="text-xs text-muted-foreground">
              Stored match information is shown while one of the live services reconnects.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <div className="sticky top-24 z-10 mb-8 rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-xl card-elevated">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search by team or stadium…"
                className="flex-1 rounded-full border border-border bg-input px-5 py-2.5 outline-none transition-colors focus:border-primary"
              />
              <div className="flex gap-1 overflow-x-auto">
                {(["All", ...STAGES] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setStage(value as Fixture["stage"] | "All")}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all ${
                      stage === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {value === "All"
                      ? "All"
                      : STAGE_LABELS[value as Fixture["stage"]]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[10px] text-muted-foreground">
            {refreshing && <span>Refreshing scores…</span>}
            {liveScoreError && (
              <span>Using stored scores while the live feed reconnects.</span>
            )}
            {annex.loading && (
              <span>Loading the official Annex C bracket matrix…</span>
            )}
            {annex.error && (
              <span>Some third-place bracket slots are waiting for Annex C.</span>
            )}
          </div>

          {byDate.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              No matches found.
            </div>
          )}

          <div className="space-y-8">
            {byDate.map(([dateKey, list]) => (
              <div key={dateKey}>
                <h3 className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
                  {formatFixtureDateLong(list[0], tz)}
                </h3>
                <div className="space-y-2">
                  {list.map((fixture) => {
                    const event = liveScores.get(
                      pairKey(fixture.home, fixture.away),
                    );
                    const shootout = shootouts.get(
                      shootoutPairKey(fixture.home, fixture.away),
                    );
                    const useEventScore =
                      event != null && (event.live || event.finished);
                    const sameOrder =
                      event != null &&
                      teamKey(event.home) === teamKey(fixture.home);
                    const eventHomeScore = useEventScore
                      ? sameOrder
                        ? event?.homeScore
                        : event?.awayScore
                      : null;
                    const eventAwayScore = useEventScore
                      ? sameOrder
                        ? event?.awayScore
                        : event?.homeScore
                      : null;
                    const homeScore = eventHomeScore ?? fixture.score?.home;
                    const awayScore = eventAwayScore ?? fixture.score?.away;
                    const hasScore = homeScore != null && awayScore != null;
                    const statusLabel = event?.live
                      ? event.progress ?? "LIVE"
                      : shootout
                        ? "PEN"
                        : event?.finished
                          ? "FT"
                          : null;
                    const hasResolvedTeams = !fixture.label;

                    return (
                      <Link
                        key={fixture.id}
                        to={`/matches/${fixture.id}`}
                        aria-label={`View ${fixture.home} versus ${fixture.away} match details`}
                        className="group flex flex-wrap items-center gap-4 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 card-elevated"
                      >
                        <div className="w-12 font-mono text-xs text-muted-foreground">
                          #{fixture.id}
                        </div>
                        <div className="rounded-full bg-secondary px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                          {fixture.stage === "Group"
                            ? `Group ${fixture.group}`
                            : STAGE_LABELS[fixture.stage]}
                        </div>
                        <div className="w-20 whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {formatFixtureTime(fixture, tz)}{" "}
                          <span className="opacity-60">{tzShort}</span>
                        </div>
                        <div className="min-w-[200px] flex-1 font-semibold">
                          {hasResolvedTeams ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{fixture.home}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 font-mono font-bold tabular-nums ${
                                  event?.live
                                    ? "bg-primary text-primary-foreground"
                                    : hasScore
                                      ? "bg-secondary"
                                      : "font-normal text-muted-foreground"
                                }`}
                              >
                                {hasScore ? `${homeScore}-${awayScore}` : "vs"}
                              </span>
                              <span>{fixture.away}</span>
                              {fixture.provisional && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-500">
                                  PROVISIONAL
                                </span>
                              )}
                              {statusLabel && (
                                <span
                                  className={`text-[10px] font-semibold ${
                                    event?.live
                                      ? "text-red-500"
                                      : shootout
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {statusLabel}
                                </span>
                              )}
                              {shootout && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  {shootoutLabel(shootout)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="italic text-muted-foreground">
                                {fixture.label}
                              </span>
                              <div className="mt-1 text-xs font-normal text-muted-foreground">
                                {fixture.home} vs {fixture.away}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          📍 {fixture.stadium}
                        </div>
                        <div className="text-xs font-semibold text-primary opacity-70 transition-opacity group-hover:opacity-100">
                          Match info →
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Fixtures;
