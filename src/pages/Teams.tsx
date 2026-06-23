import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { TEAMS } from "@/data/wc26";
import TeamFlag from "@/components/TeamFlag";

const Teams = () => {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term) return TEAMS;
    return TEAMS.filter(
      (team) =>
        team.name.toLowerCase().includes(term) ||
        `group ${team.group}`.toLowerCase().includes(term) ||
        team.group.toLowerCase() === term,
    );
  }, [term]);

  return (
    <div className="container py-12">
      <div className="mb-6 sm:mb-10">
        <h1 className="text-4xl md:text-5xl font-bold">Teams</h1>
        <p className="text-muted-foreground mt-2">
          All 48 nations heading to the 2026 World Cup.
        </p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search teams or groups…"
          className="w-full bg-input border border-border rounded-full pl-11 pr-5 py-2.5 outline-none focus:border-primary transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">
          No teams match "{q}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((team, index) => (
            <Link
              key={team.slug}
              to={`/teams/${team.slug}`}
              className="card-elevated rounded-2xl border border-border p-3 sm:p-4 hover:border-primary/50 transition-all hover:-translate-y-1 text-center group"
            >
              <div className="mx-auto w-full max-w-[160px] aspect-square rounded-xl overflow-hidden border border-border/60 bg-secondary/30 shadow-sm">
                <TeamFlag
                  name={team.name}
                  slug={team.slug}
                  className="h-full w-full rounded-xl transition-transform duration-300 group-hover:scale-105"
                  eager={index < 12}
                />
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className="font-medium text-xs sm:text-sm truncate">
                  {team.name}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                Group {team.group}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;
