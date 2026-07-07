import { supabase } from "@/lib/supabase";
import type {
  FantasyLeaderboardRow,
  FantasyPlayer,
  FantasyPointRow,
  FantasyPoolResponse,
  FantasyRoundCode,
  FantasySquadDraft,
  FantasySquadPlayer,
} from "@/types/fantasy";

const fantasyEndpoint = "/api/fantasy-espn?view=pool";

export const fetchFantasyPool = async (): Promise<FantasyPoolResponse> => {
  const response = await fetch(fantasyEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "Fantasy player data is temporarily unavailable.",
    );
  }

  return response.json() as Promise<FantasyPoolResponse>;
};

const emptySquad = (roundCode: FantasyRoundCode): FantasySquadDraft => ({
  id: null,
  roundCode,
  captainPlayerId: null,
  players: [],
  submittedAt: null,
  updatedAt: null,
});

export const loadFantasySquad = async (
  userId: string,
  roundCode: FantasyRoundCode,
): Promise<FantasySquadDraft> => {
  if (!supabase) return emptySquad(roundCode);

  const { data: squad, error } = await supabase
    .from("fantasy_squads")
    .select("id, round_code, captain_player_id, submitted_at, updated_at")
    .eq("user_id", userId)
    .eq("round_code", roundCode)
    .maybeSingle();

  if (error) throw error;
  if (!squad) return emptySquad(roundCode);

  const { data: players, error: playerError } = await supabase
    .from("fantasy_squad_players")
    .select(
      "player_id, player_name, team_name, position, price, role, bench_order, selected_at",
    )
    .eq("squad_id", squad.id)
    .order("bench_order", { ascending: true, nullsFirst: false });

  if (playerError) throw playerError;

  return {
    id: String(squad.id),
    roundCode: squad.round_code as FantasyRoundCode,
    captainPlayerId:
      typeof squad.captain_player_id === "string"
        ? squad.captain_player_id
        : null,
    players: (players ?? []).map(
      (row): FantasySquadPlayer => ({
        playerId: String(row.player_id),
        name: String(row.player_name),
        teamName: String(row.team_name),
        position: row.position,
        price: Number(row.price),
        role: row.role,
        benchOrder:
          typeof row.bench_order === "number" ? row.bench_order : null,
        selectedAt: String(row.selected_at),
      }),
    ),
    submittedAt:
      typeof squad.submitted_at === "string" ? squad.submitted_at : null,
    updatedAt: typeof squad.updated_at === "string" ? squad.updated_at : null,
  };
};

type SaveFantasySquadInput = {
  userId: string;
  roundCode: FantasyRoundCode;
  budget: number;
  captainPlayerId: string;
  players: FantasySquadPlayer[];
};

export const saveFantasySquad = async ({
  userId,
  roundCode,
  budget,
  captainPlayerId,
  players,
}: SaveFantasySquadInput): Promise<FantasySquadDraft> => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const now = new Date().toISOString();
  const existing = await loadFantasySquad(userId, roundCode);
  const previousById = new Map(existing.players.map((player) => [player.playerId, player]));
  const nextIds = new Set(players.map((player) => player.playerId));

  const { data: squad, error } = await supabase
    .from("fantasy_squads")
    .upsert(
      {
        user_id: userId,
        round_code: roundCode,
        budget,
        captain_player_id: captainPlayerId,
        submitted_at: existing.submittedAt ?? now,
        updated_at: now,
      },
      { onConflict: "user_id,round_code" },
    )
    .select("id")
    .single();

  if (error) throw error;

  const squadId = String(squad.id);
  const { error: deleteError } = await supabase
    .from("fantasy_squad_players")
    .delete()
    .eq("squad_id", squadId);

  if (deleteError) throw deleteError;

  const rows = players.map((player) => ({
    squad_id: squadId,
    player_id: player.playerId,
    player_name: player.name,
    team_name: player.teamName,
    position: player.position,
    price: player.price,
    role: player.role,
    bench_order: player.benchOrder,
    selected_at: previousById.get(player.playerId)?.selectedAt ?? now,
  }));

  const { error: insertError } = await supabase
    .from("fantasy_squad_players")
    .insert(rows);

  if (insertError) throw insertError;

  const events: Array<Record<string, unknown>> = [];

  for (const player of players) {
    const previous = previousById.get(player.playerId);
    if (!previous) {
      events.push({
        user_id: userId,
        squad_id: squadId,
        round_code: roundCode,
        player_id: player.playerId,
        player_name: player.name,
        action: "added",
        occurred_at: now,
      });
    } else if (previous.role !== player.role) {
      events.push({
        user_id: userId,
        squad_id: squadId,
        round_code: roundCode,
        player_id: player.playerId,
        player_name: player.name,
        action: player.role === "starter" ? "started" : "benched",
        occurred_at: now,
      });
    }
  }

  for (const previous of existing.players) {
    if (!nextIds.has(previous.playerId)) {
      events.push({
        user_id: userId,
        squad_id: squadId,
        round_code: roundCode,
        player_id: previous.playerId,
        player_name: previous.name,
        action: "removed",
        occurred_at: now,
      });
    }
  }

  if (existing.captainPlayerId !== captainPlayerId) {
    const captain = players.find((player) => player.playerId === captainPlayerId);
    events.push({
      user_id: userId,
      squad_id: squadId,
      round_code: roundCode,
      player_id: captainPlayerId,
      player_name: captain?.name ?? "Captain",
      action: "captain_selected",
      occurred_at: now,
    });
  }

  if (events.length > 0) {
    const { error: eventError } = await supabase
      .from("fantasy_selection_events")
      .insert(events);
    if (eventError) throw eventError;
  }

  return loadFantasySquad(userId, roundCode);
};

export const loadFantasyPoints = async (
  userId: string,
): Promise<FantasyPointRow[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("fantasy_points")
    .select(
      "id, match_id, player_id, player_name, team_name, round_code, total_points, breakdown, finalized",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    matchId: String(row.match_id),
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    teamName: String(row.team_name),
    roundCode: row.round_code,
    totalPoints: Number(row.total_points),
    breakdown:
      row.breakdown && typeof row.breakdown === "object"
        ? (row.breakdown as Record<string, number>)
        : {},
    finalized: Boolean(row.finalized),
  }));
};

export const loadFantasyLeaderboard = async (): Promise<
  FantasyLeaderboardRow[]
> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("fantasy_leaderboard")
    .select(
      "user_id, display_name, total_points, goals, assists, clean_sheets, first_submitted_at",
    )
    .order("total_points", { ascending: false })
    .order("goals", { ascending: false })
    .order("assists", { ascending: false })
    .order("clean_sheets", { ascending: false })
    .order("first_submitted_at", { ascending: true })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    userId: String(row.user_id),
    displayName: String(row.display_name ?? "Fantasy Manager"),
    totalPoints: Number(row.total_points ?? 0),
    goals: Number(row.goals ?? 0),
    assists: Number(row.assists ?? 0),
    cleanSheets: Number(row.clean_sheets ?? 0),
    firstSubmittedAt:
      typeof row.first_submitted_at === "string"
        ? row.first_submitted_at
        : null,
  }));
};

export const toSquadPlayer = (
  player: FantasyPlayer,
  role: "starter" | "bench",
  benchOrder: number | null,
  selectedAt = new Date().toISOString(),
): FantasySquadPlayer => ({
  playerId: player.id,
  name: player.name,
  teamName: player.teamName,
  position: player.position,
  price: player.price,
  role,
  benchOrder,
  selectedAt,
});
