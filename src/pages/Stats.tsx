import { BarChart3, Trophy } from "lucide-react";
import MvpStatsTable from "@/components/MvpStatsTable";
import { STAT_CATEGORIES } from "@/data/tournamentStats";

const Stats = () => (
  <div className="container py-8 sm:py-12">
    <section className="relative overflow-hidden rounded-3xl border border-primary/45 bg-gradient-to-br from-primary/15 via-background to-secondary/35 p-5 sm:p-8">
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <BarChart3 className="h-4 w-4" /> Tournament Stats
        </div>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Stats</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Goals, assists, yellow-card and red-card leaders. More World Cup stat tables can be added here later, because apparently football fans require several dashboards to feel emotionally stable.
        </p>
      </div>
    </section>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      {STAT_CATEGORIES.map((category) => (
        <MvpStatsTable
          key={category.id}
          limit={10}
          showViewAll={false}
          title={category.title}
          defaultCategory={category.id}
        />
      ))}
    </div>

    <section className="mt-6 rounded-2xl border border-primary/45 bg-card/80 p-5 shadow-sm">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
        <Trophy className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-black">Coming next</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Clean sheets, saves, fantasy points, team attack and team discipline tables can be added after this base Stats page is live.
      </p>
    </section>
  </div>
);

export default Stats;
