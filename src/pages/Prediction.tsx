import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";

// 2026 format: 12 groups of 4. Top 2 + best 8 third-placed advance to R16 (32-team KO).
type Pos = "first" | "second" | "third";
type Standings = Record<string, Partial<Record<Pos, string>>>; // group -> pos -> team
type Knockout = Record<string, string | undefined>;

const STORAGE_KEY = "wc26-prediction-v3";
const MAX_THIRDS = 8;

const flag = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.flag ?? "" : "");
const groupOf = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.group : undefined);

type State = {
  standings: Standings;
  thirdsRank: string[]; // ordered list of team names, length up to 8
  knockout: Knockout;
};
const empty: State = { standings: {}, thirdsRank: [], knockout: {} };

type Slot =
  | { type: "rank"; group: string; pos: "first" | "second"; label: string }
  | { type: "third"; allowed: string[]; label: string };

const r = (g: string, pos: "first" | "second"): Slot => ({
  type: "rank", group: g, pos, label: `${pos === "first" ? "1" : "2"}${g}`,
});
const t3 = (allowed: string): Slot => ({
  type: "third", allowed: allowed.split(""), label: `3${allowed}`,
});

const R16: { left: Slot; right: Slot }[] = [
  { left: r("E", "first"),  right: t3("ABCDF") },
  { left: r("I", "first"),  right: t3("CDFGH") },
  { left: r("A", "second"), right: r("B", "second") },
  { left: r("F", "first"),  right: r("C", "second") },
  { left: r("K", "second"), right: r("L", "second") },
  { left: r("H", "first"),  right: r("J", "second") },
  { left: r("D", "first"),  right: t3("BEFIJ") },
  { left: r("G", "first"),  right: t3("AEHIJ") },
  { left: r("C", "first"),  right: r("F", "second") },
  { left: r("E", "second"), right: r("I", "second") },
  { left: r("A", "first"),  right: t3("CEFHI") },
  { left: r("L", "first"),  right: t3("EHIJK") },
  { left: r("J", "first"),  right: r("H", "second") },
  { left: r("D", "second"), right: r("G", "second") },
  { left: r("B", "first"),  right: t3("EFGIJ") },
  { left: r("K", "first"),  right: t3("DEIJL") },
];

// Greedy allocate ranked thirds to R16 third-slots.
// Iterate ranked teams in order; assign each to the first unfilled third-slot
// whose `allowed` groups include the team's group.
const allocateThirds = (rank: string[]): Record<number, string> => {
  const thirdSlots = R16
    .map((m, i) => ({ i, slot: m.right }))
    .filter((x) => x.slot.type === "third") as { i: number; slot: Extract<Slot, { type: "third" }> }[];
  const filled: Record<number, string> = {};
  const usedSlots = new Set<number>();
  for (const team of rank) {
    const g = groupOf(team);
    if (!g) continue;
    const target = thirdSlots.find((x) => !usedSlots.has(x.i) && x.slot.allowed.includes(g));
    if (target) {
      filled[target.i] = team;
      usedSlots.add(target.i);
    }
  }
  return filled;
};

