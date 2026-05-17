import { Link } from "react-router-dom";
import { FIXTURES, GROUPS, TEAMS, getTeam, teamsInGroup } from "@/data/wc26";
import { useFavoriteTeam } from "@/hooks/useFavoriteTeam";
import { getTeamInfo } from "@/data/teamInfo";
import { getManager } from "@/data/managers";
import { Heart, Star, Trophy, Bell } from "lucide-react";

const FavoriteSpotlight = () => {
  const { slug } = useFavoriteTeam();
  const team = slug ? getTeam(slug) : null;

  if (!team) {
    return (
      <section className="container py-12">
        <div className="card-elevated rounded-3xl border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold mt-3">Pick your favourite team</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Choose a nation and we'll keep their upcoming matches, history and star player right here on the home page.
          </p>
          <Link
            to="/teams"
            className="inline-block mt-5 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold glow hover:scale-105 transition-transform"
          >
            Browse all 48 teams
          </Link>
        </div>
      </section>
    );
  }

  const info = getTeamInfo(team.name);
  const upcoming = FIXTURES.filter((f) => f.home === team.name || f.away === team.name).slice(0, 5);

  return (
    <section className="container py-12">
      <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-widest text-primary">
        <Star className="h-3 w-3 fill-current" /> Your team
      </div>
      <div className="card-elevated rounded-3xl border border-primary/30 overflow-hidden">
        <div className="grid lg:grid-cols-3">
          <div className="p-5 sm:p-8 lg:p-10 bg-gradient-to-br from-primary/15 via-transparent to-transparent">
            <div className="text-7xl">{team.flag}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4">Group {team.group}</div>
            <h2 className="text-4xl md:text-5xl font-bold mt-1">{team.name}</h2>
            <p className="text-muted-foreground mt-3">{info.blurb}</p>
            <Link to={`/teams/${team.slug}`} className="inline-block mt-5 text-sm text-primary hover:underline">
              View full team page →
            </Link>
          </div>

          <div className="p-5 sm:p-8 lg:p-10 border-t lg:border-t-0 lg:border-l border-border space-y-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">World Cup history</div>
              <div className="flex items-baseline gap-3 mt-1">
                <Trophy className="text-primary" />
                <span className="text-3xl font-display font-bold gradient-gold-text">{info.titles}</span>
                <span className="text-sm text-muted-foreground">titles · {info.appearances} apps</span>
              </div>
              <div className="text-sm mt-2"><span className="text-muted-foreground">Best:</span> {info.bestFinish}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Head coach</div>
              <div className="text-lg font-semibold mt-1">{getManager(team.name)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Highlight player</div>
              <div className="text-2xl font-bold mt-1">{info.highlightPlayer.name}</div>
              <div className="text-xs text-muted-foreground">{info.highlightPlayer.role}</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-primary border-t border-border pt-4">
              <Bell className="h-3.5 w-3.5" /> You'll get important updates for {team.name}
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10 border-t lg:border-t-0 lg:border-l border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Upcoming matches</div>
            <ul className="space-y-2">
              {upcoming.map((f) => {
                const opp = f.home === team.name ? f.away : f.home;
                const oppFlag = (() => {
                  const allTeams = (window as never) && undefined;
                  return "";
                })();
                return (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
                    <div className="text-xs text-muted-foreground w-16 shrink-0">
                      {new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className="flex-1 text-sm font-medium truncate">
                      vs {opp}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">
                      {f.stage === "Group" ? `Group ${f.group}` : f.stage}
                    </div>
                  </li>
                );
              })}
              {upcoming.length === 0 && (
                <li className="text-sm text-muted-foreground">No upcoming matches scheduled.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="container relative py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              June 11 – July 19, 2026
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1] tracking-tight">
              The world's <br />
              biggest <span className="gradient-text">stage</span>.
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
              48 nations. 104 matches. 16 host cities across Canada, Mexico and the USA.
              Your home for everything FIFA World Cup 2026™.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/fixtures" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold glow hover:scale-105 transition-transform">
                View Fixtures
              </Link>
              <Link to="/prediction" className="px-5 py-2.5 rounded-full border border-border bg-secondary/50 hover:bg-secondary text-sm font-semibold transition-colors">
                Make Your Prediction
              </Link>
            </div>
          </div>

          {/* Compact interactive flag grid */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-border/60 bg-secondary/30 backdrop-blur-sm p-3 sm:p-4 md:p-5 overflow-hidden">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                {TEAMS.map((t, i) => (
                  <Link
                    key={t.slug}
                    to={`/teams/${t.slug}`}
                    title={t.name}
                    style={{ animationDelay: `${i * 20}ms`, animationFillMode: "both" }}
                    className="group aspect-square rounded-lg border border-border/50 bg-background/60 flex items-center justify-center hover:border-primary hover:scale-110 hover:-translate-y-0.5 hover:z-10 transition-all duration-200 animate-fade-in shadow-sm hover:shadow-lg hover:shadow-primary/25"
                  >
                    <span className="text-base sm:text-xl md:text-2xl transition-transform duration-200 group-hover:scale-110">
                      {t.flag}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Tap any flag to explore the nation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Favorite team spotlight */}
      <FavoriteSpotlight />

      {/* Stats */}
      <section className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: "48", l: "Nations" },
            { n: "104", l: "Matches" },
            { n: "16", l: "Host Cities" },
            { n: "39", l: "Days" },
          ].map((s) => (
            <div key={s.l} className="card-elevated rounded-2xl p-6 border border-border">
              <div className="text-4xl md:text-5xl font-display font-bold gradient-gold-text">{s.n}</div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Groups quick view */}
      <section className="container py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">All 12 Groups</h2>
            <p className="text-muted-foreground mt-1">Tap any group to dive in.</p>
          </div>
          <Link to="/groups" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GROUPS.map((g) => (
            <Link key={g} to={`/groups#${g}`} className="card-elevated rounded-2xl p-5 border border-border hover:border-primary/50 transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Group</span>
                <span className="font-display font-bold text-2xl gradient-text">{g}</span>
              </div>
              <ul className="space-y-1 text-sm">
                {teamsInGroup(g).map((t) => (
                  <li key={t.slug} className="flex items-center gap-2">
                    <span>{t.flag}</span>
                    <span className="truncate">{t.name}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
