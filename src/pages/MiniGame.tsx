import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Gamepad2, RefreshCw } from "lucide-react";
import PenaltyShootoutGame from "@/components/PenaltyShootoutGame";
import TeamFlag from "@/components/TeamFlag";
import { fixtureKickoff, getTeamByName } from "@/data/wc26";
import { useAnnexC } from "@/hooks/useAnnexC";
import { useLiveScores } from "@/hooks/useLiveScores";
import { enrichMatchFeed, relativeMatchDay, stageLabel } from "@/utils/matchFeed";
import { buildTournamentState } from "@/utils/tournament";

const MatchFlag = ({ name }: { name: string }) => {
  const team = getTeamByName(name);
  return (
    <TeamFlag
      name={name}
      slug={team?.slug}
      className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12"
    />
  );
};

const MiniGame = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMatch = Number(searchParams.get("match"));
  const [now, setNow] = useState(() => new Date());
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(
    Number.isFinite(requestedMatch) && requestedMatch > 0 ? requestedMatch : null,
  );
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const teamSectionRef = useRef<HTMLElement | null>(null);
  const gameSectionRef = useRef<HTMLElement | null>(null);

  const { data: liveScores, loading, refreshing, pairKey } = useLiveScores(60_000);
  const annex = useAnnexC();
  const tournament = useMemo(
    () => buildTournamentState(liveScores, pairKey, annex.options),
    [liveScores, pairKey, annex.options],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingMatches = useMemo(
    () =>
      enrichMatchFeed(tournament.fixtures, liveScores, now)
        .filter((row) => row.upcoming)
        .sort(
          (first, second) =>
            fixtureKickoff(first.fixture).getTime() -
            fixtureKickoff(second.fixture).getTime(),
        )
        .slice(0, 12),
    [tournament.fixtures, liveScores, now],
  );

  useEffect(() => {
    if (upcomingMatches.length === 0) return;
    const requestedExists = upcomingMatches.some(
      (row) => row.fixture.id === selectedMatchId,
    );
    if (requestedExists) return;

    const first = upcomingMatches[0].fixture.id;
    setSelectedMatchId(first);
    const next = new URLSearchParams(searchParams);
    next.set("match", String(first));
    setSearchParams(next, { replace: true });
  }, [upcomingMatches, selectedMatchId, searchParams, setSearchParams]);

  const selectedRow = upcomingMatches.find(
    (row) => row.fixture.id === selectedMatchId,
  );

  const selectMatch = (matchId: number) => {
    setSelectedMatchId(matchId);
    setSelectedTeam(null);
    const next = new URLSearchParams(searchParams);
    next.set("match", String(matchId));
    setSearchParams(next, { replace: true });

    window.requestAnimationFrame(() => {
      teamSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const opponent = selectedRow && selectedTeam
    ? selectedTeam === selectedRow.fixture.home
      ? selectedRow.fixture.away
      : selectedRow.fixture.home
    : null;

  useEffect(() => {
    if (!selectedTeam || !opponent) return;

    const frame = window.requestAnimationFrame(() => {
      gameSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedTeam, opponent, selectedMatchId]);

  return (
    <div className="container py-10 md:py-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
            <Gamepad2 className="h-4 w-4" /> Mini Game
          </div>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Penalty Challenge</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Choose an upcoming match, select your team and score as many penalties as possible in 30 seconds.
          </p>
        </div>
        {refreshing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Updating upcoming matches
          </div>
        )}
      </div>

      {upcomingMatches.length === 0 && loading && (
        <div className="mt-10 flex items-center justify-center gap-2 rounded-3xl border border-border p-12 text-sm text-muted-foreground card-elevated">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading upcoming matches
        </div>
      )}

      {upcomingMatches.length === 0 && !loading && (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No resolved upcoming match is currently available for the game.
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <>
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold sm:text-2xl">Choose a match</h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Next 12 resolved fixtures
              </span>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-3">
              {upcomingMatches.map((row) => {
                const active = row.fixture.id === selectedMatchId;
                return (
                  <button
                    key={row.fixture.id}
                    type="button"
                    onClick={() => selectMatch(row.fixture.id)}
                    className={`w-[280px] shrink-0 snap-start rounded-2xl border p-4 text-left transition-all sm:w-[330px] ${
                      active
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border card-elevated hover:border-primary/45"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                      <span>{stageLabel(row.fixture)}</span>
                      <span className="text-primary">
                        {relativeMatchDay(row.fixture, now)} · {row.fixture.time} BST
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                        <MatchFlag name={row.fixture.home} />
                        <span className="line-clamp-2 text-xs font-semibold">
                          {row.fixture.home}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">vs</span>
                      <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                        <MatchFlag name={row.fixture.away} />
                        <span className="line-clamp-2 text-xs font-semibold">
                          {row.fixture.away}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedRow && (
            <section ref={teamSectionRef} className="mt-7 scroll-mt-24 md:scroll-mt-28">
              <h2 className="text-xl font-bold sm:text-2xl">Choose your team</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The other team becomes the goalkeeper side.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[selectedRow.fixture.home, selectedRow.fixture.away].map((name) => {
                  const active = selectedTeam === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedTeam(name)}
                      className={`flex min-h-20 items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-lg"
                          : "border-border card-elevated hover:border-primary/45"
                      }`}
                    >
                      <MatchFlag name={name} />
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider opacity-70">
                          {active ? "Selected team" : "Play as"}
                        </div>
                        <div className="truncate text-lg font-black">{name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {selectedRow && selectedTeam && opponent && (
            <section ref={gameSectionRef} className="mt-8 scroll-mt-24 md:scroll-mt-28">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {selectedTeam} attacking
                  </div>
                  <h2 className="text-2xl font-black">vs {opponent}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
                >
                  Change team
                </button>
              </div>
              <PenaltyShootoutGame
                key={`${selectedRow.fixture.id}-${selectedTeam}`}
                selectedTeam={selectedTeam}
                opponent={opponent}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MiniGame;
