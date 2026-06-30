import { supabase } from "@/lib/supabase";
import type { BestXiPayload, SavedBestXi } from "@/types/fanProfile";

const mapSquad = (row: Record<string, any>): SavedBestXi => ({
  id: String(row.id),
  name: String(row.name),
  formation: String(row.formation),
  payload: row.payload as BestXiPayload,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const fetchSavedBestXi = async (userId: string): Promise<SavedBestXi[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("best_xi_squads")
    .select("id, name, formation, payload, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSquad(row as Record<string, any>));
};

export const saveBestXi = async (args: {
  userId: string;
  id?: string | null;
  name: string;
  formation: string;
  payload: BestXiPayload;
}): Promise<SavedBestXi> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const record = {
    user_id: args.userId,
    name: args.name.trim(),
    formation: args.formation,
    payload: args.payload,
  };

  const query = args.id
    ? supabase
        .from("best_xi_squads")
        .update(record)
        .eq("id", args.id)
        .eq("user_id", args.userId)
    : supabase.from("best_xi_squads").insert(record);

  const { data, error } = await query
    .select("id, name, formation, payload, created_at, updated_at")
    .single();
  if (error) throw error;
  return mapSquad(data as Record<string, any>);
};

export const deleteBestXi = async (userId: string, squadId: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("best_xi_squads")
    .delete()
    .eq("id", squadId)
    .eq("user_id", userId);
  if (error) throw error;
};
