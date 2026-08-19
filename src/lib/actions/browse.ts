"use server";

import { createClient } from "@/lib/supabase/server";

export async function listHomes() {
  const supabase = await createClient();
  const { data } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true });
  return data ?? [];
}

export async function listRooms(homeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("id, name, icon")
    .eq("home_id", homeId)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

/** "Place" options for a room — furniture is the DB name, kept as-is (see the terminology-only rename note in LocationPicker) since every furniture row now IS a Place 1:1 with its one auto-managed storage_location. */
export async function listFurniture(roomId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("furniture")
    .select("id, name, icon, type")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: true });
  return data ?? [];
}
