import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Home, Room } from "@/lib/supabase/types";
import { expiryStatus } from "@/lib/expiry";

export interface PlaceSummary {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  expiringCount: number;
}

export interface RoomDetailView {
  home: Home;
  room: Room;
  places: PlaceSummary[];
  totals: { items: number; places: number; expiring: number; fine: number };
}

/** The Room page's own view — every place (furniture) in the room, each
 * tagged with its item count and how many of those items are expiring soon
 * or already expired, so the Places list and the room-level hero stats
 * share one query instead of two slightly-different ones. */
export async function getRoomDetailView(supabase: SupabaseClient<Database>, roomId: string): Promise<RoomDetailView | null> {
  const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) return null;

  const { data: home } = await supabase.from("homes").select("*").eq("id", room.home_id).maybeSingle();
  if (!home) return null;

  const { data: furniture } = await supabase
    .from("furniture")
    .select("*")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: true });

  const furnitureIds = (furniture ?? []).map((f) => f.id);
  const { data: locations } = furnitureIds.length
    ? await supabase.from("storage_locations").select("id, furniture_id").in("furniture_id", furnitureIds)
    : { data: [] as { id: string; furniture_id: string }[] };

  const locationIds = (locations ?? []).map((l) => l.id);
  const { data: items } = locationIds.length
    ? await supabase.from("items").select("id, storage_location_id, expiry_date").in("storage_location_id", locationIds)
    : { data: [] as { id: string; storage_location_id: string; expiry_date: string | null }[] };

  const locToFurniture = new Map((locations ?? []).map((l) => [l.id, l.furniture_id]));
  const itemCountByFurniture = new Map<string, number>();
  const expiringCountByFurniture = new Map<string, number>();
  let totalExpiring = 0;

  for (const item of items ?? []) {
    const fId = locToFurniture.get(item.storage_location_id);
    if (!fId) continue;
    itemCountByFurniture.set(fId, (itemCountByFurniture.get(fId) ?? 0) + 1);
    const level = expiryStatus(item.expiry_date).level;
    if (level === "soon" || level === "expired") {
      expiringCountByFurniture.set(fId, (expiringCountByFurniture.get(fId) ?? 0) + 1);
      totalExpiring++;
    }
  }

  const places: PlaceSummary[] = (furniture ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    icon: f.icon,
    itemCount: itemCountByFurniture.get(f.id) ?? 0,
    expiringCount: expiringCountByFurniture.get(f.id) ?? 0,
  }));

  const totalItems = items?.length ?? 0;

  return {
    home,
    room,
    places,
    totals: { items: totalItems, places: places.length, expiring: totalExpiring, fine: totalItems - totalExpiring },
  };
}
