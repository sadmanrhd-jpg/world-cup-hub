import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Radio, RefreshCw } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { FIXTURES, GROUPS, teamsInGroup } from "@/data/wc26";
import { teamKey, useLiveScores } from "@/hooks/useLiveScores";

type StandingRow = {
  name: string;
  slug: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  live: boolean;
};

type Score = {
  home: number;
  away: number;
  live: boolean;
};

const resolveScore = (
  fixture: (typeof FIXTURES)[number],
  liveScores: ReturnType<typeof useLiveScores>["data"],
  pairKey: (a: string, b: string) => string,
): Score | null => {
  const liveEvent = liveScores.get(pairKey(fixture.home, fixture.away));

  if (
    liveEvent &&
    (liveEvent.finished || liveEvent.live) &&
    liveEvent.homeScore !== null &&
    liveEvent.awayScore !== null
  ) {
    const sameOrder = teamKey(liveEvent.home) === teamKey(fixture.home);
    return {
      home: sameOrder ? liveEvent.homeScore : liveEvent.awayScore,
      away: sameOrder ? liveEvent.awayScore : liveEvent.homeScore,
      live: liveEvent.live,
    };
  }

  if (fixture.score) {
    return {
      home: fixture.score.home,
      away: fixture.score.away,
      live: false,
    };
  }

  return null;
};

const formatUpdatedTime = (date: Date | null) => {
  if (!date) return "Waiting for scores";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

const Table = () => {
  const {
    data: liveScores,
    loading,
    refreshing,
    lastUpdated,
    error,
    pairKey,
  } = useLiveScores(60_000);

  const standings = useMemo(() => {
    return GROUPS.map((group) => {
      const rows = new Map<string, StandingRow>();

      teamsInGroup(group).forEach((team) => {
        rows.set(team.name, {
          name: team.name,
          slug: team.slug,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          live: false,
        });
      });

      FIXTURES.filter(
        (fixture) => fixture.stage === "Group" && fixture.group === group,
      ).forEach((fixture) => {
        const score = resolveScore(fixture, liveScores, pairKey);
        if (!score) return;

        const home = rows.get(fixture.home);
        const away = rows.get(fixture.away);
        if (!home || !away) return;

        home.played += 1;
        away.played += 1;
        home.goalsFor += score.home;
        home.goalsAgainst += score.away;
        away.goalsFor += score.away;
        away.goalsAgainst += score.home;
        home.live = home.live || score.live;
        away.live = away.live || score.live;

        if (score.home > score.away) {
          home.won += 1;
          home.points += 3;
          away.lost += 1;
        } else if (score.home < score.away) {
          away.won += 1;
          away.points += 3;
          home.lost += 1;
        } else {
          home.drawn += 1;
          away.drawn += 1;
          home.points += 1;
          away.points += 1;
        }
      });

      const sorted = Array.from(rows.values())
        .map((row) => ({
          ...row,
          goalDifference: row.goalsFor - row.goalsAgainst,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) {
            return b.goalDifference - a.goalDifference;
          }
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
          return a.name.localeCompare(b.name);
        });

      return { group, rows: sorted };
    });
  }, [liveScores, pairKey]);

  const liveGroups = standings.filter(({ rows }) => rows.some((row) => row.live)).length;

  return (
    <div className="container py-12">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-primary">
            Group Stage
          </div>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Table</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Current standings for all 12 groups. Live and completed scores are
            included automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {liveGroups > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 font-semibold text-red-500">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              {liveGroups} live {liveGroups === 1 ? "group" : "groups"}
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-2 text-muted-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Updated {formatUpdatedTime(lastUpdated)}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-secondary/25 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Current top two
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Third place
        </span>
        <span>P = Played · W = Won · D = Drawn · L = Lost</span>
        <span>GD = Goal difference · Pts = Points</span>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Live score refresh is temporarily unavailable. The table is still
            using the results already stored in the fixture data.
          </div>
        </div>
      )}

      {loading && liveScores.size === 0 && (
        <div className="mb-6 text-sm text-muted-foreground">
          Loading the latest group results…
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {standings.map(({ group, rows }) => (
          <section
            key={group}
            className="card-elevated overflow-hidden rounded-2xl border border-border"
          >
            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Standings
                </div>
                <h2 className="mt-1 text-xl font-bold">Group {group}</h2>
              </div>
              {rows.some((row) => row.live) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-500">
                  <Radio className="h-3 w-3 animate-pulse" /> Live
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 px-3 py-3 text-center font-medium">#</th>
                    <th className="px-3 py-3 text-left font-medium">Team</th>
                    <th className="px-2 py-3 text-center font-medium">P</th>
                    <th className="px-2 py-3 text-center font-medium">W</th>
                    <th className="px-2 py-3 text-center font-medium">D</th>
                    <th className="px-2 py-3 text-center font-medium">L</th>
                    <th className="px-2 py-3 text-center font-medium">GF</th>
                    <th className="px-2 py-3 text-center font-medium">GA</th>
                    <th className="px-2 py-3 text-center font-medium">GD</th>
                    <th className="px-3 py-3 text-center font-bold text-foreground">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, index) => {
                    const position = index + 1;
                    const topTwo = position <= 2;
                    const third = position === 3;

                    return (
                      <tr
                        key={row.slug}
                        className={`transition-colors hover:bg-secondary/35 ${
                          topTwo
                            ? "bg-emerald-500/[0.045]"
                            : third
                              ? "bg-amber-400/[0.045]"
                              : ""
                        }`}
                      >
                        <td className="relative px-3 py-3 text-center font-bold">
                          <span
                            className={`absolute inset-y-0 left-0 w-1 ${
                              topTwo
                                ? "bg-emerald-500"
                                : third
                                  ? "bg-amber-400"
                                  : "bg-transparent"
                            }`}
                          />
                          {position}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/teams/${row.slug}`}
                            className="flex items-center gap-2.5 font-semibold hover:text-primary"
                          >
                            <TeamFlag
                              name={row.name}
                              slug={row.slug}
                              className="h-7 w-9 rounded object-cover"
                            />
                            <span className="min-w-0 truncate">{row.name}</span>
                            {row.live && (
                              <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
                                Live
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-2 py-3 text-center">{row.played}</td>
                        <td className="px-2 py-3 text-center">{row.won}</td>
                        <td className="px-2 py-3 text-center">{row.drawn}</td>
                        <td className="px-2 py-3 text-center">{row.lost}</td>
                        <td className="px-2 py-3 text-center">{row.goalsFor}</td>
                        <td className="px-2 py-3 text-center">{row.goalsAgainst}</td>
                        <td className="px-2 py-3 text-center font-medium">
                          {row.goalDifference > 0 ? "+" : ""}
                          {row.goalDifference}
                        </td>
                        <td className="px-3 py-3 text-center text-base font-black text-foreground">
                          {row.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Teams are ordered by points, goal difference, goals scored, then team
        name. Official FIFA tie-break procedures may require additional criteria.
      </p>
    </div>
  );
};

export default Table;
