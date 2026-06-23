import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { GROUPS, teamsInGroup } from "@/data/wc26";
import TeamFlag from "@/components/TeamFlag";

const Groups = () => {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    const all = GROUPS.map((group) => ({
      g: group as string,
      teams: teamsInGroup(group),
    }));
    if (!term) return all;
    return all
      .map(({ g, teams }) => {
        const groupMatches =
          `group ${g}`.toLowerCase().includes(term) ||
          g.toLowerCase() === term;
        const matched = teams.filter((team) =>
          team.name.toLowerCase().includes(term),
        );
        if (groupMatches) return { g, teams };
        if (matched.length) return { g, teams: matched };
        return null;
      })
      .filter(
        (entry): entry is {
          g: string;
          teams: ReturnType<typeof teamsInGroup>;
        } => !!entry,
      );
  }, [term]);

  return (
    <div className="container py-12">
      <div className="mb-6 sm:mb-10">
        <h1 className="text-4xl md:text-5xl font-bold">Groups</h1>
        <p className="text-muted-foreground mt-2">
          All 12 groups of the FIFA World Cup 2026.
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

      {visibleGroups.length === 0 && (
        <div className="text-center text-muted-foreground py-20">
          No groups or teams match "{q}".
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleGroups.map(({ g, teams }) => (
          <div
            key={g}
            id={g}
            className="card-elevated rounded-2xl border border-border overflow-hidden scroll-mt-24"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <span className="text-sm uppercase tracking-widest text-muted-foreground">
                Group
              </span>
              <span className="font-display font-bold text-3xl gradient-gold-text">
                {g}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {teams.map((team) => (
                <li key={team.slug}>
                  <Link
                    to={`/teams/${team.slug}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <TeamFlag
                      name={team.name}
                      slug={team.slug}
                      className="h-8 w-8 rounded-lg"
                    />
                    <span className="font-medium flex-1">{team.name}</span>
                    <span className="text-muted-foreground text-sm">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Groups;
