import { useMemo, useState } from "react";
import { FIXTURES, Fixture } from "@/data/wc26";

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

const Fixtures = () => {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Fixture["stage"] | "All">("All");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return FIXTURES.filter((f) => {
      if (stage !== "All" && f.stage !== stage) return false;
      if (!term) return true;
      return (
        f.home.toLowerCase().includes(term) ||
        f.away.toLowerCase().includes(term) ||
        f.stadium.toLowerCase().includes(term) ||
        (f.label?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [q, stage]);

  // group by date
  const byDate = useMemo(() => {
    const m = new Map<string, Fixture[]>();
    filtered.forEach((f) => {
      if (!m.has(f.date)) m.set(f.date, []);
      m.get(f.date)!.push(f);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold">Fixtures</h1>
        <p className="text-muted-foreground mt-2">All 104 matches of the 2026 World Cup.</p>
      </div>

      <div className="card-elevated rounded-2xl border border-border p-4 sticky top-24 z-10 mb-8 backdrop-blur-xl bg-background/80">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by team or stadium…"
            className="flex-1 bg-input border border-border rounded-full px-5 py-2.5 outline-none focus:border-primary transition-colors"
          />
          <div className="flex gap-1 overflow-x-auto">
            {(["All", ...STAGES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStage(s as Fixture["stage"] | "All")}
                className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  stage === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "All" ? "All" : STAGE_LABELS[s as Fixture["stage"]]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {byDate.length === 0 && (
        <div className="text-center text-muted-foreground py-20">No matches found.</div>
      )}

      <div className="space-y-8">
        {byDate.map(([date, list]) => (
          <div key={date}>
            <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
              {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h3>
            <div className="space-y-2">
              {list.map((f) => (
                <div key={f.id} className="card-elevated rounded-xl border border-border p-4 flex flex-wrap items-center gap-4">
                  <div className="text-xs font-mono text-muted-foreground w-12">#{f.id}</div>
                  <div className="text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                    {f.stage === "Group" ? `Group ${f.group}` : STAGE_LABELS[f.stage]}
                  </div>
                  <div className="flex-1 min-w-[200px] font-semibold">
                    {f.label ? (
                      <span className="text-muted-foreground italic">{f.label}</span>
                    ) : (
                      <>
                        {f.home} <span className="text-muted-foreground font-normal">vs</span> {f.away}
                      </>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">📍 {f.stadium}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Fixtures;
