import { Link, useParams } from "react-router-dom";
import { FIXTURES, getTeam } from "@/data/wc26";
import { STADIUMS } from "@/data/stadiums";
import StadiumImage from "@/components/StadiumImage";
import TeamFlag from "@/components/TeamFlag";
import { getTeamInfo } from "@/data/teamInfo";
import { getManager } from "@/data/managers";
import { useFavoriteTeam } from "@/hooks/useFavoriteTeam";
import { Heart } from "lucide-react";

const KIT_TYPES = [
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
] as const;

const TeamPage = () => {
  const { slug } = useParams();
  const team = slug ? getTeam(slug) : undefined;

  if (!team) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold">Team not found</h1>
        <Link to="/teams" className="text-primary mt-4 inline-block">
          ← Back to teams
        </Link>
      </div>
    );
  }

  const teamFixtures = FIXTURES.filter(
    (fixture) =>
      fixture.home === team.name || fixture.away === team.name,
  );
  const info = getTeamInfo(team.name);
  const { slug: favSlug, set: setFav } = useFavoriteTeam();
  const isFav = favSlug === team.slug;

  return (
    <div className="container py-12 space-y-12">
      <div>
        <Link
          to="/teams"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All teams
        </Link>
        <div className="mt-4 flex items-center gap-4 sm:gap-6 flex-wrap">
          <TeamFlag
            name={team.name}
            slug={team.slug}
            className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-2xl shadow-lg"
            eager
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Group {team.group}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold break-words">
              {team.name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setFav(isFav ? null : team.slug)}
            className={[
              "inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border font-semibold text-xs sm:text-sm transition-all",
              isFav
                ? "bg-primary text-primary-foreground border-primary glow"
                : "border-border bg-secondary/50 hover:border-primary/50",
            ].join(" ")}
          >
            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
            {isFav ? "Favourite team" : "Set as favourite"}
          </button>
        </div>
      </div>

      <p className="text-lg text-muted-foreground max-w-3xl">{info.blurb}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Titles
          </div>
          <div className="text-4xl font-display font-bold gradient-gold-text mt-1">
            {info.titles}
          </div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Appearances
          </div>
          <div className="text-4xl font-display font-bold mt-1">
            {info.appearances}
          </div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5 sm:col-span-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Best finish
          </div>
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
          <div className="text-xs uppercase tracking-widest text-primary mb-2">
            Head Coach
          </div>
          <div className="text-3xl md:text-4xl font-bold">
            {getManager(team.name)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Manager · {team.name}
          </div>
        </div>
        <div className="card-elevated rounded-2xl border border-primary/30 p-6">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">
            Highlight Player
          </div>
          <div className="text-3xl md:text-4xl font-bold">
            {info.highlightPlayer.name}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {info.highlightPlayer.role}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Venues at WC 2026</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Set(teamFixtures.map((fixture) => fixture.stadium)))
            .map((venueName) =>
              STADIUMS.find((stadium) => stadium.name === venueName),
            )
            .filter((stadium): stadium is NonNullable<typeof stadium> => !!stadium)
            .map((stadium) => (
              <Link
                key={stadium.id}
                to={`/stadiums/${stadium.id}`}
                className="card-elevated rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all"
              >
                <div className="aspect-[16/10] bg-secondary/40 overflow-hidden">
                  <StadiumImage
                    wikiTitle={stadium.wikiTitle}
                    alt={stadium.realName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="font-semibold">{stadium.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {stadium.city}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <div className="text-xs uppercase tracking-[0.3em] text-primary">
            Match Day
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">2026 Kits</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Home and away jerseys.
          </p>
        </div>

        <div className="relative rounded-3xl border border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/40 to-background" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative p-3 sm:p-6 md:p-10">
            <div className="mx-auto grid grid-cols-2 gap-3 sm:gap-5 max-w-3xl">
              {KIT_TYPES.map((kit) => (
                <figure
                  key={kit.key}
                  className="rounded-2xl border border-border/70 bg-background/70 backdrop-blur-sm p-2 sm:p-3 shadow-sm"
                >
                  <div className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-white">
                    <img
                      src={`/kits/${team.slug}-${kit.key}.webp`}
                      alt={`${team.name} 2026 ${kit.label.toLowerCase()} jersey`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption className="px-1 pt-2 pb-1 text-center">
                    <div className="text-xs sm:text-sm font-semibold">
                      {kit.label}
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Jersey
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Squad</h2>
        {team.squad === "TBA" ? (
          <div className="card-elevated rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-4xl mb-2">📋</div>
            <div className="font-display font-bold text-2xl gradient-gold-text">
              TBA
            </div>
            <p className="text-muted-foreground mt-2">
              Squad not announced yet. Check back closer to the tournament.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {team.squad.map((player) => (
              <li
                key={player}
                className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
              >
                {player}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Group Stage Fixtures</h2>
        <div className="space-y-2">
          {teamFixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="card-elevated rounded-xl border border-border px-5 py-3 flex items-center gap-4"
            >
              <div className="text-xs text-muted-foreground w-24">
                {new Date(fixture.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs font-mono text-muted-foreground w-14">
                {fixture.time}
              </div>
              <div className="flex-1 font-medium">
                {fixture.home}{" "}
                <span className="text-muted-foreground">vs</span>{" "}
                {fixture.away}
              </div>
              <div className="text-sm text-muted-foreground hidden sm:block">
                {fixture.stadium}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
