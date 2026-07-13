import MvpStatsTable from "@/components/MvpStatsTable";
import { STAT_CATEGORIES } from "@/data/tournamentStats";

const Stats = () => (
  <div className="container py-8 sm:py-12">
    <h1 className="text-3xl font-black sm:text-5xl">Stats</h1>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      {STAT_CATEGORIES.map((category) => (
        <MvpStatsTable
          key={category.id}
          limit={10}
          showViewAll={false}
          showCategorySelector={false}
          title={category.title}
          defaultCategory={category.id}
        />
      ))}
    </div>
  </div>
);

export default Stats;