const Prediction = () => {
  const [state, setState] = useState<State>(empty);
  const championRef = useRef<HTMLDivElement>(null);
  const lastChampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const thirdTeams = useMemo(
    () =>
      GROUPS.map((g) => state.standings[g]?.third).filter(Boolean) as string[],
    [state.standings]
  );
  const thirdsCount = thirdTeams.length;

  // Keep thirdsRank in sync with current third picks
  useEffect(() => {
    setState((s) => {
      const set = new Set(thirdTeams);
      const cleaned = s.thirdsRank.filter((t) => set.has(t));
      const missing = thirdTeams.filter((t) => !cleaned.includes(t));
      const next = [...cleaned, ...missing];
      if (next.length === s.thirdsRank.length && next.every((v, i) => v === s.thirdsRank[i])) return s;
      return { ...s, thirdsRank: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thirdTeams.join("|")]);

  const thirdSlotAssignments = useMemo(
    () => allocateThirds(state.thirdsRank),
    [state.thirdsRank]
  );

  const pickPos = (group: string, pos: Pos, team: string) => {
    setState((s) => {
      const cur = { ...(s.standings[group] ?? {}) };
      (Object.keys(cur) as Pos[]).forEach((k) => {
        if (cur[k] === team) delete cur[k];
      });
      if (cur[pos] === team) delete cur[pos];
      else cur[pos] = team;
      return { ...s, standings: { ...s.standings, [group]: cur } };
    });
  };

  const setKO = (key: string, value: string) => {
    setState((s) => ({ ...s, knockout: { ...s.knockout, [key]: value } }));
  };

  const setThirdRank = (team: string, newRank: number) => {
    setState((s) => {
      const arr = s.thirdsRank.filter((t) => t !== team);
      const clamped = Math.max(1, Math.min(newRank, arr.length + 1));
      arr.splice(clamped - 1, 0, team);
      return { ...s, thirdsRank: arr };
    });
  };

  const reset = () => {
    if (confirm("Clear your entire prediction?")) setState(empty);
  };

  const resolveSlot = (slot: Slot, r16Index: number, side: "L" | "R"): string | undefined => {
    if (slot.type === "rank") return state.standings[slot.group]?.[slot.pos];
    if (side === "R") return thirdSlotAssignments[r16Index];
    return undefined;
  };

  // Confetti when champion is set / changes
  useEffect(() => {
    const champ = state.knockout["champ-0"];
    if (champ && champ !== lastChampRef.current) {
      lastChampRef.current = champ;
      const fire = (origin: { x: number; y: number }) =>
        confetti({
          particleCount: 120,
          spread: 80,
          startVelocity: 45,
          origin,
          colors: ["#FFD700", "#FF4D4D", "#3DDC84", "#1E90FF", "#FF8C00"],
        });
      fire({ x: 0.2, y: 0.6 });
      fire({ x: 0.5, y: 0.5 });
      fire({ x: 0.8, y: 0.6 });
      setTimeout(() => fire({ x: 0.5, y: 0.4 }), 250);
      setTimeout(() => fire({ x: 0.3, y: 0.5 }), 500);
      setTimeout(() => fire({ x: 0.7, y: 0.5 }), 500);
    } else if (!champ) {
      lastChampRef.current = undefined;
    }
  }, [state.knockout]);

  return (
    <div className="container py-12 space-y-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold">Your Prediction</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            48 teams · 12 groups · top 2 plus best 8 third-placed advance to a 32-team knockout.
            Pick 1st, 2nd and 3rd in each group, rank your thirds, then fill out the bracket.
            Saved in your browser.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-full border border-border hover:bg-secondary transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Group stage pickers */}
      <section>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
          <h2 className="text-2xl md:text-3xl font-bold">Group Stage</h2>
          <div className="text-sm text-muted-foreground">
            Third-place picks:{" "}
            <span className={`font-bold ${thirdsCount >= MAX_THIRDS ? "text-primary" : ""}`}>
              {thirdsCount}/{MAX_THIRDS}
            </span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUPS.map((g) => {
            const teams = teamsInGroup(g);
            const picks = state.standings[g] ?? {};
            const thirdLocked = thirdsCount >= MAX_THIRDS && !picks.third;
            return (
              <div key={g} className="card-elevated rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Group</span>
                  <span className="font-display font-bold text-2xl gradient-text">{g}</span>
                </div>
                <div className="space-y-2">
                  {teams.map((team) => {
                    const myPos = (Object.keys(picks) as Pos[]).find((p) => picks[p] === team.name);
                    return (
                      <div key={team.slug} className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-xl">{team.flag}</span>
                        <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium truncate">{team.name}</span>
                        {(["first", "second", "third"] as Pos[]).map((pos) => {
                          const active = myPos === pos;
                          const taken = picks[pos] && picks[pos] !== team.name;
                          const disabled =
                            (pos === "third" && thirdLocked && !active) || !!taken;
                          const label = pos === "first" ? "1" : pos === "second" ? "2" : "3";
                          return (
                            <button
                              key={pos}
                              type="button"
                              disabled={disabled}
                              onClick={() => pickPos(g, pos, team.name)}
                              className={[
                                "w-8 h-8 rounded-full text-xs font-bold border transition-all",
                                active
                                  ? "bg-primary text-primary-foreground border-primary glow"
                                  : "border-border bg-secondary/40 hover:border-primary/50",
                                disabled ? "opacity-30 cursor-not-allowed" : "",
                              ].join(" ")}
                              title={
                                pos === "third" && thirdLocked && !active
                                  ? "8 third-place teams already selected"
                                  : `Pick as ${pos}`
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Thirds ranking */}
      {thirdsCount > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Rank Your Third-Place Teams</h2>
          <p className="text-muted-foreground mb-6">
            Order them 1–8 by how strongly they finished. They auto-fill the bracket's 3rd-place slots based on the official allowed groups.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {state.thirdsRank.map((name, i) => {
              const g = groupOf(name);
              const total = state.thirdsRank.length;
              return (
                <div
                  key={name}
                  className="card-elevated rounded-xl border border-border p-3 flex items-center gap-3"
                >
                  <select
                    value={i + 1}
                    onChange={(e) => setThirdRank(name, Number(e.target.value))}
                    className="w-14 bg-input border border-border rounded px-2 py-1 text-sm font-bold text-primary outline-none focus:border-primary"
                    aria-label="Rank"
                  >
                    {Array.from({ length: total }, (_, k) => k + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {flag(name)} {name}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Group {g}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Knockout bracket */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Round of 16</h2>
        <p className="text-muted-foreground mb-6">
          Slots fill from your group standings and ranked thirds. Tap a team to pick the winner.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {R16.map((m, i) => {
            const key = `r16-${i}`;
            const left = resolveSlot(m.left, i, "L");
            const right = resolveSlot(m.right, i, "R");
            const winner = state.knockout[key];
            return (
              <div key={key} className="card-elevated rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground mb-2">Match {i + 1}</div>
                <SlotRow
                  slot={m.left}
                  resolved={left}
                  isWinner={winner === left && !!left}
                  onPickWinner={() => left && setKO(key, left)}
                />
                <div className="text-center text-xs text-muted-foreground my-1">vs</div>
                <SlotRow
                  slot={m.right}
                  resolved={right}
                  isWinner={winner === right && !!right}
                  onPickWinner={() => right && setKO(key, right)}
                />
              </div>
            );
          })}
        </div>

        <BracketRound
          title="Quarter-finals"
          slots={8}
          stage="qf"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 16 }, (_, i) => state.knockout[`r16-${i}`]).filter(Boolean) as string[]}
          cols={4}
        />
        <BracketRound
          title="Semi-finals"
          slots={4}
          stage="sf"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 8 }, (_, i) => state.knockout[`qf-${i}`]).filter(Boolean) as string[]}
          cols={4}
        />
        <BracketRound
          title="Final"
          slots={2}
          stage="final"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 4 }, (_, i) => state.knockout[`sf-${i}`]).filter(Boolean) as string[]}
          cols={2}
        />
        <BracketRound
          title="Champion"
          slots={1}
          stage="champ"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 2 }, (_, i) => state.knockout[`final-${i}`]).filter(Boolean) as string[]}
          cols={1}
        />

        <div className="mt-10" ref={championRef}>
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Your Champion</h3>
          <div className="card-elevated rounded-2xl border border-primary/40 p-8 text-center glow">
            <div className={`text-6xl ${state.knockout["champ-0"] ? "animate-bounce" : ""}`}>🏆</div>
            <div className="text-3xl md:text-5xl font-bold mt-3 gradient-gold-text min-h-[1.2em]">
              {state.knockout["champ-0"]
                ? `${flag(state.knockout["champ-0"])} ${state.knockout["champ-0"]}`
                : "—"}
            </div>
            <div className="text-sm text-muted-foreground mt-3">
              MetLife Stadium · July 19, 2026
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const SlotRow = ({
  slot,
  resolved,
  isWinner,
  onPickWinner,
}: {
  slot: Slot;
  resolved?: string;
  isWinner: boolean;
  onPickWinner: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onPickWinner}
      disabled={!resolved}
      className={`w-full flex items-center gap-2 rounded-lg p-2 border text-left transition-colors ${isWinner ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-10">{slot.label}</span>
      <span className="flex-1 text-sm font-medium">
        {resolved ? `${flag(resolved)} ${resolved}` : <span className="text-muted-foreground">— pending —</span>}
      </span>
      {isWinner && <span className="text-xs text-primary">winner</span>}
    </button>
  );
};

const BracketRound = ({
  title, slots, stage, state, onPick, options, cols,
}: {
  title: string;
  slots: number;
  stage: string;
  state: State;
  onPick: (key: string, value: string) => void;
  options: string[];
  cols: number;
}) => {
  // Prevent reusing a team across multiple slots in the same round
  const usedInRound = new Set(
    Array.from({ length: slots }, (_, i) => state.knockout[`${stage}-${i}`]).filter(Boolean) as string[]
  );
  const unique = Array.from(new Set(options));
  return (
    <div className="mt-8">
      <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      <div
        className={`grid gap-3 ${
          cols >= 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          : cols === 2 ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1"
        }`}
      >
        {Array.from({ length: slots }).map((_, i) => {
          const key = `${stage}-${i}`;
          const value = state.knockout[key];
          // Pair options into matches: slot i pulls from options[i*2] and options[i*2+1]
          const a = options[i * 2];
          const b = options[i * 2 + 1];
          const candidates = title === "Champion" ? unique : [a, b].filter(Boolean) as string[];
          return (
            <div key={key} className="card-elevated rounded-xl border border-border p-3">
              <div className="text-xs text-muted-foreground mb-2">
                {title === "Champion" ? "Winner" : `Match ${i + 1}`}
              </div>
              {candidates.length === 0 ? (
                <div className="text-xs text-muted-foreground italic px-2 py-3">— pending previous round —</div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((name) => {
                    const active = value === name;
                    const taken = usedInRound.has(name) && !active;
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={taken}
                        onClick={() => onPick(key, active ? "" : name)}
                        className={[
                          "w-full flex items-center gap-2 rounded-lg p-2 border text-left transition-colors text-sm font-medium",
                          active
                            ? "border-primary bg-primary/10 glow"
                            : "border-border/50 hover:border-primary/40 bg-secondary/30",
                          taken ? "opacity-40 cursor-not-allowed" : "",
                        ].join(" ")}
                        title={taken ? "Already picked in this round" : undefined}
                      >
                        <span className="text-lg">{flag(name)}</span>
                        <span className="flex-1 truncate">{name}</span>
                        {active && <span className="text-[10px] text-primary uppercase tracking-widest">winner</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Prediction;
