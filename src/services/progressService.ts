import { supabase } from "@/lib/supabase";
import type { MiniGameResultInput, MiniGameSummary } from "@/types/fanProfile";

export const getRemotePrediction = async (userId: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_predictions")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
};

export const saveRemotePrediction = async (userId: string, payload: unknown) => {
  if (!supabase) return;
  const { error } = await supabase.from("user_predictions").upsert({
    user_id: userId,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const recordMiniGameResult = async (
  userId: string,
  result: MiniGameResultInput,
) => {
  if (!supabase) return;
  const { error } = await supabase.rpc("record_mini_game_result", {
    p_user_id: userId,
    p_fixture_id: result.fixtureId ?? null,
    p_selected_team: result.selectedTeam,
    p_opponent: result.opponent,
    p_goals: result.goals,
    p_shots: result.shots,
    p_saves: result.saves,
    p_misses: result.misses,
    p_accuracy: result.accuracy,
  });
  if (error) throw error;
};

export const fetchMiniGameSummary = async (
  userId: string,
): Promise<MiniGameSummary> => {
  const fallback: MiniGameSummary = {
    gamesPlayed: 0,
    totalGoals: 0,
    totalShots: 0,
    totalSavesFaced: 0,
    totalMisses: 0,
    bestScore: 0,
    bestAccuracy: 0,
    mostUsedTeam: null,
  };
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from("mini_game_summary")
    .select(
      "games_played, total_goals, total_shots, total_saves_faced, total_misses, best_score, best_accuracy, most_used_team",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return fallback;
  return {
    gamesPlayed: data.games_played ?? 0,
    totalGoals: data.total_goals ?? 0,
    totalShots: data.total_shots ?? 0,
    totalSavesFaced: data.total_saves_faced ?? 0,
    totalMisses: data.total_misses ?? 0,
    bestScore: data.best_score ?? 0,
    bestAccuracy: Number(data.best_accuracy ?? 0),
    mostUsedTeam: data.most_used_team ?? null,
  };
};
