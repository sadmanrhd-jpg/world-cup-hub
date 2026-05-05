import { Link } from "react-router-dom";
import { TEAMS } from "@/data/wc26";

const Teams = () => {
  return (
    <div className="container py-12">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold">Teams</h1>
        <p className="text-muted-foreground mt-2">All 48 nations heading to the 2026 World Cup.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {TEAMS.map((t) => (
          <Link
            key={t.slug}
            to={`/teams/${t.slug}`}
            className="card-elevated rounded-2xl border border-border p-5 hover:border-primary/50 transition-all hover:-translate-y-1 text-center"
          >
            <div className="text-4xl mb-2">{t.flag}</div>
            <div className="font-medium text-sm">{t.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Group {t.group}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Teams;
