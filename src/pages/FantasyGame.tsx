import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CircleHelp,
  Coins,
  Crown,
  ListFilter,
  Loader2,
  Lock,
  Medal,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  FANTASY_FAQ,
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

type TabId = "team" | "players" | "points" | "leaderboard" | "how" | "faq";
type SortMode = "value" | "points" | "price" | "name" | "team";
type SquadSlot = {
  id: string;
  label: string;
  position: FantasyPosition;
  x: number;
  y: number;
  starter: boolean;
};

const tabs: Array<{ id: TabId; label: string; icon: typeof UsersRound }> = [
  { id: "team", label: "My Squad", icon: UsersRound },
  { id: "players", label: "Players", icon: ListFilter },
  { id: "points", label: "Points", icon: Star },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "how", label: "How to Play", icon: BookOpen },
  { id: "faq", label: "FAQ", icon: CircleHelp },
];

const positionOrder: FantasyPosition[] = ["GK", "DEF", "MID", "FW"];
const positionName: Record<FantasyPosition, string> = {
  GK: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FW: "Forwards",
};

const squadSlots: SquadSlot[] = [
  { id: "fw1", label: "FW", position: "FW", x: 25, y: 15, starter: true },
  { id: "fw2", label: "FW", position: "FW", x: 50, y: 11, starter: true },
  { id: "fw3", label: "FW", position: "FW", x: 75, y: 15, starter: true },
  { id: "mid1", label: "MID", position: "MID", x: 10, y: 37, starter: true },
  { id: "mid2", label: "MID", position: "MID", x: 30, y: 41, starter: true },
  { id: "mid3", label: "MID", position: "MID", x: 50, y: 46, starter: true },
  { id: "mid4", label: "MID", position: "MID", x: 70, y: 41, starter: false },
  { id: "mid5", label: "MID", position: "MID", x: 90, y: 37, starter: false },
  { id: "def1", label: "DEF", position: "DEF", x: 10, y: 64, starter: true },
  { id: "def2", label: "DEF", position: "DEF", x: 30, y: 68, starter: true },
  { id: "def3", label: "DEF", position: "DEF", x: 50, y: 72, starter: true },
  { id: "def4", label: "DEF", position: "DEF", x: 70, y: 68, starter: true },
  { id: "def5", label: "DEF", position: "DEF", x: 90, y: 64, starter: false },
  { id: "gk1", label: "GK", position: "GK", x: 40, y: 90, starter: true },
  { id: "gk2", label: "GK", position: "GK", x: 60, y: 90, starter: false },
];

const formatPrice = (value: number) => `${value.toFixed(1)}m`;
const playerInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const teamCode = (player: Pick<FantasyPlayer, "teamAbbreviation" | "teamName">) =>
  (player.teamAbbreviation || player.teamName.replace(/[^A-Za-z]/g, "").slice(0, 3)).toUpperCase();
const playerScore = (player?: FantasyPlayer) => {
  if (!player) return 0;
  return (
    player.stats.fantasyPoints * 8 +
    player.stats.starts * 5 +
    player.stats.minutes / 12 +
    player.stats.goals * 6 +
    player.stats.assists * 4 +
    player.stats.cleanSheets * 2 -
    player.price * 0.5
  );
};

const slotStarterRank = (slot: SquadSlot) => {
  if (!slot.starter) return null;
  return squadSlots.filter((item) => item.position === slot.position && item.starter).findIndex((item) => item.id === slot.id) + 1;
};
const slotBenchOrder = (slot: SquadSlot) => {
  if (slot.starter) return null;
  if (slot.position === "GK") return null;
  return squadSlots.filter((item) => !item.starter && item.position !== "GK").findIndex((item) => item.id === slot.id) + 1;
};

