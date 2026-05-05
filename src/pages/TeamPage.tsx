import { Link, useParams } from "react-router-dom";
import { FIXTURES, getTeam } from "@/data/wc26";

const KitSwatch = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
};

const TeamPage = () => {
  const { slug } = useParams();
  const team = slug ? getTeam(slug) : undefined;

  if (!team) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold">Team not found</h1>
        <Link to="/teams" className="text-primary mt-4 inline-block">← Back to teams</Link>
      </div>
    );
  }

  const teamFixtures = FIXTURES.filter((f) => f.home === team.name || f.away === team.name);

  return (
    <div className="container py-12 space-y-12">
      <div>
        <Link to="/teams" className="text-sm text-muted-foreground hover:text-foreground">← All teams</Link>
        <div className="mt-4 flex items-center gap-6">
          <div className="text-7xl md:text-8xl">{team.flag}</div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Group {team.group}</div>
            <h1 className="text-4xl md:text-6xl font-bold">{team.name}</h1>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-elevated rounded-2xl border border-border p-6">
          <h2 className="text-xl font-bold mb-1">Base Camp</h2>
          <p className="text-muted-foreground">{team.baseCamp}</p>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-6">
          <h2 className="text-xl font-bold mb-1">Home Stadium</h2>
          <p className="text-muted-foreground">{team.homeStadium}</p>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Kits</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <KitSwatch label="Home" value={team.kits.home} />
          <KitSwatch label="Away" value={team.kits.away} />
          <KitSwatch label="Third" value={team.kits.third} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Squad</h2>
        {team.squad === "TBA" ? (
          <div className="card-elevated rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-4xl mb-2">📋</div>
            <div className="font-display font-bold text-2xl gradient-gold-text">TBA</div>
            <p className="text-muted-foreground mt-2">Squad not announced yet. Check back closer to the tournament.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {team.squad.map((p) => (
              <li key={p} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{p}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Group Stage Fixtures</h2>
        <div className="space-y-2">
          {teamFixtures.map((f) => (
            <div key={f.id} className="card-elevated rounded-xl border border-border px-5 py-3 flex items-center gap-4">
              <div className="text-xs text-muted-foreground w-24">{new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              <div className="flex-1 font-medium">{f.home} <span className="text-muted-foreground">vs</span> {f.away}</div>
              <div className="text-sm text-muted-foreground hidden sm:block">{f.stadium}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
