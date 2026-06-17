import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { TEAMS } from "@/data/wc26";

const Teams = () => {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term) return TEAMS;
    return TEAMS.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        `group ${t.group}`.toLowerCase().includes(term) ||
        t.group.toLowerCase() === term,
    );
  }, [term]);

  return (
    <div className="container py-12">
      <div className="mb-6 sm:mb-10">
        <h1 className="text-4xl md:text-5xl font-bold">Teams</h1>
        <p className="text-muted-foreground mt-2">All 48 nations heading to the 2026 World Cup.</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search teams or groups…"
          className="w-full bg-input border border-border rounded-full pl-11 pr-5 py-2.5 outline-none focus:border-primary transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">No teams match "{q}".</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((t) => (
            <Link
              key={t.slug}
              to={`/teams/${t.slug}`}
              className="card-elevated rounded-2xl border border-border p-3 sm:p-4 hover:border-primary/50 transition-all hover:-translate-y-1 text-center"
            >
              <div className="mx-auto w-full max-w-[200px] aspect-square rounded-xl overflow-hidden bg-white border border-border/60">
                <img
                  src={`/kits/${t.slug}.png`}
                  alt={`${t.name} home and away kits`}
                  width={200}
                  height={200}
                  loading="lazy"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className="text-base sm:text-lg">{t.flag}</span>
                <span className="font-medium text-xs sm:text-sm truncate">{t.name}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Group {t.group}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;