const SectionCard = ({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) => (
  <section className={`rounded-3xl border border-[#FAC938]/35 bg-card/85 shadow-sm backdrop-blur ${className}`}>
    {(title || action) && (
      <div className="flex flex-col gap-3 border-b border-[#FAC938]/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {title ? <h2 className="text-lg font-black sm:text-xl">{title}</h2> : <span />}
        {action}
      </div>
    )}
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const LoginGate = () => (
  <SectionCard className="mx-auto max-w-2xl">
    <div className="py-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#FAC938]/50 bg-[#FAC938]/10 text-[#FAC938]"><Lock className="h-6 w-6" /></div>
      <h2 className="mt-4 text-2xl font-black">Sign in to enter Fantasy Game</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">A normal account is required to save a squad and appear on the prize leaderboard. Guest accounts cannot enter.</p>
      <Link to="/profile?mode=login" className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition-transform hover:scale-105">Log in or create account</Link>
    </div>
  </SectionCard>
);

const PoolStatus = ({ pool, totalPoints }: { pool: FantasyPoolResponse; totalPoints: number }) => (
  <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-border bg-background/60 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Active round</div><div className="mt-1 font-black">{pool.round.name}</div></div>
      <div className="rounded-2xl border border-border bg-background/60 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Budget</div><div className="mt-1 font-black text-[#FAC938]">{pool.round.budget}m</div></div>
      <div className="rounded-2xl border border-border bg-background/60 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Points</div><div className="mt-1 font-black text-[#FAC938]">{totalPoints}</div></div>
      <div className="rounded-2xl border border-border bg-background/60 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Player pool</div><div className="mt-1 font-black">{pool.players.length} players</div></div>
      <div className="rounded-2xl border border-border bg-background/60 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Deadline</div><div className="mt-1 text-sm font-black">{pool.round.locked ? "Locked" : "First match halftime"}</div></div>
    </div>
    {pool.teams.length > 0 && (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pool.teams.map((team) => (
          <span key={team.id} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#FAC938]/30 bg-[#FAC938]/10 px-3 py-1.5 text-xs font-black">
            {team.logo && <img src={team.logo} alt="" className="h-4 w-4 rounded-full object-cover" />}
            {team.abbreviation || team.name}
          </span>
        ))}
      </div>
    )}
  </div>
);

const selectInitialSlots = (players: FantasySquadPlayer[]) => {
  const assignments: Record<string, string | null> = Object.fromEntries(squadSlots.map((slot) => [slot.id, null]));
  const grouped = new Map<FantasyPosition, FantasySquadPlayer[]>();
  for (const position of positionOrder) {
    grouped.set(
      position,
      players
        .filter((player) => player.position === position)
        .sort((a, b) => {
          if (a.role !== b.role) return a.role === "starter" ? -1 : 1;
          return (a.benchOrder ?? 99) - (b.benchOrder ?? 99);
        }),
    );
  }
  for (const slot of squadSlots) {
    const player = grouped.get(slot.position)?.shift();
    assignments[slot.id] = player?.playerId ?? null;
  }
  return assignments;
};

const FieldPlayerCard = ({ player, slot, isCaptain, onPick, onRemove, onCaptain }: { player: FantasyPlayer | null; slot: SquadSlot; isCaptain: boolean; onPick: () => void; onRemove: () => void; onCaptain: () => void }) => {
  const canBeCaptain = slot.starter && player;
  return (
    <div className="group relative w-[52px] text-center min-[390px]:w-[62px] sm:w-[96px]">
      {player ? (
        <div className="overflow-hidden rounded-lg border border-white/75 bg-black shadow-xl">
          <button type="button" onClick={onPick} className="block w-full" title={player.name}>
            <div className="relative grid h-9 place-items-center overflow-hidden bg-[#0d3c65] min-[390px]:h-11 sm:h-16">
              {player.headshotUrl ? (
                <img src={player.headshotUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
              ) : (
                <span className="text-xs font-black text-white sm:text-lg">{playerInitials(player.name)}</span>
              )}
              {!slot.starter && <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[7px] font-black text-[#FAC938] sm:text-[8px]">SUB</span>}
            </div>
            <div className="truncate bg-white px-1 py-0.5 text-[8px] font-black leading-tight text-black min-[390px]:text-[9px] sm:py-1 sm:text-sm">{player.name}</div>
            <div className="flex items-center justify-center gap-1 bg-black px-1 py-0.5 text-[8px] font-black text-white min-[390px]:text-[9px] sm:text-sm">
              <span>{formatPrice(player.price)}</span><span className="text-[#FAC938]">{teamCode(player)}</span>
            </div>
          </button>
          <button type="button" onClick={onRemove} className="absolute -left-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-red-600 text-white shadow" aria-label={`Remove ${player.name}`}><X className="h-3 w-3" /></button>
          {canBeCaptain && (
            <button type="button" onClick={onCaptain} className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[10px] font-black shadow ${isCaptain ? "bg-[#FAC938] text-black" : "bg-black text-white"}`} aria-label={`Make ${player.name} captain`}>C</button>
          )}
        </div>
      ) : (
        <button type="button" onClick={onPick} className="mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-black/25 text-white shadow-lg transition-transform hover:scale-105 hover:bg-black/40 min-[390px]:h-12 min-[390px]:w-12 sm:h-14 sm:w-14" aria-label={`Choose ${slot.label}`}>
          <Plus className="h-4 w-4" />
          <span className="text-[7px] font-black min-[390px]:text-[8px]">{slot.label}</span>
        </button>
      )}
    </div>
  );
};

const FantasyPitch = ({ assignments, poolById, activeSlotId, captainPlayerId, onSelectSlot, onRemove, onCaptain }: { assignments: Record<string, string | null>; poolById: Map<string, FantasyPlayer>; activeSlotId: string | null; captainPlayerId: string | null; onSelectSlot: (slot: SquadSlot) => void; onRemove: (slot: SquadSlot) => void; onCaptain: (slot: SquadSlot) => void }) => (
  <div className="relative aspect-[0.72] w-full overflow-hidden rounded-[22px] border border-white/20 bg-emerald-800 shadow-2xl ring-1 ring-[#FAC938]/20 sm:rounded-[30px]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,201,56,.14),transparent_34%),linear-gradient(90deg,rgba(255,255,255,.045)_50%,transparent_50%)] bg-[length:100%_100%,20%_100%]" />
    <div className="absolute inset-[4%] rounded-sm border-2 border-white/45" />
    <div className="absolute left-[18%] right-[18%] top-[4%] h-[16%] border-x-2 border-b-2 border-white/45" />
    <div className="absolute bottom-[4%] left-[18%] right-[18%] h-[16%] border-x-2 border-t-2 border-white/45" />
    <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
    <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5 -translate-y-1/2 bg-white/45" />
    {squadSlots.map((slot) => {
      const playerId = assignments[slot.id];
      const player = playerId ? poolById.get(playerId) ?? null : null;
      const active = activeSlotId === slot.id;
      return (
        <div key={slot.id} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl p-1 transition-all ${active ? "bg-[#FAC938]/25 ring-2 ring-[#FAC938]" : ""}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
          <FieldPlayerCard player={player} slot={slot} isCaptain={Boolean(player && captainPlayerId === player.id)} onPick={() => onSelectSlot(slot)} onRemove={() => onRemove(slot)} onCaptain={() => onCaptain(slot)} />
        </div>
      );
    })}
  </div>
);

const validateSquad = (assignments: Record<string, string | null>, poolById: Map<string, FantasyPlayer>, captainPlayerId: string | null, budget: number) => {
  const errors: string[] = [];
  const ids = Object.values(assignments).filter(Boolean) as string[];
  const players = ids.map((id) => poolById.get(id)).filter(Boolean) as FantasyPlayer[];
  const totalPrice = players.reduce((sum, player) => sum + player.price, 0);
  if (ids.length !== 15) errors.push("Select exactly 15 players.");
  for (const position of positionOrder) {
    const count = players.filter((player) => player.position === position).length;
    if (count !== FANTASY_SQUAD_LIMITS[position]) errors.push(`Select exactly ${FANTASY_SQUAD_LIMITS[position]} ${position} players.`);
  }
  if (new Set(ids).size !== ids.length) errors.push("A player cannot be selected twice.");
  if (totalPrice > budget) errors.push("Your squad is over budget.");
  if (!captainPlayerId) errors.push("Choose a captain.");
  if (captainPlayerId) {
    const captainSlot = squadSlots.find((slot) => assignments[slot.id] === captainPlayerId);
    if (!captainSlot?.starter) errors.push("Captain must be in a starting slot.");
  }
  return errors;
};

const PlayerRow = ({ player, selected, disabled, onAdd, onRemove }: { player: FantasyPlayer; selected: boolean; disabled: boolean; onAdd: () => void; onRemove: () => void }) => (
  <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-background/65 p-2.5 transition-colors hover:border-[#FAC938]/50 sm:gap-3 sm:p-3">
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/50 bg-secondary text-xs font-black">
      {player.headshotUrl ? <img src={player.headshotUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" /> : playerInitials(player.name)}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-black">{player.name}</span><span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">{player.position}</span></div>
      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{teamCode(player)} · {player.stats.starts} starts · {player.stats.fantasyPoints} pts</div>
    </div>
    <div className="shrink-0 text-right"><div className="text-xs font-black text-[#FAC938] sm:text-sm">{formatPrice(player.price)}</div><button type="button" onClick={selected ? onRemove : onAdd} disabled={disabled} className={`mt-1 rounded-full px-2.5 py-1 text-[10px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 ${selected ? "bg-destructive/15 text-destructive hover:bg-destructive/25" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>{selected ? "Remove" : "Add"}</button></div>
  </div>
);

const TeamBuilder = ({ pool, initialPlayers, initialCaptain, userId, onSaved }: { pool: FantasyPoolResponse; initialPlayers: FantasySquadPlayer[]; initialCaptain: string | null; userId: string; onSaved: () => void }) => {
  const poolById = useMemo(() => new Map(pool.players.map((player) => [player.id, player])), [pool.players]);
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => selectInitialSlots(initialPlayers));
  const [activeSlot, setActiveSlot] = useState<SquadSlot | null>(null);
  const [captainPlayerId, setCaptainPlayerId] = useState(initialCaptain);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<"ALL" | FantasyPosition>("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("value");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAssignments(selectInitialSlots(initialPlayers));
    setCaptainPlayerId(initialCaptain);
  }, [initialCaptain, initialPlayers]);

  const selectedIds = useMemo(() => new Set(Object.values(assignments).filter(Boolean) as string[]), [assignments]);
  const selectedPlayers = [...selectedIds].map((id) => poolById.get(id)).filter(Boolean) as FantasyPlayer[];
  const totalPrice = selectedPlayers.reduce((sum, player) => sum + player.price, 0);
  const remaining = pool.round.budget - totalPrice;
  const errors = validateSquad(assignments, poolById, captainPlayerId, pool.round.budget);
  const targetPosition = activeSlot?.position ?? null;

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pool.players
      .filter((player) => {
        if (targetPosition && player.position !== targetPosition) return false;
        if (!targetPosition && position !== "ALL" && player.position !== position) return false;
        if (team !== "ALL" && player.teamId !== team) return false;
        if (query && !`${player.name} ${player.teamName} ${player.teamAbbreviation}`.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "team") return a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name);
        if (sort === "price") return b.price - a.price || b.stats.fantasyPoints - a.stats.fantasyPoints;
        if (sort === "points") return b.stats.fantasyPoints - a.stats.fantasyPoints || b.price - a.price;
        return playerScore(b) / Math.max(4, b.price) - playerScore(a) / Math.max(4, a.price);
      });
  }, [pool.players, position, search, sort, targetPosition, team]);

  const countPosition = (positionValue: FantasyPosition) => selectedPlayers.filter((player) => player.position === positionValue).length;
  const findOpenSlot = (player: FantasyPlayer) => squadSlots.find((slot) => slot.position === player.position && !assignments[slot.id]) ?? null;

  const assignPlayer = (player: FantasyPlayer, slot = activeSlot) => {
    if (pool.round.locked) return;
    const target = slot ?? findOpenSlot(player);
    if (!target) {
      toast.error(`No open ${player.position} slot is available.`);
      return;
    }
    if (target.position !== player.position) {
      toast.error(`This slot needs a ${target.position} player.`);
      return;
    }
    const currentId = assignments[target.id];
    const replacingSame = currentId === player.id;
    const nextIds = Object.entries(assignments)
      .filter(([slotId, id]) => slotId !== target.id && id)
      .map(([, id]) => id as string);
    if (!replacingSame && nextIds.includes(player.id)) {
      toast.error("This player is already in your squad.");
      return;
    }
    const currentPlayers = nextIds.map((id) => poolById.get(id)).filter(Boolean) as FantasyPlayer[];
    if (currentPlayers.filter((item) => item.position === player.position).length >= FANTASY_SQUAD_LIMITS[player.position]) {
      toast.error(`You already have ${FANTASY_SQUAD_LIMITS[player.position]} ${player.position} players.`);
      return;
    }
    const nextPrice = currentPlayers.reduce((sum, item) => sum + item.price, 0) + player.price;
    if (nextPrice > pool.round.budget) {
      toast.error("This player would take your squad over budget.");
      return;
    }
    setAssignments((current) => ({ ...current, [target.id]: player.id }));
    setActiveSlot(null);
  };

  const removeSlot = (slot: SquadSlot) => {
    if (pool.round.locked) return;
    const removedId = assignments[slot.id];
    setAssignments((current) => ({ ...current, [slot.id]: null }));
    if (captainPlayerId && removedId === captainPlayerId) setCaptainPlayerId(null);
  };

  const autopick = () => {
    if (pool.round.locked) return;
    const nextAssignments: Record<string, string | null> = Object.fromEntries(squadSlots.map((slot) => [slot.id, null]));
    let selected = new Set<string>();

    for (const slot of squadSlots) {
      const candidate = pool.players
        .filter((player) => player.position === slot.position && !selected.has(player.id))
        .sort((a, b) => playerScore(b) / Math.max(4, b.price) - playerScore(a) / Math.max(4, a.price))[0];
      if (candidate) {
        nextAssignments[slot.id] = candidate.id;
        selected.add(candidate.id);
      }
    }

    let nextPlayers = [...selected].map((id) => poolById.get(id)).filter(Boolean) as FantasyPlayer[];
    let total = nextPlayers.reduce((sum, player) => sum + player.price, 0);
    let guard = 0;
    while (total > pool.round.budget && guard < 100) {
      guard += 1;
      const expensive = [...nextPlayers].sort((a, b) => b.price - a.price)[0];
      const replacement = pool.players
        .filter((player) => player.position === expensive.position && !selected.has(player.id) && player.price < expensive.price)
        .sort((a, b) => a.price - b.price || playerScore(b) - playerScore(a))[0];
      if (!replacement) break;
      const slotId = Object.entries(nextAssignments).find(([, id]) => id === expensive.id)?.[0];
      if (!slotId) break;
      nextAssignments[slotId] = replacement.id;
      selected.delete(expensive.id);
      selected.add(replacement.id);
      nextPlayers = [...selected].map((id) => poolById.get(id)).filter(Boolean) as FantasyPlayer[];
      total = nextPlayers.reduce((sum, player) => sum + player.price, 0);
    }

    if (total > pool.round.budget || [...selected].length < 15) {
      toast.error("Autopick could not make a valid squad inside the budget.");
      return;
    }

    const captainSlot = squadSlots
      .filter((slot) => slot.starter && nextAssignments[slot.id])
      .map((slot) => ({ slot, player: poolById.get(nextAssignments[slot.id] as string) }))
      .sort((a, b) => playerScore(b.player) - playerScore(a.player))[0];
    setAssignments(nextAssignments);
    setCaptainPlayerId(captainSlot?.player?.id ?? null);
    toast.success("Autopick created a squad. Review it before saving.");
  };

  const resetSquad = () => {
    if (pool.round.locked) return;
    setAssignments(Object.fromEntries(squadSlots.map((slot) => [slot.id, null])));
    setCaptainPlayerId(null);
    setActiveSlot(null);
  };

  const handleSave = async () => {
    if (pool.round.locked) return;
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    const rows: FantasySquadPlayer[] = squadSlots
      .map((slot) => {
        const playerId = assignments[slot.id];
        if (!playerId) return null;
        const player = poolById.get(playerId);
        if (!player) return null;
        const role = slot.starter ? "starter" : "bench";
        const benchOrder = slotBenchOrder(slot);
        return { ...toSquadPlayer(player, role, benchOrder), selectedAt: new Date().toISOString() };
      })
      .filter(Boolean) as FantasySquadPlayer[];

    setSaving(true);
    try {
      await saveFantasySquad({ userId, roundCode: pool.round.code, budget: pool.round.budget, captainPlayerId: captainPlayerId!, players: rows });
      toast.success("Fantasy squad saved.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the squad.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,.88fr)]">
      <div className="space-y-5">
        <SectionCard title="Build your 15-player squad" action={<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button type="button" onClick={autopick} disabled={pool.round.locked} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#FAC938] px-4 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"><Sparkles className="h-4 w-4" /> Autopick</button></div>}>
          <div className="mx-auto w-full max-w-[760px] overflow-hidden px-0.5 sm:px-0">
            <FantasyPitch assignments={assignments} poolById={poolById} activeSlotId={activeSlot?.id ?? null} captainPlayerId={captainPlayerId} onSelectSlot={(slot) => { setActiveSlot(slot); setPosition(slot.position); }} onRemove={removeSlot} onCaptain={(slot) => { if (!slot.starter) { toast.error("Captain must be in a starting slot."); return; } const playerId = assignments[slot.id]; if (playerId) setCaptainPlayerId(playerId); }} />
          </div>
        </SectionCard>
        <SectionCard title="Squad details">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-secondary/55 p-3 text-center"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Selected</div><div className="mt-1 text-xl font-black">{selectedIds.size}/15</div></div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Spent</div><div className="mt-1 text-xl font-black">{formatPrice(totalPrice)}</div></div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</div><div className={`mt-1 text-xl font-black ${remaining < 0 ? "text-destructive" : "text-[#FAC938]"}`}>{formatPrice(remaining)}</div></div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Captain</div><div className="mt-1 text-xl font-black">{captainPlayerId ? "1/1" : "0/1"}</div></div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Points</div><div className="mt-1 text-xl font-black text-[#FAC938]">0</div></div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">{positionOrder.map((item) => <div key={item} className="rounded-xl border border-border px-2 py-2 text-center"><div className="text-[9px] font-bold text-muted-foreground">{item}</div><div className="font-black">{countPosition(item)}/{FANTASY_SQUAD_LIMITS[item]}</div></div>)}</div>
          {errors.length > 0 && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"><div className="text-xs font-black text-amber-500">Before saving:</div><ul className="mt-1 space-y-1 text-xs text-muted-foreground">{errors.slice(0, 6).map((error) => <li key={error}>• {error}</li>)}</ul></div>}
          <div className="mt-5 grid gap-2 sm:grid-cols-[auto_1fr]"><button type="button" onClick={resetSquad} disabled={pool.round.locked || selectedIds.size === 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw className="h-4 w-4" /> Reset</button><button type="button" onClick={handleSave} disabled={saving || pool.round.locked || errors.length > 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Fantasy Team</button></div>
        </SectionCard>
      </div>
      <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <SectionCard title="Player selector">
          {activeSlot && <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#FAC938]/40 bg-[#FAC938]/10 p-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FAC938]">Selection target</div><div className="text-sm font-black">{activeSlot.label} · {activeSlot.position}</div></div><button type="button" onClick={() => setActiveSlot(null)} className="grid h-8 w-8 place-items-center rounded-full border border-[#FAC938]/40" aria-label="Clear active selection target"><X className="h-4 w-4" /></button></div>}
          <div className="grid gap-2"><label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player or country" className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><div className="grid gap-2 sm:grid-cols-3"><select value={position} onChange={(event) => setPosition(event.target.value as "ALL" | FantasyPosition)} disabled={Boolean(activeSlot)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs font-black disabled:opacity-50"><option value="ALL">All positions</option>{positionOrder.map((value) => <option key={value} value={value}>{value}</option>)}</select><select value={team} onChange={(event) => setTeam(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs font-black"><option value="ALL">All teams</option>{pool.teams.map((value) => <option key={value.id} value={value.id}>{value.abbreviation || value.name}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs font-black"><option value="value">Best value</option><option value="points">Points</option><option value="price">Price</option><option value="name">Name</option><option value="team">Team</option></select></div></div>
          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1 xl:max-h-[690px]">{filteredPlayers.map((player) => <PlayerRow key={player.id} player={player} selected={selectedIds.has(player.id)} disabled={pool.round.locked} onAdd={() => assignPlayer(player)} onRemove={() => { const slot = squadSlots.find((item) => assignments[item.id] === player.id); if (slot) removeSlot(slot); }} />)}{filteredPlayers.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No player matches the current filters.</div>}</div>
        </SectionCard>
      </div>
    </div>
  );
};

const PlayersTab = ({ pool }: { pool: FantasyPoolResponse }) => <SectionCard title="All QF players"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pool.players.map((player) => <div key={player.id} className="rounded-2xl border border-[#FAC938]/35 bg-background/65 p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/50 bg-secondary text-xs font-black">{player.headshotUrl ? <img src={player.headshotUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" /> : playerInitials(player.name)}</div><div className="min-w-0 flex-1"><div className="truncate font-black">{player.name}</div><div className="text-xs text-muted-foreground">{teamCode(player)} · {player.position}</div></div><div className="text-lg font-black text-[#FAC938]">{formatPrice(player.price)}</div></div><div className="mt-4 grid grid-cols-4 gap-2 text-center"><div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">MIN</div><div className="text-sm font-black">{player.stats.minutes}</div></div><div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">G</div><div className="text-sm font-black">{player.stats.goals}</div></div><div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">A</div><div className="text-sm font-black">{player.stats.assists}</div></div><div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">PTS</div><div className="text-sm font-black">{player.stats.fantasyPoints}</div></div></div></div>)}</div></SectionCard>;

const PointsTab = ({ rows }: { rows: FantasyPointRow[] }) => { const total = rows.reduce((sum, row) => sum + row.totalPoints, 0); return <div className="space-y-5"><SectionCard><div className="flex items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total points</div><div className="mt-1 text-4xl font-black text-[#FAC938]">{total}</div></div><Star className="h-10 w-10 text-[#FAC938]" /></div></SectionCard><SectionCard title="Match by match points">{rows.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">Points will appear here after match data has been reviewed and scored.</div> : <div className="space-y-2">{rows.map((row) => <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/55 p-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{row.playerName}</div><div className="text-[11px] text-muted-foreground">{row.teamName} · {row.roundCode} · Match {row.matchId}</div></div><div className="text-right"><div className="text-xl font-black text-[#FAC938]">{row.totalPoints}</div><div className="text-[9px] uppercase tracking-wide text-muted-foreground">{row.finalized ? "Final" : "Provisional"}</div></div></div>)}</div>}</SectionCard></div>; };
const LeaderboardTab = ({ rows }: { rows: FantasyLeaderboardRow[] }) => <SectionCard title="Overall Leaderboard"><p className="mb-4 text-sm text-muted-foreground">Quarter finals, Semi finals, Third place Match and Final points are added together. The top three managers receive prizes.</p>{rows.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">The leaderboard will appear after the first points are published.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-[#FAC938]/30 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Manager</th><th className="px-3 py-3 text-center">Points</th><th className="px-3 py-3 text-center">Goals</th><th className="px-3 py-3 text-center">Assists</th><th className="px-3 py-3 text-center">Clean sheets</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.userId} className="border-b border-border/70 last:border-0"><td className="px-3 py-3 font-black"><span className="inline-flex items-center gap-1.5">{index < 3 && <Medal className="h-4 w-4 text-[#FAC938]" />}{index + 1}</span></td><td className="px-3 py-3 font-bold">{row.displayName}</td><td className="px-3 py-3 text-center text-lg font-black text-[#FAC938]">{row.totalPoints}</td><td className="px-3 py-3 text-center">{row.goals}</td><td className="px-3 py-3 text-center">{row.assists}</td><td className="px-3 py-3 text-center">{row.cleanSheets}</td></tr>)}</tbody></table></div>}</SectionCard>;
const ScoringTables = () => <div className="space-y-5"><SectionCard title="Scoring Table"><div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-sm"><thead><tr className="bg-secondary/70"><th className="border border-border px-3 py-2 text-left">Event</th>{positionOrder.map((position) => <th key={position} className="border border-border px-3 py-2 text-center">{position}</th>)}</tr></thead><tbody>{FANTASY_SCORING.map((row) => <tr key={row.event}><td className="border border-border px-3 py-2 font-semibold">{row.event}</td>{positionOrder.map((position) => <td key={position} className="border border-border px-3 py-2 text-center font-bold">{row[position] ?? "—"}</td>)}</tr>)}</tbody></table></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">A player receives either the 1 to 59 minute score or the 60 plus minute score, not both.</p></SectionCard><SectionCard title="Penalty Shootout Scoring"><div className="space-y-2">{FANTASY_SHOOTOUT_SCORING.map((row) => <div key={row.event} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/55 p-3"><span className="text-sm font-semibold">{row.event}</span><span className="text-lg font-black text-[#FAC938]">{row.points > 0 ? "+" : ""}{row.points}</span></div>)}</div></SectionCard></div>;
const HowToPlayTab = () => <div className="space-y-5"><SectionCard title="Build your squad"><p className="text-sm leading-relaxed text-muted-foreground">Select 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards. Pick players by tapping a position card on the pitch, then choosing a player from the selector.</p></SectionCard><SectionCard title="Budget"><p className="text-sm leading-relaxed text-muted-foreground">Quarter finals start with 105m. Semi finals use 125m. The Final round uses 135m. Extra budget becomes usable when the next round opens.</p></SectionCard><SectionCard title="Points"><p className="text-sm leading-relaxed text-muted-foreground">The quick Points card shows your current total. Detailed points are available in the Points tab after match data is reviewed.</p></SectionCard><SectionCard title="Captain"><p className="text-sm leading-relaxed text-muted-foreground">Choose one captain from the starting positions. Positive captain points are doubled. Negative points are counted once.</p></SectionCard><ScoringTables /></div>;
const FaqTab = () => <div className="grid gap-3 lg:grid-cols-2">{FANTASY_FAQ.map((item) => <details key={item.question} className="group rounded-2xl border border-[#FAC938]/35 bg-card/80 p-4 open:border-[#FAC938]/65"><summary className="cursor-pointer list-none pr-6 text-sm font-black marker:hidden">{item.question}</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p></details>)}</div>;

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
  const canEnter = Boolean(user && !isGuest);
  const totalPoints = points.reduce((sum, row) => sum + row.totalPoints, 0);

  const refreshPool = async () => { setPoolLoading(true); setPoolError(null); try { setPool(await fetchFantasyPool()); } catch (error) { setPoolError(error instanceof Error ? error.message : "Could not load ESPN fantasy data."); } finally { setPoolLoading(false); } };
  useEffect(() => { void refreshPool(); }, []);
  useEffect(() => { if (!user || isGuest || !pool) return; let cancelled = false; void Promise.all([loadFantasySquad(user.id, pool.round.code), loadFantasyPoints(user.id), loadFantasyLeaderboard()]).then(([squad, pointRows, leaderboardRows]) => { if (cancelled) return; setSquadPlayers(squad.players); setCaptainPlayerId(squad.captainPlayerId); setPoints(pointRows); setLeaderboard(leaderboardRows); }).catch((error) => { if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load fantasy account data."); }); return () => { cancelled = true; }; }, [isGuest, pool, revision, user]);
  useEffect(() => { if (activeTab !== "leaderboard") return; void loadFantasyLeaderboard().then(setLeaderboard).catch(() => undefined); }, [activeTab]);

  const renderProtectedContent = () => {
    if (authLoading) return <div className="grid min-h-[280px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
    if (!canEnter) return <LoginGate />;
    if (!pool) return null;
    if (activeTab === "team") return <div className="space-y-5"><PoolStatus pool={pool} totalPoints={totalPoints} />{pool.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">{warning}</div>)}<TeamBuilder pool={pool} initialPlayers={squadPlayers} initialCaptain={captainPlayerId} userId={user!.id} onSaved={() => setRevision((current) => current + 1)} /></div>;
    return <PointsTab rows={points} />;
  };

  return (
    <div className="container py-7 sm:py-10">
      <div className="relative overflow-hidden rounded-3xl border border-[#FAC938]/55 bg-gradient-to-br from-[#FAC938]/15 via-background to-emerald-700/10 p-5 sm:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FAC938]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-72 rounded-tl-full border-l border-t border-white/10 bg-[linear-gradient(90deg,rgba(255,255,255,.05)_50%,transparent_50%)] bg-[length:20%_100%] opacity-50" />
        <div className="relative max-w-3xl"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#FAC938]"><Trophy className="h-4 w-4" /> Knockout Edition</div><h1 className="mt-3 text-4xl font-black sm:text-5xl">Fantasy Game</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Build a 15 player squad on the pitch for the Quarter finals, Semi finals, Third place Match and Final.</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="inline-flex items-center gap-1.5 rounded-full border border-[#FAC938]/40 bg-[#FAC938]/10 px-3 py-1.5 text-[#FAC938]"><Coins className="h-3.5 w-3.5" /> 105m starting budget</span><span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/55 px-3 py-1.5"><UsersRound className="h-3.5 w-3.5" /> 15 player squad</span><span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/55 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Top 3 win prizes</span></div></div>
      </div>
      <div className="sticky top-14 z-30 -mx-4 mt-5 overflow-x-auto border-y border-border bg-background/92 px-4 py-2 backdrop-blur-xl sm:top-16 sm:mx-0 sm:rounded-2xl sm:border"><div className="flex min-w-max gap-1">{tabs.map((tab) => { const Icon = tab.icon; const active = activeTab === tab.id; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition-colors sm:px-4 sm:text-sm ${active ? "bg-[#FAC938] text-black" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}</div></div>
      <main className="mt-5">{poolLoading && ["team", "players"].includes(activeTab) ? <div className="grid min-h-[360px] place-items-center rounded-2xl border border-border"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Collecting the current QF player pool from ESPN…</p></div></div> : poolError && ["team", "players"].includes(activeTab) ? <SectionCard><div className="py-8 text-center"><p className="text-sm text-destructive">{poolError}</p><button type="button" onClick={refreshPool} className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-black"><RefreshCw className="h-4 w-4" /> Try again</button></div></SectionCard> : ["team", "points"].includes(activeTab) ? renderProtectedContent() : activeTab === "players" && pool ? <PlayersTab pool={pool} /> : activeTab === "leaderboard" ? <LeaderboardTab rows={leaderboard} /> : activeTab === "how" ? <HowToPlayTab /> : activeTab === "faq" ? <FaqTab /> : null}</main>
      <div className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><UserRound className="h-3.5 w-3.5" /> Fantasy statistics are provisional until reviewed.</div>
    </div>
  );
};

export default FantasyGame;
