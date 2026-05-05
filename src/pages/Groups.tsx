import { Link } from "react-router-dom";
import { GROUPS, teamsInGroup } from "@/data/wc26";

const Groups = () => {
  return (
    <div className="container py-12">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold">Groups</h1>
        <p className="text-muted-foreground mt-2">All 12 groups of the FIFA World Cup 2026.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GROUPS.map((g) => (
          <div key={g} id={g} className="card-elevated rounded-2xl border border-border overflow-hidden scroll-mt-24">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <span className="text-sm uppercase tracking-widest text-muted-foreground">Group</span>
              <span className="font-display font-bold text-3xl gradient-gold-text">{g}</span>
            </div>
            <ul className="divide-y divide-border">
              {teamsInGroup(g).map((t) => (
                <li key={t.slug}>
                  <Link to={`/teams/${t.slug}`} className="flex items-center gap-3 px-6 py-3 hover:bg-secondary/50 transition-colors">
                    <span className="text-2xl">{t.flag}</span>
                    <span className="font-medium flex-1">{t.name}</span>
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
