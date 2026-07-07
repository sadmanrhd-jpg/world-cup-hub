import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CircleHelp,
  Coins,
  Crown,
  ListFilter,
  Loader2,
  Lock,
  Medal,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  FANTASY_FAQ,
  FANTASY_FORMATIONS,
  FANTASY_SCORING,
  FANTASY_SHOOTOUT_SCORING,
  FANTASY_SQUAD_LIMITS,
} from "@/data/fantasyRules";
import {
  fetchFantasyPool,
  loadFantasyLeaderboard,
  loadFantasyPoints,
  loadFantasySquad,
  saveFantasySquad,
  toSquadPlayer,
} from "@/lib/fantasy";
import type {
  FantasyLeaderboardRow,
  FantasyPlayer,
  FantasyPointRow,
  FantasyPoolResponse,
  FantasyPosition,
  FantasySquadPlayer,
} from "@/types/fantasy";

const tabs = [
  { id: "team", label: "My Team", icon: UsersRound },
  { id: "players", label: "Players", icon: ListFilter },
  { id: "points", label: "Points", icon: Star },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "how", label: "How to Play", icon: BookOpen },
  { id: "faq", label: "FAQ", icon: CircleHelp },
] as const;

type TabId = (typeof tabs)[number]["id"];

const positionOrder: FantasyPosition[] = ["GK", "DEF", "MID", "FW"];

const positionName: Record<FantasyPosition, string> = {
  GK: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FW: "Forwards",
};

const formatPrice = (value: number) => `${value.toFixed(1)}m`;

