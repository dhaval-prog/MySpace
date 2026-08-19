import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Furniture, Home, Item, Room } from "@/lib/supabase/types";

export interface FurnitureDetail {
  home: Home;
  room: Room;
  furniture: Furniture;
  items: Item[];
}

/** A Place's own detail — every furniture has exactly one storage_location under it (auto-managed, see storage_locations_one_per_furniture in supabase/schema.sql), so this is just "the furniture's items", no location sub-level to browse. */
export async function getFurnitureDetail(supabase: SupabaseClient<Database>, furnitureId: string): Promise<FurnitureDetail | null> {
  const { data: furniture } = await supabase.from("furniture").select("*").eq("id", furnitureId).maybeSingle();
  if (!furniture) return null;

  const { data: room } = await supabase.from("rooms").select("*").eq("id", furniture.room_id).maybeSingle();
  if (!room) return null;

  const { data: home } = await supabase.from("homes").select("*").eq("id", room.home_id).maybeSingle();
  if (!home) return null;

  const { data: location } = await supabase.from("storage_locations").select("id").eq("furniture_id", furnitureId).maybeSingle();

  const { data: items } = location
    ? await supabase.from("items").select("*").eq("storage_location_id", location.id).order("created_at", { ascending: false })
    : { data: [] as Item[] };

  return { home, room, furniture, items: items ?? [] };
}
