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
  { id: "team", label: "My Squad", icon: UsersRound },
  { id: "players", label: "Players", icon: ListFilter },
  { id: "points", label: "Points", icon: Star },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "how", label: "How to Play", icon: BookOpen },
  { id: "faq", label: "FAQ", icon: CircleHelp },
] as const;

type TabId = (typeof tabs)[number]["id"];
type SortMode = "value" | "points" | "price" | "name" | "team";
type FieldSlot = {
  id: string;
  label: string;
  position: FantasyPosition;
  x: number;
  y: number;
};
type ActiveTarget =
  | { kind: "field"; slot: FieldSlot }
  | { kind: "bench-gk" }
  | { kind: "bench-outfield" }
  | null;

const positionOrder: FantasyPosition[] = ["GK", "DEF", "MID", "FW"];

const positionName: Record<FantasyPosition, string> = {
  GK: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FW: "Forwards",
};

const shortPositionName: Record<FantasyPosition, string> = {
  GK: "GK",
  DEF: "DEF",
  MID: "MID",
  FW: "FW",
};

const slot = (
  id: string,
  label: string,
  position: FantasyPosition,
  x: number,
  y: number,
): FieldSlot => ({ id, label, position, x, y });

const fantasyFormations: Record<(typeof FANTASY_FORMATIONS)[number], FieldSlot[]> = {
  "3-4-3": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lcb", "LCB", "DEF", 26, 72),
    slot("cb", "CB", "DEF", 50, 75),
    slot("rcb", "RCB", "DEF", 74, 72),
    slot("lm", "LM", "MID", 15, 49),
    slot("lcm", "LCM", "MID", 39, 53),
    slot("rcm", "RCM", "MID", 61, 53),
    slot("rm", "RM", "MID", 85, 49),
    slot("lw", "LW", "FW", 20, 23),
    slot("st", "ST", "FW", 50, 16),
    slot("rw", "RW", "FW", 80, 23),
  ],
  "3-5-2": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lcb", "LCB", "DEF", 27, 72),
    slot("cb", "CB", "DEF", 50, 75),
    slot("rcb", "RCB", "DEF", 73, 72),
    slot("lwb", "LWB", "MID", 12, 49),
    slot("lcm", "LCM", "MID", 35, 52),
    slot("cam", "CAM", "MID", 50, 39),
    slot("rcm", "RCM", "MID", 65, 52),
    slot("rwb", "RWB", "MID", 88, 49),
    slot("lst", "LST", "FW", 38, 18),
    slot("rst", "RST", "FW", 62, 18),
  ],
  "4-3-3": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lb", "LB", "DEF", 15, 70),
    slot("lcb", "LCB", "DEF", 38, 73),
    slot("rcb", "RCB", "DEF", 62, 73),
    slot("rb", "RB", "DEF", 85, 70),
    slot("lcm", "LCM", "MID", 28, 50),
    slot("cm", "CM", "MID", 50, 56),
    slot("rcm", "RCM", "MID", 72, 50),
    slot("lw", "LW", "FW", 20, 23),
    slot("st", "ST", "FW", 50, 16),
    slot("rw", "RW", "FW", 80, 23),
  ],
  "4-4-2": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lb", "LB", "DEF", 15, 70),
    slot("lcb", "LCB", "DEF", 38, 73),
    slot("rcb", "RCB", "DEF", 62, 73),
    slot("rb", "RB", "DEF", 85, 70),
    slot("lm", "LM", "MID", 16, 48),
    slot("lcm", "LCM", "MID", 39, 53),
    slot("rcm", "RCM", "MID", 61, 53),
    slot("rm", "RM", "MID", 84, 48),
    slot("lst", "LST", "FW", 38, 19),
    slot("rst", "RST", "FW", 62, 19),
  ],
  "4-5-1": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lb", "LB", "DEF", 15, 70),
    slot("lcb", "LCB", "DEF", 38, 73),
    slot("rcb", "RCB", "DEF", 62, 73),
    slot("rb", "RB", "DEF", 85, 70),
    slot("lm", "LM", "MID", 14, 48),
    slot("lcm", "LCM", "MID", 35, 54),
    slot("cm", "CM", "MID", 50, 42),
    slot("rcm", "RCM", "MID", 65, 54),
    slot("rm", "RM", "MID", 86, 48),
    slot("st", "ST", "FW", 50, 17),
  ],
  "5-3-2": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lwb", "LWB", "DEF", 10, 65),
    slot("lcb", "LCB", "DEF", 30, 72),
    slot("cb", "CB", "DEF", 50, 75),
    slot("rcb", "RCB", "DEF", 70, 72),
    slot("rwb", "RWB", "DEF", 90, 65),
    slot("lcm", "LCM", "MID", 29, 49),
    slot("cm", "CM", "MID", 50, 55),
    slot("rcm", "RCM", "MID", 71, 49),
    slot("lst", "LST", "FW", 38, 19),
    slot("rst", "RST", "FW", 62, 19),
  ],
  "5-4-1": [
    slot("gk", "GK", "GK", 50, 89),
    slot("lwb", "LWB", "DEF", 10, 65),
    slot("lcb", "LCB", "DEF", 30, 72),
    slot("cb", "CB", "DEF", 50, 75),
    slot("rcb", "RCB", "DEF", 70, 72),
    slot("rwb", "RWB", "DEF", 90, 65),
    slot("lm", "LM", "MID", 17, 48),
    slot("lcm", "LCM", "MID", 39, 53),
    slot("rcm", "RCM", "MID", 61, 53),
    slot("rm", "RM", "MID", 83, 48),
    slot("st", "ST", "FW", 50, 17),
  ],
};