const SectionCard = ({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-2xl border border-[#FAC938]/45 bg-card/80 shadow-sm ${className}`}
  >
    {title && (
      <div className="border-b border-[#FAC938]/25 px-4 py-3 sm:px-5">
        <h2 className="text-lg font-black sm:text-xl">{title}</h2>
      </div>
    )}
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const LoginGate = () => (
  <SectionCard className="mx-auto max-w-2xl">
    <div className="py-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#FAC938]/50 bg-[#FAC938]/10 text-[#FAC938]">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-2xl font-black">Sign in to enter Fantasy Game</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        A normal account is required to save a squad and appear on the prize
        leaderboard. Guest accounts cannot enter.
      </p>
      <Link
        to="/profile?mode=login"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition-transform hover:scale-105"
      >
        Log in or create account
      </Link>
    </div>
  </SectionCard>
);

const PoolStatus = ({ pool }: { pool: FantasyPoolResponse }) => (
  <div className="grid gap-3 sm:grid-cols-3">
    <div className="rounded-xl border border-border bg-background/55 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Active round
      </div>
      <div className="mt-1 font-black">{pool.round.name}</div>
    </div>
    <div className="rounded-xl border border-border bg-background/55 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Budget
      </div>
      <div className="mt-1 font-black text-[#FAC938]">{pool.round.budget}m</div>
    </div>
    <div className="rounded-xl border border-border bg-background/55 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Deadline
      </div>
      <div className="mt-1 text-sm font-black">
        {pool.round.locked ? "Locked" : "First-match halftime"}
      </div>
    </div>
  </div>
);

const PlayerAvatar = ({ player }: { player: FantasyPlayer }) => (
  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-black">
    {player.headshotUrl ? (
      <img
        src={player.headshotUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      player.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
    )}
  </div>
);

const PlayerRow = ({
  player,
  selected,
  disabled,
  onToggle,
}: {
  player: FantasyPlayer;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/55 p-3">
    <PlayerAvatar player={player} />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-black">{player.name}</span>
        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
          {player.position}
        </span>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {player.teamAbbreviation || player.teamName} · {player.stats.minutes} mins · {player.stats.fantasyPoints} pts
      </div>
    </div>
    <div className="shrink-0 text-right">
      <div className="text-sm font-black text-[#FAC938]">{formatPrice(player.price)}</div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`mt-1 rounded-full px-3 py-1 text-[10px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          selected
            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {selected ? "Remove" : "Add"}
      </button>
    </div>
  </div>
);

const formationFromPlayers = (players: FantasySquadPlayer[]) => {
  const starters = players.filter((player) => player.role === "starter");
  const count = (position: FantasyPosition) =>
    starters.filter((player) => player.position === position).length;
  return `${count("DEF")}-${count("MID")}-${count("FW")}`;
};

const validateSquad = (
  players: FantasySquadPlayer[],
  captainPlayerId: string | null,
  budget: number,
) => {
  const errors: string[] = [];
  const totalPrice = players.reduce((sum, player) => sum + player.price, 0);
  const starters = players.filter((player) => player.role === "starter");

  if (players.length !== 15) errors.push("Select exactly 15 players.");
  for (const position of positionOrder) {
    const count = players.filter((player) => player.position === position).length;
    if (count !== FANTASY_SQUAD_LIMITS[position]) {
      errors.push(`Select exactly ${FANTASY_SQUAD_LIMITS[position]} ${position} players.`);
    }
  }
  if (totalPrice > budget) errors.push("Your squad is over budget.");
  if (starters.length !== 11) errors.push("Select exactly 11 starters.");
  if (starters.filter((player) => player.position === "GK").length !== 1) {
    errors.push("Your starting XI needs exactly one goalkeeper.");
  }
  const formation = formationFromPlayers(players);
  if (!FANTASY_FORMATIONS.includes(formation as (typeof FANTASY_FORMATIONS)[number])) {
    errors.push("Choose one of the approved formations.");
  }
  if (!captainPlayerId) errors.push("Choose a captain.");
  if (
    captainPlayerId &&
    !starters.some((player) => player.playerId === captainPlayerId)
  ) {
    errors.push("Your captain must be in the starting XI.");
  }
  return errors;
};

const TeamBuilder = ({
  pool,
  initialPlayers,
  initialCaptain,
  userId,
  onSaved,
}: {
  pool: FantasyPoolResponse;
  initialPlayers: FantasySquadPlayer[];
  initialCaptain: string | null;
  userId: string;
  onSaved: () => void;
}) => {
  const [players, setPlayers] = useState<FantasySquadPlayer[]>(initialPlayers);
  const [captainPlayerId, setCaptainPlayerId] = useState(initialCaptain);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<"ALL" | FantasyPosition>("ALL");
  const [team, setTeam] = useState("ALL");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlayers(initialPlayers);
    setCaptainPlayerId(initialCaptain);
  }, [initialCaptain, initialPlayers]);

  const selectedIds = useMemo(
    () => new Set(players.map((player) => player.playerId)),
    [players],
  );
  const totalPrice = players.reduce((sum, player) => sum + player.price, 0);
  const remaining = pool.round.budget - totalPrice;
  const errors = validateSquad(players, captainPlayerId, pool.round.budget);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pool.players.filter((player) => {
      if (position !== "ALL" && player.position !== position) return false;
      if (team !== "ALL" && player.teamId !== team) return false;
      if (
        query &&
        !`${player.name} ${player.teamName} ${player.teamAbbreviation}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [pool.players, position, search, team]);

  const autoRoleFor = (player: FantasyPlayer): "starter" | "bench" => {
    const starters = players.filter((item) => item.role === "starter");
    const starterCount = (value: FantasyPosition) =>
      starters.filter((item) => item.position === value).length;
    if (starters.length >= 11) return "bench";
    if (player.position === "GK") return starterCount("GK") === 0 ? "starter" : "bench";
    if (player.position === "DEF" && starterCount("DEF") < 3) return "starter";
    if (player.position === "MID" && starterCount("MID") < 3) return "starter";
    if (player.position === "FW" && starterCount("FW") < 1) return "starter";
    return "starter";
  };

  const togglePlayer = (player: FantasyPlayer) => {
    if (pool.round.locked) return;
    if (selectedIds.has(player.id)) {
      setPlayers((current) =>
        current
          .filter((item) => item.playerId !== player.id)
          .map((item, index) =>
            item.role === "bench" && item.position !== "GK"
              ? { ...item, benchOrder: index + 1 }
              : item,
          ),
      );
      if (captainPlayerId === player.id) setCaptainPlayerId(null);
      return;
    }

    const positionCount = players.filter(
      (item) => item.position === player.position,
    ).length;
    if (positionCount >= FANTASY_SQUAD_LIMITS[player.position]) {
      toast.error(`You already have ${FANTASY_SQUAD_LIMITS[player.position]} ${player.position} players.`);
      return;
    }
    if (players.length >= 15) {
      toast.error("Your 15-player squad is full.");
      return;
    }
    if (totalPrice + player.price > pool.round.budget) {
      toast.error("This player would take your squad over budget.");
      return;
    }

    const role = autoRoleFor(player);
    const outfieldBenchCount = players.filter(
      (item) => item.role === "bench" && item.position !== "GK",
    ).length;
    setPlayers((current) => [
      ...current,
      toSquadPlayer(
        player,
        role,
        role === "bench" && player.position !== "GK"
          ? outfieldBenchCount + 1
          : null,
      ),
    ]);
  };

  const toggleRole = (playerId: string) => {
    if (pool.round.locked) return;
    setPlayers((current) => {
      const target = current.find((player) => player.playerId === playerId);
      if (!target) return current;
      const nextRole = target.role === "starter" ? "bench" : "starter";
      const starters = current.filter((player) => player.role === "starter");
      if (nextRole === "starter" && starters.length >= 11) {
        toast.error("Move another player to the bench first.");
        return current;
      }
      if (nextRole === "bench" && target.playerId === captainPlayerId) {
        setCaptainPlayerId(null);
      }
      const changed = current.map((player) =>
        player.playerId === playerId
          ? { ...player, role: nextRole, benchOrder: null }
          : player,
      );
      let order = 1;
      return changed.map((player) => {
        if (player.role === "bench" && player.position !== "GK") {
          return { ...player, benchOrder: order++ };
        }
        return { ...player, benchOrder: null };
      });
    });
  };

  const moveBench = (playerId: string, direction: -1 | 1) => {
    if (pool.round.locked) return;
    setPlayers((current) => {
      const bench = current
        .filter((player) => player.role === "bench" && player.position !== "GK")
        .sort((a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99));
      const index = bench.findIndex((player) => player.playerId === playerId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= bench.length) return current;
      [bench[index], bench[nextIndex]] = [bench[nextIndex], bench[index]];
      const orders = new Map(bench.map((player, i) => [player.playerId, i + 1]));
      return current.map((player) => ({
        ...player,
        benchOrder: orders.get(player.playerId) ?? player.benchOrder,
      }));
    });
  };

  const handleSave = async () => {
    if (pool.round.locked) return;
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      await saveFantasySquad({
        userId,
        roundCode: pool.round.code,
        budget: pool.round.budget,
        captainPlayerId: captainPlayerId!,
        players,
      });
      toast.success("Fantasy squad saved.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the squad.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <SectionCard title="Player Pool">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search player or team"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={position}
            onChange={(event) =>
              setPosition(event.target.value as "ALL" | FantasyPosition)
            }
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          >
            <option value="ALL">All positions</option>
            {positionOrder.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          >
            <option value="ALL">All teams</option>
            {pool.teams.map((value) => (
              <option key={value.id} value={value.id}>
                {value.abbreviation || value.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 max-h-[690px] space-y-2 overflow-y-auto pr-1">
          {filteredPlayers.map((player) => {
            const selected = selectedIds.has(player.id);
            return (
              <PlayerRow
                key={player.id}
                player={player}
                selected={selected}
                disabled={pool.round.locked}
                onToggle={() => togglePlayer(player)}
              />
            );
          })}
          {filteredPlayers.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No player matches the current filters.
            </div>
          )}
        </div>
      </SectionCard>

      <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <SectionCard title="Squad Summary">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Players
              </div>
              <div className="mt-1 text-xl font-black">{players.length}/15</div>
            </div>
            <div className="rounded-xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Formation
              </div>
              <div className="mt-1 text-xl font-black">{formationFromPlayers(players)}</div>
            </div>
            <div className="rounded-xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Left
              </div>
              <div className={`mt-1 text-xl font-black ${remaining < 0 ? "text-destructive" : "text-[#FAC938]"}`}>
                {formatPrice(remaining)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {positionOrder.map((value) => {
              const count = players.filter((player) => player.position === value).length;
              return (
                <div key={value} className="rounded-lg border border-border px-2 py-2 text-center">
                  <div className="text-[9px] font-bold text-muted-foreground">{value}</div>
                  <div className="font-black">
                    {count}/{FANTASY_SQUAD_LIMITS[value]}
                  </div>
                </div>
              );
            })}
          </div>

          {pool.round.locked && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              {pool.round.lockMessage}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Starting XI and Bench">
          <div className="space-y-4">
            {positionOrder.map((value) => {
              const rows = players.filter((player) => player.position === value);
              if (rows.length === 0) return null;
              return (
                <div key={value}>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    {positionName[value]}
                  </div>
                  <div className="space-y-2">
                    {rows.map((player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center gap-2 rounded-xl border border-border bg-background/55 p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black">{player.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {player.teamName} · {formatPrice(player.price)}
                          </div>
                        </div>
                        {player.role === "bench" && player.position !== "GK" && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveBench(player.playerId, -1)}
                              disabled={pool.round.locked}
                              className="grid h-7 w-7 place-items-center rounded-md border border-border disabled:opacity-40"
                              aria-label="Move substitute up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBench(player.playerId, 1)}
                              disabled={pool.round.locked}
                              className="grid h-7 w-7 place-items-center rounded-md border border-border disabled:opacity-40"
                              aria-label="Move substitute down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleRole(player.playerId)}
                          disabled={pool.round.locked}
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black disabled:opacity-40 ${
                            player.role === "starter"
                              ? "bg-primary/15 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {player.role === "starter"
                            ? "Starter"
                            : player.position === "GK"
                              ? "Bench GK"
                              : `Bench ${player.benchOrder ?? ""}`}
                        </button>
                        {player.role === "starter" && (
                          <button
                            type="button"
                            onClick={() => setCaptainPlayerId(player.playerId)}
                            disabled={pool.round.locked}
                            className={`grid h-8 w-8 place-items-center rounded-full border disabled:opacity-40 ${
                              captainPlayerId === player.playerId
                                ? "border-[#FAC938] bg-[#FAC938] text-black"
                                : "border-border text-muted-foreground"
                            }`}
                            aria-label={`Make ${player.name} captain`}
                          >
                            <Crown className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-xs font-black text-amber-500">Before saving:</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {errors.slice(0, 5).map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || pool.round.locked || errors.length > 0}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Fantasy Team
          </button>
        </SectionCard>
      </div>
    </div>
  );
};

const PlayersTab = ({ pool }: { pool: FantasyPoolResponse }) => (
  <div className="space-y-5">
    <PoolStatus pool={pool} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pool.players.map((player) => (
        <div key={player.id} className="rounded-2xl border border-[#FAC938]/35 bg-card/80 p-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar player={player} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-black">{player.name}</div>
              <div className="text-xs text-muted-foreground">
                {player.teamName} · {player.position}
              </div>
            </div>
            <div className="text-lg font-black text-[#FAC938]">{formatPrice(player.price)}</div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-secondary/55 p-2">
              <div className="text-[9px] text-muted-foreground">MIN</div>
              <div className="text-sm font-black">{player.stats.minutes}</div>
            </div>
            <div className="rounded-lg bg-secondary/55 p-2">
              <div className="text-[9px] text-muted-foreground">G</div>
              <div className="text-sm font-black">{player.stats.goals}</div>
            </div>
            <div className="rounded-lg bg-secondary/55 p-2">
              <div className="text-[9px] text-muted-foreground">A</div>
              <div className="text-sm font-black">{player.stats.assists}</div>
            </div>
            <div className="rounded-lg bg-secondary/55 p-2">
              <div className="text-[9px] text-muted-foreground">PTS</div>
              <div className="text-sm font-black">{player.stats.fantasyPoints}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PointsTab = ({ rows }: { rows: FantasyPointRow[] }) => {
  const total = rows.reduce((sum, row) => sum + row.totalPoints, 0);
  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Total points
            </div>
            <div className="mt-1 text-4xl font-black text-[#FAC938]">{total}</div>
          </div>
          <Star className="h-10 w-10 text-[#FAC938]" />
        </div>
      </SectionCard>
      <SectionCard title="Match-by-match points">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Points will appear here after match data has been reviewed and scored.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/55 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black">{row.playerName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.teamName} · {row.roundCode} · Match {row.matchId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[#FAC938]">{row.totalPoints}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    {row.finalized ? "Final" : "Provisional"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const LeaderboardTab = ({ rows }: { rows: FantasyLeaderboardRow[] }) => (
  <SectionCard title="Overall Leaderboard">
    <p className="mb-4 text-sm text-muted-foreground">
      Quarter-finals, Semi-finals, Third-place Match and Final points are added together. The top three managers receive prizes.
    </p>
    {rows.length === 0 ? (
      <div className="py-10 text-center text-sm text-muted-foreground">
        The leaderboard will appear after the first points are published.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#FAC938]/30 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-3">Rank</th>
              <th className="px-3 py-3">Manager</th>
              <th className="px-3 py-3 text-center">Points</th>
              <th className="px-3 py-3 text-center">Goals</th>
              <th className="px-3 py-3 text-center">Assists</th>
              <th className="px-3 py-3 text-center">Clean sheets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.userId} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-3 font-black">
                  <span className="inline-flex items-center gap-1.5">
                    {index < 3 && <Medal className="h-4 w-4 text-[#FAC938]" />}
                    {index + 1}
                  </span>
                </td>
                <td className="px-3 py-3 font-bold">{row.displayName}</td>
                <td className="px-3 py-3 text-center text-lg font-black text-[#FAC938]">{row.totalPoints}</td>
                <td className="px-3 py-3 text-center">{row.goals}</td>
                <td className="px-3 py-3 text-center">{row.assists}</td>
                <td className="px-3 py-3 text-center">{row.cleanSheets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </SectionCard>
);

const ScoringTables = () => (
  <div className="space-y-5">
    <SectionCard title="Scoring Table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-secondary/70">
              <th className="border border-border px-3 py-2 text-left">Event</th>
              {positionOrder.map((position) => (
                <th key={position} className="border border-border px-3 py-2 text-center">{position}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FANTASY_SCORING.map((row) => (
              <tr key={row.event}>
                <td className="border border-border px-3 py-2 font-semibold">{row.event}</td>
                {positionOrder.map((position) => (
                  <td key={position} className="border border-border px-3 py-2 text-center font-bold">
                    {row[position] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        A player receives either the 1–59 minute score or the 60+ minute score, not both.
      </p>
    </SectionCard>

    <SectionCard title="Penalty Shootout Scoring">
      <div className="space-y-2">
        {FANTASY_SHOOTOUT_SCORING.map((row) => (
          <div key={row.event} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/55 p-3">
            <span className="text-sm font-semibold">{row.event}</span>
            <span className="text-lg font-black text-[#FAC938]">
              {row.points > 0 ? "+" : ""}{row.points}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

const HowToPlayTab = () => (
  <div className="space-y-5">
    <SectionCard title="1. Sign in and create one team">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Sign in with a normal account. Each account can create one Fantasy Game team per round. Guest accounts cannot enter the prize leaderboard.
      </p>
    </SectionCard>

    <SectionCard title="2. Build your 15-player squad">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Select 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards. There is no minimum or maximum number of players from one country.
      </p>
    </SectionCard>

    <SectionCard title="3. Use the round budget">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Quarter-finals", "105m"],
          ["Semi-finals", "125m"],
          ["Final", "135m"],
        ].map(([round, budget]) => (
          <div key={round} className="rounded-xl border border-border bg-background/55 p-3 text-center">
            <div className="text-xs font-semibold text-muted-foreground">{round}</div>
            <div className="mt-1 text-2xl font-black text-[#FAC938]">{budget}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        The budget grows by 5m after each completed match. The accumulated increase becomes usable when the next round opens. Unused money does not earn points.
      </p>
    </SectionCard>

    <SectionCard title="4. Choose the starting XI">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Pick 11 starters with exactly 1 goalkeeper, at least 3 defenders, at least 3 midfielders and at least 1 forward.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {FANTASY_FORMATIONS.map((formation) => (
          <span key={formation} className="rounded-full border border-[#FAC938]/40 bg-[#FAC938]/10 px-3 py-1 text-xs font-black text-[#FAC938]">
            {formation}
          </span>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="5. Set the bench order and captain">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Put the three outfield substitutes in first, second and third priority. The second goalkeeper is the goalkeeper substitute. Choose one starting player as captain. Positive captain points are doubled, while negative deductions apply once. If the captain plays zero minutes, no captain bonus is awarded.
      </p>
    </SectionCard>

    <SectionCard title="6. Make unlimited changes before the lock">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Transfers are unlimited and free. You may change players, formation, starters, bench order and captain until halftime of the first match in that round. At halftime, the entire team and captain lock.
      </p>
    </SectionCard>

    <SectionCard title="7. Points are not retroactive">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Goals, assists, saves, cards and other events count only if they happen after the player was added to your active team. If a player scores in the 10th minute and you add them in the 40th minute, you receive no points for that goal. Events after the selection time count normally. Points already earned remain if the player is later removed.
      </p>
    </SectionCard>

    <SectionCard title="8. Minutes, clean sheets and goals conceded">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Appearance points use the player’s full real match minutes. Clean sheets and goals conceded also use the player’s full real participation. Adding a defender after an earlier goal does not restore a clean sheet or remove goals-conceded deductions.
      </p>
    </SectionCard>

    <SectionCard title="9. Automatic substitutions">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Auto-subs are applied after the round ends. A starter is replaced only if they play zero minutes. The first eligible outfield substitute enters while keeping a valid formation. The bench goalkeeper can replace only the starting goalkeeper. Captaincy never transfers during an auto-sub.
      </p>
    </SectionCard>

    <SectionCard title="10. Rounds, late entry and prizes">
      <p className="text-sm leading-relaxed text-muted-foreground">
        The game covers the Quarter-finals, Semi-finals, Third-place Match and Final. The Third-place Match and Final use the Final-round squad. New users may join until first-match halftime, but anyone joining after a round begins earns zero points for that round and starts scoring from the next one. The top three overall managers receive prizes.
      </p>
    </SectionCard>

    <SectionCard title="11. Tie-break order">
      <ol className="space-y-2 text-sm text-muted-foreground">
        <li>1. Most goals by point-scoring players</li>
        <li>2. Most assists by point-scoring players</li>
        <li>3. Most clean sheets by point-scoring players</li>
        <li>4. Earliest valid Quarter-final squad submission</li>
      </ol>
    </SectionCard>

    <ScoringTables />
  </div>
);

const FaqTab = () => (
  <div className="grid gap-3 lg:grid-cols-2">
    {FANTASY_FAQ.map((item) => (
      <details key={item.question} className="group rounded-2xl border border-[#FAC938]/35 bg-card/80 p-4 open:border-[#FAC938]/65">
        <summary className="cursor-pointer list-none pr-6 text-sm font-black marker:hidden">
          {item.question}
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
      </details>
    ))}
  </div>
);

const FantasyGame = () => {
  const { user, loading: authLoading, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("team");
  const [pool, setPool] = useState<FantasyPoolResponse | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [squadPlayers, setSquadPlayers] = useState<FantasySquadPlayer[]>([]);
  const [captainPlayerId, setCaptainPlayerId] = useState<string | null>(null);
  const [points, setPoints] = useState<FantasyPointRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<FantasyLeaderboardRow[]>([]);
  const [revision, setRevision] = useState(0);

  const protectedTab = ["team", "points"].includes(activeTab);
  const canEnter = Boolean(user && !isGuest);

  const refreshPool = async () => {
    setPoolLoading(true);
    setPoolError(null);
    try {
      setPool(await fetchFantasyPool());
    } catch (error) {
      setPoolError(error instanceof Error ? error.message : "Could not load ESPN fantasy data.");
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    void refreshPool();
  }, []);

  useEffect(() => {
    if (!user || isGuest || !pool) return;
    let cancelled = false;
    void Promise.all([
      loadFantasySquad(user.id, pool.round.code),
      loadFantasyPoints(user.id),
      loadFantasyLeaderboard(),
    ])
      .then(([squad, pointRows, leaderboardRows]) => {
        if (cancelled) return;
        setSquadPlayers(squad.players);
        setCaptainPlayerId(squad.captainPlayerId);
        setPoints(pointRows);
        setLeaderboard(leaderboardRows);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load fantasy account data.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, pool, revision, user]);

  useEffect(() => {
    if (activeTab !== "leaderboard") return;
    void loadFantasyLeaderboard()
      .then(setLeaderboard)
      .catch(() => undefined);
  }, [activeTab]);

  const renderProtectedContent = () => {
    if (authLoading) {
      return (
        <div className="grid min-h-[280px] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      );
    }
    if (!canEnter) return <LoginGate />;
    if (!pool) return null;

    if (activeTab === "team") {
      return (
        <div className="space-y-5">
          <PoolStatus pool={pool} />
          {pool.warnings.map((warning) => (
            <div key={warning} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
              {warning}
            </div>
          ))}
          <TeamBuilder
            pool={pool}
            initialPlayers={squadPlayers}
            initialCaptain={captainPlayerId}
            userId={user!.id}
            onSaved={() => setRevision((current) => current + 1)}
          />
        </div>
      );
    }

    return <PointsTab rows={points} />;
  };

  return (
    <div className="container py-7 sm:py-10">
      <div className="relative overflow-hidden rounded-3xl border border-[#FAC938]/55 bg-gradient-to-br from-[#FAC938]/15 via-background to-primary/5 p-5 sm:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FAC938]/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#FAC938]">
            <Trophy className="h-4 w-4" /> Knockout Edition
          </div>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Fantasy Game</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Build a 15-player squad for the Quarter-finals, Semi-finals, Third-place Match and Final. Player values and tournament performance are supplied through ESPN data.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FAC938]/40 bg-[#FAC938]/10 px-3 py-1.5 text-[#FAC938]">
              <Coins className="h-3.5 w-3.5" /> 105m starting budget
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/55 px-3 py-1.5">
              <UsersRound className="h-3.5 w-3.5" /> 15-player squad
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/55 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Top 3 win prizes
            </span>
          </div>
        </div>
      </div>

      <div className="sticky top-14 z-30 -mx-4 mt-5 overflow-x-auto border-y border-border bg-background/92 px-4 py-2 backdrop-blur-xl sm:top-16 sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition-colors sm:px-4 sm:text-sm ${
                  active
                    ? "bg-[#FAC938] text-black"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mt-5">
        {poolLoading && ["team", "players"].includes(activeTab) ? (
          <div className="grid min-h-[360px] place-items-center rounded-2xl border border-border">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Collecting the current player pool from ESPN…</p>
            </div>
          </div>
        ) : poolError && ["team", "players"].includes(activeTab) ? (
          <SectionCard>
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{poolError}</p>
              <button
                type="button"
                onClick={refreshPool}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-black"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          </SectionCard>
        ) : protectedTab ? (
          renderProtectedContent()
        ) : activeTab === "players" && pool ? (
          <PlayersTab pool={pool} />
        ) : activeTab === "leaderboard" ? (
          <LeaderboardTab rows={leaderboard} />
        ) : activeTab === "how" ? (
          <HowToPlayTab />
        ) : activeTab === "faq" ? (
          <FaqTab />
        ) : null}
      </main>

      <div className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" /> Fantasy statistics are provisional until reviewed.
      </div>
    </div>
  );
};

export default FantasyGame;
