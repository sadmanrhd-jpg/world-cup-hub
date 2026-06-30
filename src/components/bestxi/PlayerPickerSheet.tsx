import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import PlayerStatLine from "@/components/bestxi/PlayerStatLine";
import { getTeamByName } from "@/data/wc26";
import type { PlayerPosition, WorldCupPlayer } from "@/types/fanProfile";

const PlayerPickerSheet = ({
  open,
  title,
  requiredPosition,
  players,
  excludedIds,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  requiredPosition?: PlayerPosition | null;
  players: WorldCupPlayer[];
  excludedIds: Set<string>;
  onSelect: (player: WorldCupPlayer) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | "All">(
    requiredPosition ?? "All",
  );

  const teamNames = useMemo(
    () => Array.from(new Set(players.map((player) => player.teamName))).sort(),
    [players],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTeamFilter("All");
    setPositionFilter(requiredPosition ?? "All");
  }, [open, requiredPosition]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return players
      .filter((player) => !excludedIds.has(player.id))
      .filter((player) =>
        requiredPosition
          ? player.position === requiredPosition
          : positionFilter === "All" || player.position === positionFilter,
      )
      .filter((player) => (teamFilter === "All" ? true : player.teamName === teamFilter))
      .filter((player) =>
        !term
          ? true
          : [player.name, player.teamName, player.club ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(term),
      )
      .sort((a, b) => {
        const relevance = (player: WorldCupPlayer) => {
          if (player.position === "GK") {
            return player.stats.saves * 3 + player.stats.cleanSheets * 8 + player.stats.appearances;
          }
          if (player.position === "DEF") {
            return player.stats.tackles * 2 + player.stats.interceptions * 3 + player.stats.goals * 8 + player.stats.assists * 5;
          }
          if (player.position === "MID") {
            return player.stats.goals * 10 + player.stats.assists * 8 + player.stats.tackles + player.stats.interceptions * 2;
          }
          return player.stats.goals * 12 + player.stats.assists * 8 + player.stats.appearances;
        };
        return relevance(b) - relevance(a) || a.name.localeCompare(b.name);
      });
  }, [excludedIds, players, positionFilter, query, requiredPosition, teamFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close player picker" />
      <div className="relative flex h-[88vh] w-full max-w-3xl flex-col rounded-t-3xl border border-border bg-background shadow-2xl md:h-[82vh] md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary">Player selection</div>
            <h2 className="text-xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-2 border-b border-border p-4 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, country or club"
              className="w-full rounded-full border border-border bg-input py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </label>
          {!requiredPosition && (
            <select
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value as PlayerPosition | "All")}
              className="rounded-full border border-border bg-input px-4 py-2.5 text-sm"
            >
              <option value="All">All positions</option>
              <option value="GK">Goalkeepers</option>
              <option value="DEF">Defenders</option>
              <option value="MID">Midfielders</option>
              <option value="FWD">Forwards</option>
            </select>
          )}
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="rounded-full border border-border bg-input px-4 py-2.5 text-sm"
          >
            <option value="All">All countries</option>
            {teamNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="space-y-2">
            {filtered.map((player) => {
              const team = getTeamByName(player.teamName);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelect(player)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-secondary/40 sm:p-4"
                >
                  <TeamFlag
                    name={player.teamName}
                    slug={team?.slug}
                    className="h-11 w-11 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold">{player.name}</span>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black text-primary">
                        {player.position}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {player.teamName}{player.club ? ` · ${player.club}` : ""}
                    </div>
                    <PlayerStatLine player={player} />
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No available player matches these filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPickerSheet;