const formatPrice = (value: number) => `${value.toFixed(1)}m`;
const formationCounts = (formationId: string) => {
  const slots = fantasyFormations[formationId as keyof typeof fantasyFormations] ?? fantasyFormations["4-3-3"];
  return positionOrder.reduce(
    (counts, position) => ({
      ...counts,
      [position]: slots.filter((slotItem) => slotItem.position === position).length,
    }),
    {} as Record<FantasyPosition, number>,
  );
};

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

const SectionCard = ({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) => (
  <section
    className={`rounded-3xl border border-[#FAC938]/35 bg-card/85 shadow-sm backdrop-blur ${className}`}
  >
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 border-b border-[#FAC938]/20 px-4 py-3 sm:px-5">
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
  <div className="space-y-3">
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-border bg-background/60 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Active round
        </div>
        <div className="mt-1 font-black">{pool.round.name}</div>
      </div>
      <div className="rounded-2xl border border-border bg-background/60 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Budget
        </div>
        <div className="mt-1 font-black text-[#FAC938]">{pool.round.budget}m</div>
      </div>
      <div className="rounded-2xl border border-border bg-background/60 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Player pool
        </div>
        <div className="mt-1 font-black">{pool.players.length} players</div>
      </div>
      <div className="rounded-2xl border border-border bg-background/60 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Deadline
        </div>
        <div className="mt-1 text-sm font-black">
          {pool.round.locked ? "Locked" : "First-match halftime"}
        </div>
      </div>
    </div>
    {pool.teams.length > 0 && (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pool.teams.map((team) => (
          <span
            key={team.id}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#FAC938]/30 bg-[#FAC938]/10 px-3 py-1.5 text-xs font-black"
          >
            {team.logo && <img src={team.logo} alt="" className="h-4 w-4 rounded-full object-cover" />}
            {team.abbreviation || team.name}
          </span>
        ))}
      </div>
    )}
  </div>
);

const PlayerAvatar = ({ player, className = "h-10 w-10" }: { player: FantasyPlayer; className?: string }) => (
  <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/50 bg-secondary text-xs font-black ${className}`}>
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

const selectedToFantasyPlayer = (
  selected: FantasySquadPlayer,
  poolById: Map<string, FantasyPlayer>,
): FantasyPlayer =>
  poolById.get(selected.playerId) ?? {
    id: selected.playerId,
    name: selected.name,
    teamId: selected.teamName,
    teamName: selected.teamName,
    teamAbbreviation: selected.teamName.slice(0, 3).toUpperCase(),
    position: selected.position,
    price: selected.price,
    headshotUrl: null,
    stats: {
      matches: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      saves: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      fantasyPoints: 0,
    },
  };

const normalizeBenchOrders = (items: FantasySquadPlayer[]) => {
  let order = 1;
  return items.map((item) => {
    if (item.role === "starter") return { ...item, benchOrder: null };
    if (item.position === "GK") return { ...item, benchOrder: null };
    return { ...item, benchOrder: order++ };
  });
};

const rebalanceForFormation = (
  items: FantasySquadPlayer[],
  formationId: string,
  poolById: Map<string, FantasyPlayer>,
) => {
  const counts = formationCounts(formationId);
  const balanced: FantasySquadPlayer[] = [];

  for (const position of positionOrder) {
    const rows = items
      .filter((item) => item.position === position)
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "starter" ? -1 : 1;
        return playerScore(poolById.get(b.playerId)) - playerScore(poolById.get(a.playerId));
      });

    rows.forEach((row, index) => {
      balanced.push({
        ...row,
        role: index < counts[position] ? "starter" : "bench",
        benchOrder: null,
      });
    });
  }

  return normalizeBenchOrders(balanced);
};

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
  formationId: string,
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
  if (formationFromPlayers(players) !== formationId) {
    errors.push(`Your starters must match the ${formationId} formation.`);
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

const PitchPlayerCard = ({
  player,
  selected,
  slot,
  isCaptain,
  onPick,
  onRemove,
  onCaptain,
}: {
  player: FantasyPlayer | null;
  selected?: FantasySquadPlayer;
  slot: FieldSlot;
  isCaptain: boolean;
  onPick: () => void;
  onRemove: () => void;
  onCaptain: () => void;
}) => (
    <div className="group relative w-[52px] text-center min-[390px]:w-[58px] sm:w-[90px]">
      {player ? (
        <>
          <button
            type="button"
            onClick={onPick}
            className="mx-auto block transition-transform hover:scale-105"
            title={player.name}
          >
            <PlayerAvatar player={player} className="mx-auto h-10 w-10 border-2 min-[390px]:h-11 min-[390px]:w-11 sm:h-14 sm:w-14" />
            <span className="mt-1 block truncate rounded-md bg-black/70 px-1 py-0.5 text-[8px] font-black leading-tight text-white backdrop-blur min-[390px]:text-[9px] sm:rounded-lg sm:px-1.5 sm:py-1 sm:text-[10px]">
              {player.name}
            </span>
            <span className="mt-0.5 block truncate rounded-full bg-[#FAC938] px-1 py-0.5 text-[7px] font-black text-black min-[390px]:text-[8px] sm:px-1.5">
              {formatPrice(player.price)} · {player.teamAbbreviation || player.teamName.slice(0, 3).toUpperCase()}
            </span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white shadow sm:-right-1 sm:-top-1 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Remove ${player.name}`}
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>
          <button
            type="button"
            onClick={onCaptain}
            className={`absolute -left-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full border text-[9px] font-black shadow sm:-left-1 sm:-top-1 sm:h-6 sm:w-6 sm:text-[10px] ${
              isCaptain
                ? "border-[#FAC938] bg-[#FAC938] text-black"
                : "border-white/40 bg-black/65 text-white"
            }`}
            aria-label={`Make ${player.name} captain`}
          >
            C
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-black/25 text-white shadow-lg transition-transform hover:scale-105 hover:bg-black/40 min-[390px]:h-11 min-[390px]:w-11 sm:h-14 sm:w-14"
          aria-label={`Choose ${slot.label}`}
        >
          <Plus className="h-4 w-4" />
          <span className="text-[7px] font-black min-[390px]:text-[8px]">{slot.label}</span>
        </button>
      )}
    </div>
);

