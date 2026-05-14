import { Link, useParams } from "react-router-dom";
import { FIXTURES, getTeam } from "@/data/wc26";
import { STADIUMS } from "@/data/stadiums";
import StadiumImage from "@/components/StadiumImage";
import Jersey from "@/components/Jersey";
import { getTeamInfo } from "@/data/teamInfo";
import { getManager } from "@/data/managers";
import { useFavoriteTeam } from "@/hooks/useFavoriteTeam";
import { Heart } from "lucide-react";

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
  const info = getTeamInfo(team.name);
  const { slug: favSlug, set: setFav } = useFavoriteTeam();
  const isFav = favSlug === team.slug;
  const teamShort = team.name.slice(0, 3).toUpperCase();

  return (
    <div className="container py-12 space-y-12">
      <div>
        <Link to="/teams" className="text-sm text-muted-foreground hover:text-foreground">← All teams</Link>
        <div className="mt-4 flex items-center gap-6 flex-wrap">
          <div className="text-7xl md:text-8xl">{team.flag}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Group {team.group}</div>
            <h1 className="text-4xl md:text-6xl font-bold">{team.name}</h1>
          </div>
          <button
            type="button"
            onClick={() => setFav(isFav ? null : team.slug)}
            className={[
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border font-semibold text-sm transition-all",
              isFav
                ? "bg-primary text-primary-foreground border-primary glow"
                : "border-border bg-secondary/50 hover:border-primary/50",
            ].join(" ")}
          >
            <Heart className={isFav ? "fill-current" : ""} />
            {isFav ? "Favourite team" : "Set as favourite"}
          </button>
        </div>
      </div>

      <p className="text-lg text-muted-foreground max-w-3xl">{info.blurb}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Titles</div>
          <div className="text-4xl font-display font-bold gradient-gold-text mt-1">{info.titles}</div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Appearances</div>
          <div className="text-4xl font-display font-bold mt-1">{info.appearances}</div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5 sm:col-span-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Best finish</div>
          <div className="font-semibold mt-1">{info.bestFinish}</div>
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

      <section className="grid md:grid-cols-2 gap-6">
        <div className="card-elevated rounded-2xl border border-primary/30 p-6">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">Head Coach</div>
          <div className="text-3xl md:text-4xl font-bold">{getManager(team.name)}</div>
          <div className="text-sm text-muted-foreground mt-1">Manager · {team.name}</div>
        </div>
        <div className="card-elevated rounded-2xl border border-primary/30 p-6">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">Highlight Player</div>
          <div className="text-3xl md:text-4xl font-bold">{info.highlightPlayer.name}</div>
          <div className="text-sm text-muted-foreground mt-1">{info.highlightPlayer.role}</div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Venues at WC 2026</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Set(teamFixtures.map((f) => f.stadium)))
            .map((venueName) => STADIUMS.find((s) => s.name === venueName))
            .filter((s): s is NonNullable<typeof s> => !!s)
            .map((s) => (
              <Link key={s.id} to={`/stadiums/${s.id}`} className="card-elevated rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all">
                <div className="aspect-[16/10] bg-secondary/40 overflow-hidden">
                  <StadiumImage wikiTitle={s.wikiTitle} alt={s.realName} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.city}</div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">Kits 2026</h2>
            <p className="text-sm text-muted-foreground">Match-day shirts. Tap to admire the design.</p>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Concept colours</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 card-elevated rounded-2xl border border-border p-8 bg-gradient-to-b from-secondary/30 to-transparent">
          <Jersey label="Home" description={team.kits.home} number={10} teamShort={teamShort} />
          <Jersey label="Away" description={team.kits.away} number={9} teamShort={teamShort} />
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
