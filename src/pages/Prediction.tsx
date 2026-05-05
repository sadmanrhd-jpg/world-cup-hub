import { useEffect, useMemo, useState } from "react";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";

type Standings = Record<string, { first?: string; second?: string }>;
type Knockout = Record<string, string | undefined>; // key: stage-slot, value: team name

const STORAGE_KEY = "wc26-prediction-v1";

const flag = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.flag ?? "" : "");

type State = {
  standings: Standings;
  knockout: Knockout; // r16-0..7, qf-0..3, sf-0..1, final-0, champion
};

const empty: State = { standings: {}, knockout: {} };

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

  const setStanding = (g: string, slot: "first" | "second", value: string) => {
    setState((s) => ({
      ...s,
      standings: { ...s.standings, [g]: { ...s.standings[g], [slot]: value } },
    }));
  };

  const setKO = (key: string, value: string) => {
    setState((s) => ({ ...s, knockout: { ...s.knockout, [key]: value } }));
  };

  const reset = () => {
    if (confirm("Clear your entire prediction?")) setState(empty);
  };

  // Round of 16 candidates pulled from group winners + runners-up
  const advancers = useMemo(() => {
    const all: string[] = [];
    GROUPS.forEach((g) => {
      const s = state.standings[g];
      if (s?.first) all.push(s.first);
      if (s?.second) all.push(s.second);
    });
    return all;
  }, [state.standings]);

  const completed =
    GROUPS.every((g) => state.standings[g]?.first && state.standings[g]?.second);

  return (
    <div className="container py-12 space-y-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold">Your Prediction</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Pick your group winners, runners-up, and fill out the bracket all the way to the final.
            Saved automatically in your browser.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-full border border-border hover:bg-secondary transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Group standings picker */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Group Stage</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUPS.map((g) => {
            const teams = teamsInGroup(g);
            return (
              <div key={g} className="card-elevated rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Group</span>
                  <span className="font-display font-bold text-2xl gradient-text">{g}</span>
                </div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">1st</label>
                <select
                  value={state.standings[g]?.first ?? ""}
                  onChange={(e) => setStanding(g, "first", e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 mt-1 mb-3 outline-none focus:border-primary"
                >
                  <option value="">— pick —</option>
                  {teams.map((t) => (
                    <option key={t.slug} value={t.name}>{t.flag} {t.name}</option>
                  ))}
                </select>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">2nd</label>
                <select
                  value={state.standings[g]?.second ?? ""}
                  onChange={(e) => setStanding(g, "second", e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 mt-1 outline-none focus:border-primary"
                >
                  <option value="">— pick —</option>
                  {teams
                    .filter((t) => t.name !== state.standings[g]?.first)
                    .map((t) => (
                      <option key={t.slug} value={t.name}>{t.flag} {t.name}</option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bracket */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Knockout Bracket</h2>
        <p className="text-muted-foreground mb-6">
          {completed ? "Pick winners through to the final." : "Finish the group stage above to unlock all picks. Round of 16 fills with whoever you've chosen so far."}
        </p>

        <BracketRound
          title="Round of 16"
          slots={8}
          stage="r16"
          state={state}
          onPick={setKO}
          options={advancers}
        />
        <BracketRound
          title="Quarter-finals"
          slots={4}
          stage="qf"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 8 }, (_, i) => state.knockout[`r16-${i}`]).filter(Boolean) as string[]}
        />
        <BracketRound
          title="Semi-finals"
          slots={2}
          stage="sf"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 4 }, (_, i) => state.knockout[`qf-${i}`]).filter(Boolean) as string[]}
        />
        <BracketRound
          title="Final"
          slots={1}
          stage="final"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 2 }, (_, i) => state.knockout[`sf-${i}`]).filter(Boolean) as string[]}
        />

        {/* Champion card */}
        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Your Champion</h3>
          <div className="card-elevated rounded-2xl border border-primary/40 p-8 text-center glow">
            <div className="text-6xl">🏆</div>
            <div className="text-3xl md:text-5xl font-bold mt-3 gradient-gold-text min-h-[1.2em]">
              {state.knockout["final-0"]
                ? `${flag(state.knockout["final-0"])} ${state.knockout["final-0"]}`
                : "—"}
            </div>
            <div className="text-sm text-muted-foreground mt-3">
              New York New Jersey Stadium · July 19, 2026
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const BracketRound = ({
  title,
  slots,
  stage,
  state,
  onPick,
  options,
}: {
  title: string;
  slots: number;
  stage: string;
  state: State;
  onPick: (key: string, value: string) => void;
  options: string[];
}) => (
  <div className="mb-8">
    <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
    <div className={`grid gap-3 ${slots >= 8 ? "sm:grid-cols-2 lg:grid-cols-4" : slots === 4 ? "sm:grid-cols-2" : slots === 2 ? "sm:grid-cols-2" : "grid-cols-1 max-w-md mx-auto"}`}>
      {Array.from({ length: slots }).map((_, i) => {
        const key = `${stage}-${i}`;
        const value = state.knockout[key] ?? "";
        return (
          <div key={key} className="card-elevated rounded-xl border border-border p-3">
            <div className="text-xs text-muted-foreground mb-1">Match {i + 1}</div>
            <select
              value={value}
              onChange={(e) => onPick(key, e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">— pick winner —</option>
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
