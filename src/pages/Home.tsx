import { Link } from "react-router-dom";
import { FIXTURES, GROUPS, TEAMS, getTeam, teamsInGroup } from "@/data/wc26";
import { useFavoriteTeam } from "@/hooks/useFavoriteTeam";
import { getTeamInfo } from "@/data/teamInfo";
import { getManager } from "@/data/managers";
import { Bell, Heart, LogIn, Star, Trophy, UsersRound } from "lucide-react";
import HomeMatchUpdates from "@/components/HomeMatchUpdates";
import TeamFlag from "@/components/TeamFlag";
import { useAuth } from "@/contexts/AuthContext";

const FavoriteSpotlight = () => {
  const { slug } = useFavoriteTeam();
  const team = slug ? getTeam(slug) : null;

  if (!team) {
    return (
      <section className="container py-12">
        <div className="card-elevated rounded-3xl border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto text-primary" />
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">
            Pick your favourite team
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Choose a nation and we&apos;ll keep their upcoming matches, history and
            star player right here on the home page.
          </p>
          <Link
            to="/teams"
            className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105 glow"
          >
            Browse all 48 teams
          </Link>
        </div>
      </section>
    );
  }

  const info = getTeamInfo(team.name);
  const upcoming = FIXTURES.filter(
    (fixture) => fixture.home === team.name || fixture.away === team.name,
  ).slice(0, 5);

  return (
    <section className="container py-6 sm:py-12">
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary sm:mb-4 sm:text-xs">
        <Star className="h-3 w-3 fill-current" /> Your team
      </div>
      <div className="card-elevated overflow-hidden rounded-2xl border border-primary/30 sm:rounded-3xl">
        <div className="grid lg:grid-cols-3">
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-transparent p-4 sm:p-8 lg:p-10">
            <TeamFlag
              name={team.name}
              slug={team.slug}
              className="h-20 w-20 rounded-2xl shadow-lg sm:h-28 sm:w-28"
              eager
            />
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:mt-4 sm:text-xs">
              Group {team.group}
            </div>
            <h2 className="mt-0.5 text-2xl font-bold sm:mt-1 sm:text-4xl md:text-5xl">
              {team.name}
            </h2>
            <p className="mt-2 line-clamp-3 text-xs text-muted-foreground sm:mt-3 sm:line-clamp-none sm:text-base">
              {info.blurb}
            </p>
            <Link
              to={`/teams/${team.slug}`}
              className="mt-3 inline-block text-xs text-primary hover:underline sm:mt-5 sm:text-sm"
            >
              View full team page →
            </Link>
          </div>

          <div className="space-y-3 border-t border-border p-4 sm:space-y-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
                World Cup history
              </div>
              <div className="mt-1 flex items-baseline gap-2 sm:gap-3">
                <Trophy className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                <span className="font-display text-xl font-bold sm:text-3xl gradient-gold-text">
                  {info.titles}
                </span>
                <span className="text-[11px] text-muted-foreground sm:text-sm">
                  titles · {info.appearances} apps
                </span>
              </div>
              <div className="mt-1 text-[11px] sm:mt-2 sm:text-sm">
                <span className="text-muted-foreground">Best:</span>{" "}
                {info.bestFinish}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
                Head coach
              </div>
              <div className="mt-0.5 text-sm font-semibold sm:mt-1 sm:text-lg">
                {getManager(team.name)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
                Highlight player
              </div>
              <div className="mt-0.5 text-base font-bold sm:mt-1 sm:text-2xl">
                {info.highlightPlayer.name}
              </div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">
                {info.highlightPlayer.role}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-2 text-[10px] text-primary sm:pt-4 sm:text-xs">
              <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> You&apos;ll get
              important updates for {team.name}
            </div>
          </div>

          <div className="border-t border-border p-4 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:mb-3 sm:text-xs">
              Upcoming matches
            </div>
            <ul className="space-y-1.5 sm:space-y-2">
              {upcoming.map((fixture) => {
                const opponent =
                  fixture.home === team.name ? fixture.away : fixture.home;
                return (
                  <li
                    key={fixture.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3"
                  >
                    <div className="w-12 shrink-0 text-[10px] text-muted-foreground sm:w-14 sm:text-xs">
                      {new Date(fixture.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="w-9 shrink-0 font-mono text-[10px] text-muted-foreground sm:w-10 sm:text-xs">
                      {fixture.time}
                    </div>
                    <div className="flex-1 truncate text-xs font-medium sm:text-sm">
                      vs {opponent}
                    </div>
                    <div className="hidden text-[9px] uppercase tracking-widest text-muted-foreground sm:block sm:text-[10px]">
                      {fixture.stage === "Group"
                        ? `Group ${fixture.group}`
                        : fixture.stage}
                    </div>
                  </li>
                );
              })}
              {upcoming.length === 0 && (
                <li className="text-xs text-muted-foreground sm:text-sm">
                  No upcoming matches scheduled.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const InteractiveTeams = () => (
  <section className="container py-8 sm:py-12">
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">Explore All Teams</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Tap any flag to open the nation&apos;s full team page.
        </p>
      </div>
      <Link to="/teams" className="text-xs text-primary hover:underline sm:text-sm">
        View all →
      </Link>
    </div>
    <div className="relative rounded-2xl border border-border/60 bg-secondary/25 p-3 backdrop-blur-sm sm:p-4 md:p-5">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-12">
        {TEAMS.map((team, index) => (
          <Link
            key={team.slug}
            to={`/teams/${team.slug}`}
            title={team.name}
            style={{
              animationDelay: `${index * 20}ms`,
              animationFillMode: "both",
            }}
            className="group aspect-square overflow-hidden rounded-lg border border-border/50 shadow-sm transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:scale-110 hover:border-primary hover:shadow-lg hover:shadow-primary/25 animate-fade-in"
          >
            <TeamFlag
              name={team.name}
              slug={team.slug}
              className="h-full w-full rounded-lg transition-transform duration-200 group-hover:scale-105"
              eager={index < 16}
            />
          </Link>
        ))}
      </div>
    </div>
  </section>
);

const Home = () => {
  const { user } = useAuth();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="container relative grid items-start gap-8 py-10 md:py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5 lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              FIFA World Cup 2026
            </div>
            <h1 className="text-[22.5px] font-bold leading-[1] tracking-tight sm:text-[27px] md:text-[36px]">
              The world&apos;s <br />
              biggest <span className="gradient-text">stage</span>.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
              48 nations. 104 matches. 16 host cities across Canada, Mexico and
              the USA.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to="/fixtures?view=latest#latest-matches"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 glow"
              >
                Latest Matches
              </Link>
              <Link
                to="/best-xi"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:scale-105 hover:bg-primary/15"
              >
                <UsersRound className="h-4 w-4" /> Build Team
              </Link>
              <Link
                to="/mini-game"
                className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:scale-105 hover:bg-primary/15"
              >
                Mini Game
              </Link>
              <Link
                to="/prediction"
                className="rounded-full border border-border bg-secondary/50 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Make Your Prediction
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-2.5 text-sm font-semibold transition-all hover:border-primary/50 hover:bg-secondary"
              >
                <LogIn className="h-4 w-4" />
                {user ? "View Saved Progress" : "Log in & Save Progress"}
              </Link>
            </div>
          </div>

          <HomeMatchUpdates />
        </div>
      </section>

      <InteractiveTeams />
      <FavoriteSpotlight />

      <section className="container py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { n: "48", l: "Nations" },
            { n: "104", l: "Matches" },
            { n: "16", l: "Host Cities" },
            { n: "39", l: "Days" },
          ].map((stat) => (
            <div
              key={stat.l}
              className="card-elevated rounded-2xl border border-border p-6"
            >
              <div className="font-display text-4xl font-bold md:text-5xl gradient-gold-text">
                {stat.n}
              </div>
              <div className="mt-1 text-sm uppercase tracking-wider text-muted-foreground">
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">All 12 Groups</h2>
            <p className="mt-1 text-muted-foreground">Tap any group to dive in.</p>
          </div>
          <Link to="/groups" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <Link
              key={group}
              to={`/groups#${group}`}
              className="card-elevated rounded-2xl border border-border p-5 transition-all hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Group
                </span>
                <span className="font-display text-2xl font-bold gradient-text">
                  {group}
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {teamsInGroup(group).map((team) => (
                  <li key={team.slug} className="flex items-center gap-2">
                    <TeamFlag
                      name={team.name}
                      slug={team.slug}
                      className="h-5 w-5 rounded-md"
                    />
                    <span className="truncate">{team.name}</span>
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
