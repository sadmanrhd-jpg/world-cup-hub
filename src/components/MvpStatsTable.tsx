import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ChevronDown, RefreshCw, Trophy, WifiOff } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { getTeamByName } from "@/data/wc26";
import {
  getCategoryConfig,
  STAT_CATEGORIES,
  type StatCategory,
  type TournamentStatPlayer,
} from "@/data/tournamentStats";
import { useTournamentStats } from "@/hooks/useTournamentStats";

const statValue = (player: TournamentStatPlayer, category: StatCategory) =>
  player[category];

const MvpStatsTable = ({
  limit = 5,
  showViewAll = true,
  title = "Quick Stats",
  compact = false,
  defaultCategory = "goals",
  showCategorySelector = true,
}: {
  limit?: number;
  showViewAll?: boolean;
  title?: string;
  compact?: boolean;
  defaultCategory?: StatCategory;
  showCategorySelector?: boolean;
}) => {
  const [category, setCategory] = useState<StatCategory>(defaultCategory);
  const { data, isLoading, isFetching, error } = useTournamentStats();

  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  const config = getCategoryConfig(category);
  const rows = useMemo(
    () => (data?.leaders?.[category] ?? []).slice(0, limit),
    [category, data, limit],
  );
  const showSubtitle = title !== config.title;
  const fetchedAt = data?.fetchedAt ? new Date(data.fetchedAt) : null;

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-primary/65 bg-gradient-to-br from-primary/[0.09] via-background/45 to-secondary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.14),0_0_18px_hsl(var(--primary)/0.08)]">
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary sm:h-9 sm:w-9">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="min-w-0 truncate text-lg font-black leading-tight sm:text-2xl">
              {title}
            </h2>
            {showSubtitle && (
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground sm:text-xs">
                {config.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isFetching && data && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {showViewAll && (
            <Link
              to="/stats"
              className="whitespace-nowrap text-[11px] font-semibold text-primary hover:underline sm:text-sm"
            >
              View all →
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-primary/35 p-2 sm:p-3">
        {showCategorySelector && (
          <label className="mb-2 flex min-h-10 items-center gap-2 rounded-xl border border-primary/35 bg-background/70 px-3 text-xs font-black text-foreground sm:mb-3">
            <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
            <span className="shrink-0 text-muted-foreground">Show</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as StatCategory)}
              className="min-w-0 flex-1 appearance-none bg-transparent font-black outline-none"
              aria-label="Select statistic"
            >
              {STAT_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </label>
        )}

        <div className="overflow-hidden rounded-xl border border-primary/35 bg-background/60">
          <div className="grid grid-cols-[minmax(0,1fr)_54px] gap-2 border-b border-border/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_76px] sm:px-4">
            <span>Name</span>
            <span className="text-center">{config.shortLabel}</span>
          </div>

          {rows.map((player, index) => {
            const team = getTeamByName(player.country);
            return (
              <Link
                key={`${category}-${player.name}-${player.country}`}
                to="/stats"
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_54px] items-center gap-2 border-b border-border/60 px-3 py-2.5 transition-colors last:border-0 hover:bg-primary/[0.05] sm:grid-cols-[minmax(0,1fr)_76px] sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary sm:h-7 sm:w-7">
                    {player.rank || index + 1}
                  </span>
                  <TeamFlag
                    name={player.country}
                    slug={team?.slug}
                    className="h-5 w-5 shrink-0 rounded sm:h-6 sm:w-6"
                  />
                  <div className="min-w-0">
                    <div
                      className={`${compact ? "text-[12px]" : "text-[13px]"} truncate font-black leading-tight sm:text-sm`}
                    >
                      {player.name}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {player.countryCode}
                    </div>
                  </div>
                </div>

                <div className="text-center font-display text-lg font-black text-primary sm:text-xl">
                  {statValue(player, category)}
                </div>
              </Link>
            );
          })}

          {isLoading && rows.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading ESPN statistics…
            </div>
          )}

          {!isLoading && error && rows.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <WifiOff className="h-4 w-4 shrink-0" />
              ESPN statistics are temporarily unavailable.
            </div>
          )}

          {!isLoading && !error && rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No {config.label.toLowerCase()} have been recorded in the ESPN feed yet.
            </div>
          )}
        </div>
      </div>

      {limit <= 5 && (
        <div className="flex min-w-0 items-center gap-1.5 border-t border-border/60 px-3 py-2 text-[10px] font-semibold text-muted-foreground sm:px-4">
          <BarChart3 className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            {fetchedAt
              ? `ESPN data updated ${fetchedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Connecting to ESPN tournament statistics"}
          </span>
        </div>
      )}
    </section>
  );
};

export default MvpStatsTable;
