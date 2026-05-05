import { Link } from "react-router-dom";
import logo from "@/assets/wc26-logo.avif";
import { GROUPS, teamsInGroup } from "@/data/wc26";

const Home = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="container relative py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              June 11 – July 19, 2026
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[0.95]">
              The world's <br />
              biggest <span className="gradient-text">stage</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              48 nations. 104 matches. 16 host cities across Canada, Mexico and the USA.
              Your home for everything FIFA World Cup 2026™.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/fixtures" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold glow hover:scale-105 transition-transform">
                View Fixtures
              </Link>
              <Link to="/prediction" className="px-6 py-3 rounded-full border border-border bg-secondary/50 hover:bg-secondary font-semibold transition-colors">
                Make Your Prediction
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute inset-0 blur-3xl opacity-40 bg-primary rounded-full" />
            <img src={logo} alt="FIFA World Cup 2026 official logo" className="relative max-w-sm w-full drop-shadow-2xl" />
          </div>
        </div>
      </section>

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
