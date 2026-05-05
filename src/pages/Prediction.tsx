import { GROUPS, PREDICTED_STANDINGS, PREDICTION, TEAMS } from "@/data/wc26";

const flag = (name: string) => TEAMS.find((t) => t.name === name)?.flag ?? "";

const Bracket = ({ matches }: { matches: string[] }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    {matches.map((m) => (
      <div key={m} className="card-elevated rounded-xl border border-border px-4 py-3 text-center">
        {m.split(" v ").map((t, i) => (
          <span key={t}>
            {i > 0 && <span className="text-muted-foreground mx-2">vs</span>}
            <span className="font-medium">{flag(t)} {t}</span>
          </span>
        ))}
      </div>
    ))}
  </div>
);

const Prediction = () => {
  return (
    <div className="container py-12 space-y-16">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold">Tournament Prediction</h1>
        <p className="text-muted-foreground mt-2">A speculative bracket from group stage to final. For fun, not for fortune.</p>
      </div>

      {/* Champion card */}
      <section className="relative overflow-hidden rounded-3xl border border-border card-elevated p-10 text-center">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at center, hsl(45 95% 55% / 0.4), transparent 60%)" }} />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Predicted Champion</div>
          <div className="text-7xl mt-3">🏆</div>
          <div className="text-5xl md:text-6xl font-bold mt-3 gradient-gold-text">{flag(PREDICTION.champion)} {PREDICTION.champion}</div>
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-xl mx-auto">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Runner-up</div>
              <div className="font-semibold mt-1">{flag(PREDICTION.runnerUp)} {PREDICTION.runnerUp}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">3rd</div>
              <div className="font-semibold mt-1">{flag(PREDICTION.third)} {PREDICTION.third}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">4th</div>
              <div className="font-semibold mt-1">{flag(PREDICTION.fourth)} {PREDICTION.fourth}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Group standings */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Group Stage Predictions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUPS.map((g) => {
            const s = PREDICTED_STANDINGS[g];
            const order = [s.first, s.second, s.third, s.fourth];
            return (
              <div key={g} className="card-elevated rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Group</span>
                  <span className="font-display font-bold text-2xl gradient-text">{g}</span>
                </div>
                <ul>
                  {order.map((name, i) => (
                    <li key={name} className={`flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0 ${i < 2 ? "" : "opacity-60"}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-accent text-accent-foreground" : i === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
                      <span className="text-lg">{flag(name)}</span>
                      <span className="font-medium">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Knockout bracket */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Knockout Predictions</h2>

        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Round of 16</h3>
        <Bracket matches={PREDICTION.r16} />

        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mt-8 mb-3">Quarter-finals</h3>
        <Bracket matches={PREDICTION.quarters} />

        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mt-8 mb-3">Semi-finals</h3>
        <Bracket matches={PREDICTION.semis} />

        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mt-8 mb-3">Final</h3>
        <div className="card-elevated rounded-2xl border border-primary/40 p-8 text-center glow">
          <div className="text-2xl md:text-3xl font-bold">
            {flag(PREDICTION.champion)} {PREDICTION.champion}
            <span className="text-muted-foreground mx-4">vs</span>
            {flag(PREDICTION.runnerUp)} {PREDICTION.runnerUp}
          </div>
          <div className="text-sm text-muted-foreground mt-3">New York New Jersey Stadium · July 19, 2026</div>
        </div>
      </section>
    </div>
  );
};

export default Prediction;
