import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LiveMatches from "@/components/LiveMatches";
import { useAnnexC } from "@/hooks/useAnnexC";
import { teamKey, useLiveScores } from "@/hooks/useLiveScores";
import {
  Fixture,
  TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE,
  formatFixtureTime,
  formatFixtureDateKey,
  formatFixtureDateLong,
} from "@/data/wc26";
import { buildTournamentState } from "@/utils/tournament";

const STAGE_LABELS: Record<Fixture["stage"], string> = {
  Group: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3rd": "Third-place",
  Final: "Final",
};

const STAGES: Fixture["stage"][] = ["Group", "R32", "R16", "QF", "SF", "3rd", "Final"];
const TZ_STORAGE_KEY = "wc26.timezone";

const Fixtures = () => {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Fixture["stage"] | "All">("All");
  const [tz, setTz] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TIMEZONE;
    return localStorage.getItem(TZ_STORAGE_KEY) || DEFAULT_TIMEZONE;
  });

  const {
    data: liveScores,
    refreshing,
    error: liveScoreError,
    pairKey,
  } = useLiveScores(60_000);
  const annex = useAnnexC();
  const tournament = useMemo(
    () => buildTournamentState(liveScores, pairKey, annex.options),
    [liveScores, pairKey, annex.options],
  );

  useEffect(() => {
    localStorage.setItem(TZ_STORAGE_KEY, tz);
  }, [tz]);

  const tzShort = TIMEZONE_OPTIONS.find((option) => option.value === tz)?.short ?? tz;

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
      list.sort((a, b) => formatFixtureTime(a, tz).localeCompare(formatFixtureTime(b, tz))),
    );
    return Array.from(matches.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, tz]);

  return (
    <>
      <div className="container pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">Fixtures</h1>
            <p className="mt-2 text-muted-foreground">
              All 104 matches. Round-of-32 teams are filled automatically from the live standings and FIFA Annex C.
            </p>
          </div>
          <label className="flex flex-col gap-1.5 sm:items-end">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Time zone</span>
            <select
              value={tz}
              onChange={(event) => setTz(event.target.value)}
              className="min-w-[220px] rounded-full border border-border bg-input px-4 py-2 text-sm font-medium outline-none transition-colors focus:border-primary"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <LiveMatches showAllFixturesLink={false} />

      <div className="container pb-12">
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
                  {value === "All" ? "All" : STAGE_LABELS[value as Fixture["stage"]]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[10px] text-muted-foreground">
          {refreshing && <span>Refreshing scores…</span>}
          {liveScoreError && <span>Using stored scores while the live feed reconnects.</span>}
          {annex.loading && <span>Loading the official Annex C bracket matrix…</span>}
          {annex.error && <span>Some third-place bracket slots are waiting for Annex C.</span>}
        </div>

        {byDate.length === 0 && <div className="py-20 text-center text-muted-foreground">No matches found.</div>}

        <div className="space-y-8">
          {byDate.map(([dateKey, list]) => (
            <div key={dateKey}>
              <h3 className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
                {formatFixtureDateLong(list[0], tz)}
              </h3>
              <div className="space-y-2">
                {list.map((fixture) => {
                  const event = liveScores.get(pairKey(fixture.home, fixture.away));
                  const useEventScore = event != null && (event.live || event.finished);
                  const sameOrder = event != null && teamKey(event.home) === teamKey(fixture.home);
                  const eventHomeScore = useEventScore
                    ? sameOrder ? event?.homeScore : event?.awayScore
                    : null;
                  const eventAwayScore = useEventScore
                    ? sameOrder ? event?.awayScore : event?.homeScore
                    : null;
                  const homeScore = eventHomeScore ?? fixture.score?.home;
                  const awayScore = eventAwayScore ?? fixture.score?.away;
                  const hasScore = homeScore != null && awayScore != null;
                  const statusLabel = event?.live
                    ? event.progress ?? "LIVE"
                    : event?.finished ? "FT" : null;
                  const hasResolvedTeams = !fixture.label;

                  return (
                    <Link
                      key={fixture.id}
                      to={`/matches/${fixture.id}`}
                      aria-label={`View ${fixture.home} versus ${fixture.away} match details`}
                      className="group flex flex-wrap items-center gap-4 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 card-elevated"
                    >
                      <div className="w-12 font-mono text-xs text-muted-foreground">#{fixture.id}</div>
                      <div className="rounded-full bg-secondary px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                        {fixture.stage === "Group" ? `Group ${fixture.group}` : STAGE_LABELS[fixture.stage]}
                      </div>
                      <div className="w-20 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatFixtureTime(fixture, tz)} <span className="opacity-60">{tzShort}</span>
                      </div>
                      <div className="min-w-[200px] flex-1 font-semibold">
                        {hasResolvedTeams ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{fixture.home}</span>
                            <span className={`rounded-md px-2 py-0.5 font-mono font-bold tabular-nums ${event?.live ? "bg-primary text-primary-foreground" : hasScore ? "bg-secondary" : "font-normal text-muted-foreground"}`}>
                              {hasScore ? `${homeScore}-${awayScore}` : "vs"}
                            </span>
                            <span>{fixture.away}</span>
                            {fixture.provisional && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-500">PROVISIONAL</span>}
                            {statusLabel && <span className={`text-[10px] font-semibold ${event?.live ? "text-red-500" : "text-muted-foreground"}`}>{statusLabel}</span>}
                          </div>
                        ) : (
                          <div>
                            <span className="italic text-muted-foreground">{fixture.label}</span>
                            <div className="mt-1 text-xs font-normal text-muted-foreground">{fixture.home} vs {fixture.away}</div>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">📍 {fixture.stadium}</div>
                      <div className="text-xs font-semibold text-primary opacity-70 transition-opacity group-hover:opacity-100">Match info →</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Fixtures;
