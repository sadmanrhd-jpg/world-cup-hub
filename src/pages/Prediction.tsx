import { useEffect, useMemo, useState } from "react";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";

// 2026 format: 12 groups of 4. Top 2 + best 8 third-placed advance to R16 (32-team KO).
type Pos = "first" | "second" | "third";
type Standings = Record<string, Partial<Record<Pos, string>>>; // group -> pos -> team name
type Knockout = Record<string, string | undefined>;

const STORAGE_KEY = "wc26-prediction-v2";
const MAX_THIRDS = 8;

const flag = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.flag ?? "" : "");
const groupOf = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.group : undefined);

type State = { standings: Standings; knockout: Knockout };
const empty: State = { standings: {}, knockout: {} };

// R16 bracket per official FIFA 2026 bracket image.
// Each match has left & right slot. A slot is either:
//   { type: "rank", group: "E", pos: "first" | "second" }
//   { type: "third", allowed: ["A","B","C","D","F"] }   // 8 groups eligible
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
  // Right side of bracket
  { left: r("C", "first"),  right: r("F", "second") },
  { left: r("E", "second"), right: r("I", "second") },
  { left: r("A", "first"),  right: t3("CEFHI") },
  { left: r("L", "first"),  right: t3("EHIJK") },
  { left: r("J", "first"),  right: r("H", "second") },
  { left: r("D", "second"), right: r("G", "second") },
  { left: r("B", "first"),  right: t3("EFGIJ") },
  { left: r("K", "first"),  right: t3("DEIJL") },
];

const Prediction = () => {
  const [state, setState] = useState<State>(empty);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Count how many groups currently have a 3rd-place pick
  const thirdsCount = useMemo(
    () => GROUPS.filter((g) => state.standings[g]?.third).length,
    [state.standings]
  );

  const pickPos = (group: string, pos: Pos, team: string) => {
    setState((s) => {
      const cur = { ...(s.standings[group] ?? {}) };
      // If team already has another position in this group, clear it
      (Object.keys(cur) as Pos[]).forEach((k) => {
        if (cur[k] === team) delete cur[k];
      });
      // Toggle off if same pos clicked again
      if (cur[pos] === team) {
        delete cur[pos];
      } else {
        cur[pos] = team;
      }
      return { ...s, standings: { ...s.standings, [group]: cur } };
    });
  };

  const setKO = (key: string, value: string) => {
    setState((s) => ({ ...s, knockout: { ...s.knockout, [key]: value } }));
  };

  const reset = () => {
    if (confirm("Clear your entire prediction?")) setState(empty);
  };

  // Resolve each R16 slot to a team based on standings + chosen thirds
  const thirdsByGroup: Record<string, string> = {};
  GROUPS.forEach((g) => {
    const t = state.standings[g]?.third;
    if (t) thirdsByGroup[g] = t;
  });

  const resolveSlot = (slot: Slot, key: string): string | undefined => {
    if (slot.type === "rank") return state.standings[slot.group]?.[slot.pos];
    // For 3rd-place slots, user picks which of their qualifying thirds fills the slot
    return state.knockout[`assign-${key}`];
  };

  return (
    <div className="container py-12 space-y-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold">Your Prediction</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            48 teams · 12 groups · top 2 plus best 8 third-placed advance to a 32-team knockout.
            Pick 1st, 2nd and 3rd in each group, then fill out the bracket. Saved in your browser.
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
                      <div key={team.slug} className="flex items-center gap-2">
                        <span className="text-xl">{team.flag}</span>
                        <span className="flex-1 text-sm font-medium truncate">{team.name}</span>
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

      {/* Knockout bracket */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Round of 16</h2>
        <p className="text-muted-foreground mb-6">
          Slots fill from your group standings. For 3rd-place slots, choose from your qualifying thirds.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {R16.map((m, i) => {
            const key = `r16-${i}`;
            const left = resolveSlot(m.left, `${key}-L`);
            const right = resolveSlot(m.right, `${key}-R`);
            const winner = state.knockout[key];
            return (
              <div key={key} className="card-elevated rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground mb-2">Match {i + 1}</div>
                <SlotRow
                  slot={m.left}
                  resolved={left}
                  assignKey={`${key}-L`}
                  state={state}
                  thirdsByGroup={thirdsByGroup}
                  onAssign={setKO}
                  isWinner={winner === left && !!left}
                  onPickWinner={() => left && setKO(key, left)}
                />
                <div className="text-center text-xs text-muted-foreground my-1">vs</div>
                <SlotRow
                  slot={m.right}
                  resolved={right}
                  assignKey={`${key}-R`}
                  state={state}
                  thirdsByGroup={thirdsByGroup}
                  onAssign={setKO}
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

        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Your Champion</h3>
          <div className="card-elevated rounded-2xl border border-primary/40 p-8 text-center glow">
            <div className="text-6xl">🏆</div>
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
  assignKey,
  state,
  thirdsByGroup,
  onAssign,
  isWinner,
  onPickWinner,
}: {
  slot: Slot;
  resolved?: string;
  assignKey: string;
  state: State;
  thirdsByGroup: Record<string, string>;
  onAssign: (key: string, value: string) => void;
  isWinner: boolean;
  onPickWinner: () => void;
}) => {
  if (slot.type === "third") {
    const candidates = slot.allowed
      .map((g) => thirdsByGroup[g])
      .filter(Boolean) as string[];
    return (
      <div className={`flex items-center gap-2 rounded-lg p-2 border ${isWinner ? "border-primary bg-primary/10" : "border-border/50"}`}>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-10">{slot.label}</span>
        <select
          value={state.knockout[`assign-${assignKey}`] ?? ""}
          onChange={(e) => onAssign(`assign-${assignKey}`, e.target.value)}
          className="flex-1 bg-input border border-border rounded px-2 py-1 text-sm outline-none focus:border-primary"
        >
          <option value="">— 3rd from {slot.allowed.join("/")} —</option>
          {candidates.map((name) => (
            <option key={name} value={name}>{flag(name)} {name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onPickWinner}
          disabled={!resolved}
          className={`text-xs px-2 py-1 rounded border ${isWinner ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"} disabled:opacity-30`}
        >
          ✓
        </button>
      </div>
    );
  }
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
}) => (
  <div className="mt-8">
    <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(cols, slots)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: slots }).map((_, i) => {
        const key = `${stage}-${i}`;
        const value = state.knockout[key] ?? "";
        return (
          <div key={key} className="card-elevated rounded-xl border border-border p-3">
            <div className="text-xs text-muted-foreground mb-1">
              {title === "Champion" ? "Winner" : `Match ${i + 1}`}
            </div>
            <select
              value={value}
              onChange={(e) => onPick(key, e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">— pick —</option>
              {Array.from(new Set(options)).map((name) => (
                <option key={name} value={name}>
                  {flag(name)} {name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  </div>
);

export default Prediction;