const FantasyPitch = ({
  formationId,
  players,
  poolById,
  captainPlayerId,
  activeTarget,
  onSelectSlot,
  onRemovePlayer,
  onCaptain,
}: {
  formationId: string;
  players: FantasySquadPlayer[];
  poolById: Map<string, FantasyPlayer>;
  captainPlayerId: string | null;
  activeTarget: ActiveTarget;
  onSelectSlot: (slot: FieldSlot) => void;
  onRemovePlayer: (playerId: string) => void;
  onCaptain: (playerId: string) => void;
}) => {
  const slots = fantasyFormations[formationId as keyof typeof fantasyFormations] ?? fantasyFormations["4-3-3"];
  const startersByPosition = new Map<FantasyPosition, FantasySquadPlayer[]>();
  for (const position of positionOrder) {
    startersByPosition.set(
      position,
      players.filter((player) => player.role === "starter" && player.position === position),
    );
  }
  const usedIndex = new Map<FantasyPosition, number>();

  return (
    <div className="relative aspect-[0.72] w-full overflow-hidden rounded-[22px] border border-white/20 bg-emerald-800 shadow-2xl ring-1 ring-[#FAC938]/20 sm:rounded-[30px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,201,56,.14),transparent_34%),linear-gradient(90deg,rgba(255,255,255,.045)_50%,transparent_50%)] bg-[length:100%_100%,20%_100%]" />
      <div className="absolute inset-[4%] rounded-sm border-2 border-white/45" />
      <div className="absolute left-[18%] right-[18%] top-[4%] h-[16%] border-x-2 border-b-2 border-white/45" />
      <div className="absolute bottom-[4%] left-[18%] right-[18%] h-[16%] border-x-2 border-t-2 border-white/45" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
      <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5 -translate-y-1/2 bg-white/45" />
      <div className="absolute left-1/2 top-[4%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/60" />
      <div className="absolute left-1/2 bottom-[4%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/60" />

      {slots.map((slotItem) => {
        const currentIndex = usedIndex.get(slotItem.position) ?? 0;
        usedIndex.set(slotItem.position, currentIndex + 1);
        const selected = startersByPosition.get(slotItem.position)?.[currentIndex] ?? null;
        const player = selected ? selectedToFantasyPlayer(selected, poolById) : null;
        const active = activeTarget?.kind === "field" && activeTarget.slot.id === slotItem.id;

        return (
          <div
            key={slotItem.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl p-1 transition-all ${
              active ? "bg-[#FAC938]/25 ring-2 ring-[#FAC938]" : ""
            }`}
            style={{ left: `${slotItem.x}%`, top: `${slotItem.y}%` }}
          >
            <PitchPlayerCard
              player={player}
              selected={selected ?? undefined}
              slot={slotItem}
              isCaptain={selected?.playerId === captainPlayerId}
              onPick={() => onSelectSlot(slotItem)}
              onRemove={() => selected && onRemovePlayer(selected.playerId)}
              onCaptain={() => selected && onCaptain(selected.playerId)}
            />
            {selected?.playerId === captainPlayerId && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#FAC938] px-1.5 py-0.5 text-[7px] font-black text-black shadow sm:-top-3 sm:px-2 sm:text-[8px]">
                CAPTAIN
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const PlayerRow = ({
  player,
  selected,
  disabled,
  targetText,
  onPrimary,
  onRemove,
}: {
  player: FantasyPlayer;
  selected: boolean;
  disabled: boolean;
  targetText: string;
  onPrimary: () => void;
  onRemove: () => void;
}) => (
  <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-background/65 p-2.5 transition-colors hover:border-[#FAC938]/50 sm:gap-3 sm:p-3">
    <PlayerAvatar player={player} />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-black">{player.name}</span>
        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
          {player.position}
        </span>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {player.teamAbbreviation || player.teamName} · {player.stats.starts} starts · {player.stats.fantasyPoints} pts
      </div>
    </div>
    <div className="shrink-0 text-right">
      <div className="text-xs font-black text-[#FAC938] sm:text-sm">{formatPrice(player.price)}</div>
      <button
        type="button"
        onClick={selected ? onRemove : onPrimary}
        disabled={disabled}
        className={`mt-1 rounded-full px-2.5 py-1 text-[10px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 ${
          selected
            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {selected ? "Remove" : targetText}
      </button>
    </div>
  </div>
);

const BenchSlot = ({
  label,
  hint,
  player,
  active,
  onPick,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  label: string;
  hint: string;
  player: FantasySquadPlayer | null;
  active: boolean;
  onPick: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) => (
  <div
    className={`rounded-2xl border p-3 transition-colors ${
      active
        ? "border-[#FAC938] bg-[#FAC938]/10"
        : "border-border bg-background/65"
    }`}
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <div>
        <div className="text-xs font-black">{label}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
      <button
        type="button"
        onClick={onPick}
        className="rounded-full border border-[#FAC938]/40 px-2 py-1 text-[10px] font-black text-[#FAC938]"
      >
        Pick
      </button>
    </div>
    {player ? (
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[10px] font-black">
          {player.position}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black">{player.name}</div>
          <div className="text-[10px] text-muted-foreground">{player.teamName} · {formatPrice(player.price)}</div>
        </div>
        {onMoveUp && onMoveDown && (
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={onMoveUp} className="grid h-7 w-7 place-items-center rounded-md border border-border">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onMoveDown} className="grid h-7 w-7 place-items-center rounded-md border border-border">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button type="button" onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={onPick}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-[#FAC938] hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Add player
      </button>
    )}
  </div>
);

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
  const [formationId, setFormationId] = useState<(typeof FANTASY_FORMATIONS)[number]>("4-3-3");
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(null);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<"ALL" | FantasyPosition>("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("value");
  const [saving, setSaving] = useState(false);

  const poolById = useMemo(
    () => new Map(pool.players.map((player) => [player.id, player])),
    [pool.players],
  );

  useEffect(() => {
    const nextFormation = FANTASY_FORMATIONS.includes(formationFromPlayers(initialPlayers) as any)
      ? (formationFromPlayers(initialPlayers) as (typeof FANTASY_FORMATIONS)[number])
      : "4-3-3";
    setFormationId(nextFormation);
    setPlayers(rebalanceForFormation(initialPlayers, nextFormation, poolById));
    setCaptainPlayerId(initialCaptain);
  }, [initialCaptain, initialPlayers, poolById]);

  const selectedIds = useMemo(
    () => new Set(players.map((player) => player.playerId)),
    [players],
  );
  const totalPrice = players.reduce((sum, player) => sum + player.price, 0);
  const remaining = pool.round.budget - totalPrice;
  const starters = players.filter((player) => player.role === "starter");
  const bench = players.filter((player) => player.role === "bench");
  const benchGoalkeeper = bench.find((player) => player.position === "GK") ?? null;
  const outfieldBench = bench
    .filter((player) => player.position !== "GK")
    .sort((a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99));
  const errors = validateSquad(players, captainPlayerId, pool.round.budget, formationId);

  const targetPosition = activeTarget?.kind === "field" ? activeTarget.slot.position : activeTarget?.kind === "bench-gk" ? "GK" : null;
  const targetText = activeTarget?.kind === "field"
    ? `Add ${activeTarget.slot.label}`
    : activeTarget?.kind === "bench-gk"
      ? "Add Bench GK"
      : activeTarget?.kind === "bench-outfield"
        ? "Add Bench"
        : "Add";

  const slotOccupants = useMemo(() => {
    const slots = fantasyFormations[formationId];
    const startersByPosition = new Map<FantasyPosition, FantasySquadPlayer[]>();
    for (const item of positionOrder) {
      startersByPosition.set(
        item,
        players.filter((player) => player.role === "starter" && player.position === item),
      );
    }
    const used = new Map<FantasyPosition, number>();
    const map = new Map<string, FantasySquadPlayer>();
    for (const slotItem of slots) {
      const index = used.get(slotItem.position) ?? 0;
      used.set(slotItem.position, index + 1);
      const selected = startersByPosition.get(slotItem.position)?.[index];
      if (selected) map.set(slotItem.id, selected);
    }
    return map;
  }, [formationId, players]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = pool.players.filter((player) => {
      if (targetPosition && player.position !== targetPosition) return false;
      if (activeTarget?.kind === "bench-outfield" && player.position === "GK") return false;
      if (!targetPosition && position !== "ALL" && player.position !== position) return false;
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

    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "team") return a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name);
      if (sort === "price") return b.price - a.price || b.stats.fantasyPoints - a.stats.fantasyPoints;
      if (sort === "points") return b.stats.fantasyPoints - a.stats.fantasyPoints || b.price - a.price;
      return playerScore(b) / Math.max(4, b.price) - playerScore(a) / Math.max(4, a.price);
    });
  }, [activeTarget, pool.players, position, search, sort, targetPosition, team]);

  const countPosition = (current: FantasySquadPlayer[], value: FantasyPosition) =>
    current.filter((player) => player.position === value).length;

  const removePlayer = (playerId: string) => {
    if (pool.round.locked) return;
    setPlayers((current) => normalizeBenchOrders(current.filter((player) => player.playerId !== playerId)));
    if (captainPlayerId === playerId) setCaptainPlayerId(null);
  };

  const canAddPlayer = (
    current: FantasySquadPlayer[],
    player: FantasyPlayer,
    replacedPlayerId?: string,
  ) => {
    const withoutReplaced = replacedPlayerId
      ? current.filter((item) => item.playerId !== replacedPlayerId)
      : current;
    if (!withoutReplaced.some((item) => item.playerId === player.id)) {
      if (countPosition(withoutReplaced, player.position) >= FANTASY_SQUAD_LIMITS[player.position]) {
        toast.error(`You already have ${FANTASY_SQUAD_LIMITS[player.position]} ${player.position} players.`);
        return false;
      }
      if (withoutReplaced.length >= 15) {
        toast.error("Your 15-player squad is full.");
        return false;
      }
      const nextPrice = withoutReplaced.reduce((sum, item) => sum + item.price, 0) + player.price;
      if (nextPrice > pool.round.budget) {
        toast.error("This player would take your squad over budget.");
        return false;
      }
    }
    return true;
  };

  const chooseForFieldSlot = (slotItem: FieldSlot, player: FantasyPlayer) => {
    if (pool.round.locked) return;
    if (player.position !== slotItem.position) {
      toast.error(`This slot needs a ${slotItem.position} player.`);
      return;
    }
    const occupant = slotOccupants.get(slotItem.id);
    if (!canAddPlayer(players, player, occupant?.playerId === player.id ? undefined : occupant?.playerId)) return;

    setPlayers((current) => {
      const currentOccupant = slotOccupants.get(slotItem.id);
      let next = current;
      if (currentOccupant && currentOccupant.playerId !== player.id) {
        next = next.filter((item) => item.playerId !== currentOccupant.playerId);
        if (captainPlayerId === currentOccupant.playerId) setCaptainPlayerId(null);
      }
      const existing = next.find((item) => item.playerId === player.id);
      if (existing) {
        next = next.map((item) =>
          item.playerId === player.id ? { ...item, role: "starter", benchOrder: null } : item,
        );
      } else {
        next = [...next, toSquadPlayer(player, "starter", null)];
      }
      return rebalanceForFormation(next, formationId, poolById);
    });
    setActiveTarget(null);
  };

  const chooseForBench = (player: FantasyPlayer, target: "gk" | "outfield") => {
    if (pool.round.locked) return;
    if (target === "gk" && player.position !== "GK") {
      toast.error("The goalkeeper bench slot needs a goalkeeper.");
      return;
    }
    if (target === "outfield" && player.position === "GK") {
      toast.error("Outfield substitute slots cannot use a goalkeeper.");
      return;
    }
    const replaceId = target === "gk" ? benchGoalkeeper?.playerId : undefined;
    if (target === "outfield" && outfieldBench.length >= 3 && !selectedIds.has(player.id)) {
      toast.error("The three outfield substitute slots are full.");
      return;
    }
    if (!canAddPlayer(players, player, replaceId)) return;

    setPlayers((current) => {
      let next = replaceId && replaceId !== player.id
        ? current.filter((item) => item.playerId !== replaceId)
        : current;
      const existing = next.find((item) => item.playerId === player.id);
      if (existing) {
        next = next.map((item) =>
          item.playerId === player.id ? { ...item, role: "bench", benchOrder: null } : item,
        );
      } else {
        next = [...next, toSquadPlayer(player, "bench", null)];
      }
      if (captainPlayerId === player.id) setCaptainPlayerId(null);
      return normalizeBenchOrders(next);
    });
    setActiveTarget(null);
  };

  const addAutomatically = (player: FantasyPlayer) => {
    if (pool.round.locked) return;
    const counts = formationCounts(formationId);
    if (!canAddPlayer(players, player)) return;

    const starterCount = players.filter(
      (item) => item.role === "starter" && item.position === player.position,
    ).length;
    const role = starterCount < counts[player.position] ? "starter" : "bench";
    if (role === "bench" && player.position !== "GK" && outfieldBench.length >= 3) {
      toast.error("The three outfield substitute slots are full.");
      return;
    }
    if (role === "bench" && player.position === "GK" && benchGoalkeeper) {
      toast.error("The goalkeeper substitute slot is full.");
      return;
    }

    setPlayers((current) => normalizeBenchOrders([...current, toSquadPlayer(player, role, null)]));
  };

  const handlePlayerPrimary = (player: FantasyPlayer) => {
    if (activeTarget?.kind === "field") {
      chooseForFieldSlot(activeTarget.slot, player);
      return;
    }
    if (activeTarget?.kind === "bench-gk") {
      chooseForBench(player, "gk");
      return;
    }
    if (activeTarget?.kind === "bench-outfield") {
      chooseForBench(player, "outfield");
      return;
    }
    addAutomatically(player);
  };

  const changeFormation = (nextFormation: string) => {
    if (!FANTASY_FORMATIONS.includes(nextFormation as any)) return;
    const typed = nextFormation as (typeof FANTASY_FORMATIONS)[number];
    setFormationId(typed);
    setPlayers((current) => rebalanceForFormation(current, typed, poolById));
  };

  const moveBench = (playerId: string, direction: -1 | 1) => {
    if (pool.round.locked) return;
    setPlayers((current) => {
      const currentBench = current
        .filter((player) => player.role === "bench" && player.position !== "GK")
        .sort((a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99));
      const index = currentBench.findIndex((player) => player.playerId === playerId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= currentBench.length) return current;
      [currentBench[index], currentBench[nextIndex]] = [currentBench[nextIndex], currentBench[index]];
      const orders = new Map(currentBench.map((player, i) => [player.playerId, i + 1]));
      return current.map((player) => ({
        ...player,
        benchOrder: orders.get(player.playerId) ?? player.benchOrder,
      }));
    });
  };

  const resetSquad = () => {
    if (pool.round.locked) return;
    setPlayers([]);
    setCaptainPlayerId(null);
    setActiveTarget(null);
  };

  const autopick = () => {
    if (pool.round.locked) return;
    const selected: FantasyPlayer[] = [];
    for (const positionValue of positionOrder) {
      const candidates = pool.players
        .filter((player) => player.position === positionValue)
        .sort((a, b) => playerScore(b) / Math.max(4, b.price) - playerScore(a) / Math.max(4, a.price));
      selected.push(...candidates.slice(0, FANTASY_SQUAD_LIMITS[positionValue]));
    }

    if (selected.length < 15) {
      toast.error("Not enough ESPN players are available for a full squad yet.");
      return;
    }

    const byPosition = new Map<FantasyPosition, FantasyPlayer[]>();
    for (const positionValue of positionOrder) {
      byPosition.set(
        positionValue,
        pool.players
          .filter((player) => player.position === positionValue)
          .sort((a, b) => a.price - b.price || playerScore(b) - playerScore(a)),
      );
    }

    let optimized = [...selected];
    let total = optimized.reduce((sum, player) => sum + player.price, 0);
    let guard = 0;
    while (total > pool.round.budget && guard < 100) {
      guard += 1;
      const expensive = [...optimized].sort((a, b) => b.price - a.price)[0];
      const replacements = byPosition.get(expensive.position) ?? [];
      const currentIds = new Set(optimized.map((player) => player.id));
      const cheaper = replacements.find(
        (candidate) => !currentIds.has(candidate.id) && candidate.price < expensive.price,
      );
      if (!cheaper) break;
      optimized = optimized.map((player) => (player.id === expensive.id ? cheaper : player));
      total = optimized.reduce((sum, player) => sum + player.price, 0);
    }

    if (total > pool.round.budget) {
      toast.error("Autopick could not make a valid squad inside the budget.");
      return;
    }

    const nextRows = optimized.map((player) => toSquadPlayer(player, "bench", null));
    const balanced = rebalanceForFormation(nextRows, formationId, poolById);
    const captain = balanced
      .filter((player) => player.role === "starter")
      .sort((a, b) => playerScore(poolById.get(b.playerId)) - playerScore(poolById.get(a.playerId)))[0];

    setPlayers(balanced);
    setCaptainPlayerId(captain?.playerId ?? null);
    setActiveTarget(null);
    toast.success("Autopick created a valid squad. Review it before saving.");
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

  const positionCounts = positionOrder.map((value) => ({
    value,
    count: players.filter((player) => player.position === value).length,
    limit: FANTASY_SQUAD_LIMITS[value],
  }));

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,.88fr)]">
      <div className="space-y-5">
        <SectionCard
          title="Build on the pitch"
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex min-h-10 w-full items-center justify-between gap-2 rounded-full border border-[#FAC938]/40 bg-background/80 px-3 text-xs font-black sm:w-auto sm:justify-start">
                <span className="text-muted-foreground">Formation</span>
                <select
                  value={formationId}
                  onChange={(event) => changeFormation(event.target.value)}
                  disabled={pool.round.locked}
                  className="bg-transparent font-black text-[#FAC938] outline-none disabled:opacity-50"
                >
                  {FANTASY_FORMATIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={autopick}
                disabled={pool.round.locked}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#FAC938] px-4 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <Sparkles className="h-4 w-4" /> Autopick
              </button>
            </div>
          }
        >
          <div className="mx-auto w-full max-w-[700px] overflow-hidden px-0.5 sm:px-0">
            <FantasyPitch
              formationId={formationId}
              players={players}
              poolById={poolById}
              captainPlayerId={captainPlayerId}
              activeTarget={activeTarget}
              onSelectSlot={(slotItem) => {
                setActiveTarget({ kind: "field", slot: slotItem });
                setPosition(slotItem.position);
              }}
              onRemovePlayer={removePlayer}
              onCaptain={(playerId) => setCaptainPlayerId(playerId)}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BenchSlot
              label="Bench GK"
              hint="Goalkeeper substitute"
              player={benchGoalkeeper}
              active={activeTarget?.kind === "bench-gk"}
              onPick={() => {
                setActiveTarget({ kind: "bench-gk" });
                setPosition("GK");
              }}
              onRemove={() => benchGoalkeeper && removePlayer(benchGoalkeeper.playerId)}
            />
            {[0, 1, 2].map((index) => (
              <BenchSlot
                key={index}
                label={`Sub ${index + 1}`}
                hint="Auto-sub priority"
                player={outfieldBench[index] ?? null}
                active={activeTarget?.kind === "bench-outfield" && !outfieldBench[index]}
                onPick={() => {
                  setActiveTarget({ kind: "bench-outfield" });
                  setPosition("ALL");
                }}
                onRemove={() => outfieldBench[index] && removePlayer(outfieldBench[index].playerId)}
                onMoveUp={outfieldBench[index] ? () => moveBench(outfieldBench[index].playerId, -1) : undefined}
                onMoveDown={outfieldBench[index] ? () => moveBench(outfieldBench[index].playerId, 1) : undefined}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Squad checks">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Selected</div>
              <div className="mt-1 text-xl font-black">{players.length}/15</div>
            </div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Starters</div>
              <div className="mt-1 text-xl font-black">{starters.length}/11</div>
            </div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Spent</div>
              <div className="mt-1 text-xl font-black">{formatPrice(totalPrice)}</div>
            </div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</div>
              <div className={`mt-1 text-xl font-black ${remaining < 0 ? "text-destructive" : "text-[#FAC938]"}`}>
                {formatPrice(remaining)}
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/55 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Captain</div>
              <div className="mt-1 text-xl font-black">{captainPlayerId ? "1/1" : "0/1"}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {positionCounts.map((item) => (
              <div key={item.value} className="rounded-xl border border-border px-2 py-2 text-center">
                <div className="text-[9px] font-bold text-muted-foreground">{item.value}</div>
                <div className="font-black">{item.count}/{item.limit}</div>
              </div>
            ))}
          </div>

          {pool.round.locked && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              {pool.round.lockMessage}
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-xs font-black text-amber-500">Before saving:</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {errors.slice(0, 6).map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-[auto_1fr]">
            <button
              type="button"
              onClick={resetSquad}
              disabled={pool.round.locked || players.length === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || pool.round.locked || errors.length > 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Fantasy Team
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <SectionCard title="Player selector">
          {activeTarget && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#FAC938]/40 bg-[#FAC938]/10 p-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FAC938]">Selection target</div>
                <div className="text-sm font-black">
                  {activeTarget.kind === "field"
                    ? `${activeTarget.slot.label} · ${activeTarget.slot.position}`
                    : activeTarget.kind === "bench-gk"
                      ? "Bench goalkeeper"
                      : "Outfield substitute"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTarget(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#FAC938]/40"
                aria-label="Clear active selection target"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search player or country"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                value={position}
                onChange={(event) => setPosition(event.target.value as "ALL" | FantasyPosition)}
                disabled={Boolean(targetPosition)}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs font-black disabled:opacity-50"
              >
                <option value="ALL">All positions</option>
                {positionOrder.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs font-black"
              >
                <option value="ALL">All teams</option>
                {pool.teams.map((value) => (
                  <option key={value.id} value={value.id}>{value.abbreviation || value.name}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs font-black"
              >
                <option value="value">Best value</option>
                <option value="points">Points</option>
                <option value="price">Price</option>
                <option value="name">Name</option>
                <option value="team">Team</option>
              </select>
            </div>
          </div>

          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1 xl:max-h-[690px]">
            {filteredPlayers.map((player) => {
              const selected = selectedIds.has(player.id);
              return (
                <PlayerRow
                  key={player.id}
                  player={player}
                  selected={selected}
                  disabled={pool.round.locked}
                  targetText={targetText}
                  onPrimary={() => handlePlayerPrimary(player)}
                  onRemove={() => removePlayer(player.id)}
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
      </div>
    </div>
  );
};

const PlayersTab = ({ pool }: { pool: FantasyPoolResponse }) => {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<"ALL" | FantasyPosition>("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("points");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pool.players
      .filter((player) => {
        if (position !== "ALL" && player.position !== position) return false;
        if (team !== "ALL" && player.teamId !== team) return false;
        if (query && !`${player.name} ${player.teamName}`.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "team") return a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name);
        if (sort === "price") return b.price - a.price || a.name.localeCompare(b.name);
        if (sort === "value") return playerScore(b) / Math.max(4, b.price) - playerScore(a) / Math.max(4, a.price);
        return b.stats.fantasyPoints - a.stats.fantasyPoints || b.price - a.price;
      });
  }, [pool.players, position, search, sort, team]);

  return (
    <div className="space-y-5">
      <PoolStatus pool={pool} />
      <SectionCard title="All QF players">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search player or country"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select value={position} onChange={(event) => setPosition(event.target.value as "ALL" | FantasyPosition)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-black">
            <option value="ALL">All positions</option>
            {positionOrder.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={team} onChange={(event) => setTeam(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-black">
            <option value="ALL">All teams</option>
            {pool.teams.map((value) => <option key={value.id} value={value.id}>{value.abbreviation || value.name}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-black">
            <option value="points">Points</option>
            <option value="value">Best value</option>
            <option value="price">Price</option>
            <option value="name">Name</option>
            <option value="team">Team</option>
          </select>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((player) => (
            <div key={player.id} className="rounded-2xl border border-[#FAC938]/35 bg-background/65 p-4">
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
                <div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">MIN</div><div className="text-sm font-black">{player.stats.minutes}</div></div>
                <div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">G</div><div className="text-sm font-black">{player.stats.goals}</div></div>
                <div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">A</div><div className="text-sm font-black">{player.stats.assists}</div></div>
                <div className="rounded-lg bg-secondary/55 p-2"><div className="text-[9px] text-muted-foreground">PTS</div><div className="text-sm font-black">{player.stats.fantasyPoints}</div></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const PointsTab = ({ rows }: { rows: FantasyPointRow[] }) => {
  const total = rows.reduce((sum, row) => sum + row.totalPoints, 0);
  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total points</div>
            <div className="mt-1 text-4xl font-black text-[#FAC938]">{total}</div>
          </div>
          <Star className="h-10 w-10 text-[#FAC938]" />
        </div>
      </SectionCard>
      <SectionCard title="Match-by-match points">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Points will appear here after match data has been reviewed and scored.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/55 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black">{row.playerName}</div>
                  <div className="text-[11px] text-muted-foreground">{row.teamName} · {row.roundCode} · Match {row.matchId}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[#FAC938]">{row.totalPoints}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{row.finalized ? "Final" : "Provisional"}</div>
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
      <div className="py-10 text-center text-sm text-muted-foreground">The leaderboard will appear after the first points are published.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#FAC938]/30 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-3">Rank</th><th className="px-3 py-3">Manager</th><th className="px-3 py-3 text-center">Points</th><th className="px-3 py-3 text-center">Goals</th><th className="px-3 py-3 text-center">Assists</th><th className="px-3 py-3 text-center">Clean sheets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.userId} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-3 font-black"><span className="inline-flex items-center gap-1.5">{index < 3 && <Medal className="h-4 w-4 text-[#FAC938]" />}{index + 1}</span></td>
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
              {positionOrder.map((positionValue) => <th key={positionValue} className="border border-border px-3 py-2 text-center">{positionValue}</th>)}
            </tr>
          </thead>
          <tbody>
            {FANTASY_SCORING.map((row) => (
              <tr key={row.event}>
                <td className="border border-border px-3 py-2 font-semibold">{row.event}</td>
                {positionOrder.map((positionValue) => <td key={positionValue} className="border border-border px-3 py-2 text-center font-bold">{row[positionValue] ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">A player receives either the 1–59 minute score or the 60+ minute score, not both.</p>
    </SectionCard>
    <SectionCard title="Penalty Shootout Scoring">
      <div className="space-y-2">
        {FANTASY_SHOOTOUT_SCORING.map((row) => (
          <div key={row.event} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/55 p-3">
            <span className="text-sm font-semibold">{row.event}</span>
            <span className="text-lg font-black text-[#FAC938]">{row.points > 0 ? "+" : ""}{row.points}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

const HowToPlayTab = () => (
  <div className="space-y-5">
    <SectionCard title="1. Sign in and create one team"><p className="text-sm leading-relaxed text-muted-foreground">Sign in with a normal account. Each account can create one Fantasy Game team per round. Guest accounts cannot enter the prize leaderboard.</p></SectionCard>
    <SectionCard title="2. Build your 15-player squad"><p className="text-sm leading-relaxed text-muted-foreground">Select 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards. There is no minimum or maximum number of players from one country.</p></SectionCard>
    <SectionCard title="3. Use the round budget">
      <div className="grid gap-3 sm:grid-cols-3">{[["Quarter-finals", "105m"], ["Semi-finals", "125m"], ["Final", "135m"]].map(([round, budget]) => <div key={round} className="rounded-xl border border-border bg-background/55 p-3 text-center"><div className="text-xs font-semibold text-muted-foreground">{round}</div><div className="mt-1 text-2xl font-black text-[#FAC938]">{budget}</div></div>)}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The budget grows by 5m after each completed match. The accumulated increase becomes usable when the next round opens. Unused money does not earn points.</p>
    </SectionCard>
    <SectionCard title="4. Choose the starting XI">
      <p className="text-sm leading-relaxed text-muted-foreground">Pick 11 starters with exactly 1 goalkeeper, at least 3 defenders, at least 3 midfielders and at least 1 forward.</p>
      <div className="mt-3 flex flex-wrap gap-2">{FANTASY_FORMATIONS.map((formation) => <span key={formation} className="rounded-full border border-[#FAC938]/40 bg-[#FAC938]/10 px-3 py-1 text-xs font-black text-[#FAC938]">{formation}</span>)}</div>
    </SectionCard>
    <SectionCard title="5. Set the bench order and captain"><p className="text-sm leading-relaxed text-muted-foreground">Put the three outfield substitutes in first, second and third priority. The second goalkeeper is the goalkeeper substitute. Choose one starting player as captain. Positive captain points are doubled, while negative deductions apply once. If the captain plays zero minutes, no captain bonus is awarded.</p></SectionCard>
    <SectionCard title="6. Make unlimited changes before the lock"><p className="text-sm leading-relaxed text-muted-foreground">Transfers are unlimited and free. You may change players, formation, starters, bench order and captain until halftime of the first match in that round. At halftime, the entire team and captain lock.</p></SectionCard>
    <SectionCard title="7. Points are not retroactive"><p className="text-sm leading-relaxed text-muted-foreground">Goals, assists, saves, cards and other events count only if they happen after the player was added to your active team. If a player scores in the 10th minute and you add them in the 40th minute, you receive no points for that goal. Events after the selection time count normally. Points already earned remain if the player is later removed.</p></SectionCard>
    <SectionCard title="8. Minutes, clean sheets and goals conceded"><p className="text-sm leading-relaxed text-muted-foreground">Appearance points use the player’s full real match minutes. Clean sheets and goals conceded also use the player’s full real participation. Adding a defender after an earlier goal does not restore a clean sheet or remove goals-conceded deductions.</p></SectionCard>
    <SectionCard title="9. Automatic substitutions"><p className="text-sm leading-relaxed text-muted-foreground">Auto-subs are applied after the round ends. A starter is replaced only if they play zero minutes. The first eligible outfield substitute enters while keeping a valid formation. The bench goalkeeper can replace only the starting goalkeeper. Captaincy never transfers during an auto-sub.</p></SectionCard>
    <SectionCard title="10. Rounds, late entry and prizes"><p className="text-sm leading-relaxed text-muted-foreground">The game covers the Quarter-finals, Semi-finals, Third-place Match and Final. The Third-place Match and Final use the Final-round squad. New users may join until first-match halftime, but anyone joining after a round begins earns zero points for that round and starts scoring from the next one. The top three overall managers receive prizes.</p></SectionCard>
    <SectionCard title="11. Tie-break order"><ol className="space-y-2 text-sm text-muted-foreground"><li>1. Most goals by point-scoring players</li><li>2. Most assists by point-scoring players</li><li>3. Most clean sheets by point-scoring players</li><li>4. Earliest valid Quarter-final squad submission</li></ol></SectionCard>
    <ScoringTables />
  </div>
);

const FaqTab = () => (
  <div className="grid gap-3 lg:grid-cols-2">
    {FANTASY_FAQ.map((item) => (
      <details key={item.question} className="group rounded-2xl border border-[#FAC938]/35 bg-card/80 p-4 open:border-[#FAC938]/65">
        <summary className="cursor-pointer list-none pr-6 text-sm font-black marker:hidden">{item.question}</summary>
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
    void loadFantasyLeaderboard().then(setLeaderboard).catch(() => undefined);
  }, [activeTab]);

  const renderProtectedContent = () => {
    if (authLoading) {
      return <div className="grid min-h-[280px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
    }
    if (!canEnter) return <LoginGate />;
    if (!pool) return null;

    if (activeTab === "team") {
      return (
        <div className="space-y-5">
          <PoolStatus pool={pool} />
          {pool.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">{warning}</div>)}
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
      <div className="relative overflow-hidden rounded-3xl border border-[#FAC938]/55 bg-gradient-to-br from-[#FAC938]/15 via-background to-emerald-700/10 p-5 sm:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FAC938]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-72 rounded-tl-full border-l border-t border-white/10 bg-[linear-gradient(90deg,rgba(255,255,255,.05)_50%,transparent_50%)] bg-[length:20%_100%] opacity-50" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#FAC938]"><Trophy className="h-4 w-4" /> Knockout Edition</div>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Fantasy Game</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Build a 15-player squad on the pitch for the Quarter-finals, Semi-finals, Third-place Match and Final. Player values and tournament performance are supplied through ESPN data.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FAC938]/40 bg-[#FAC938]/10 px-3 py-1.5 text-[#FAC938]"><Coins className="h-3.5 w-3.5" /> 105m starting budget</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/55 px-3 py-1.5"><UsersRound className="h-3.5 w-3.5" /> 15-player squad</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/55 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Top 3 win prizes</span>
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
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition-colors sm:px-4 sm:text-sm ${active ? "bg-[#FAC938] text-black" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mt-5">
        {poolLoading && ["team", "players"].includes(activeTab) ? (
          <div className="grid min-h-[360px] place-items-center rounded-2xl border border-border">
            <div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Collecting the current QF player pool from ESPN…</p></div>
          </div>
        ) : poolError && ["team", "players"].includes(activeTab) ? (
          <SectionCard>
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{poolError}</p>
              <button type="button" onClick={refreshPool} className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-black"><RefreshCw className="h-4 w-4" /> Try again</button>
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

      <div className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><UserRound className="h-3.5 w-3.5" /> Fantasy statistics are provisional until reviewed.</div>
    </div>
  );
};

export default FantasyGame;
