import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Home, Item } from "@/lib/supabase/types";

export interface RoomFilter {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  placeCount: number;
}

export interface HomeItemsView {
  home: Home;
  rooms: RoomFilter[];
  items: (Item & {
    roomId: string;
    roomName: string;
    furnitureName: string;
    furnitureIcon: string;
  })[];
  totals: { items: number; rooms: number };
}

/** Flat item-browsing view for the My Home page — every item across the
 * home's rooms, each tagged with its room for the tab filter, independent
 * of the room/furniture grid used on the room detail pages. */
export async function getHomeItemsView(
  supabase: SupabaseClient<Database>,
  homeId: string
): Promise<HomeItemsView | null> {
  const { data: home } = await supabase.from("homes").select("*").eq("id", homeId).maybeSingle();
  if (!home) return null;

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("home_id", homeId)
    .order("sort_order", { ascending: true });

  const roomIds = (rooms ?? []).map((r) => r.id);
  const { data: furniture } = roomIds.length
    ? await supabase.from("furniture").select("id, room_id, name, icon").in("room_id", roomIds)
    : { data: [] as { id: string; room_id: string; name: string; icon: string }[] };

  const furnitureIds = (furniture ?? []).map((f) => f.id);
  const { data: storageLocations } = furnitureIds.length
    ? await supabase.from("storage_locations").select("id, furniture_id").in("furniture_id", furnitureIds)
    : { data: [] as { id: string; furniture_id: string }[] };

  const storageIds = (storageLocations ?? []).map((s) => s.id);
  const { data: rawItems } = storageIds.length
    ? await supabase
        .from("items")
        .select("*")
        .in("storage_location_id", storageIds)
        .order("created_at", { ascending: false })
    : { data: [] as Item[] };

  const storageToFurniture = new Map((storageLocations ?? []).map((s) => [s.id, s.furniture_id]));
  const furnitureToRoom = new Map((furniture ?? []).map((f) => [f.id, f.room_id]));
  const furnitureNameById = new Map((furniture ?? []).map((f) => [f.id, f.name]));
  const furnitureIconById = new Map((furniture ?? []).map((f) => [f.id, f.icon]));
  const roomNameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));

  const items = (rawItems ?? []).flatMap((item) => {
    const furnitureId = storageToFurniture.get(item.storage_location_id);
    const roomId = furnitureId ? furnitureToRoom.get(furnitureId) : undefined;
    const roomName = roomId ? roomNameById.get(roomId) : undefined;
    const furnitureName = furnitureId ? furnitureNameById.get(furnitureId) : undefined;
    const furnitureIcon = furnitureId ? furnitureIconById.get(furnitureId) : undefined;
    if (!roomId || !roomName || !furnitureName || !furnitureIcon) return [];
    return [{ ...item, roomId, roomName, furnitureName, furnitureIcon }];
  });

  const itemCountByRoom = new Map<string, number>();
  for (const item of items) {
    itemCountByRoom.set(item.roomId, (itemCountByRoom.get(item.roomId) ?? 0) + 1);
  }

  const placeCountByRoom = new Map<string, number>();
  for (const f of furniture ?? []) {
    placeCountByRoom.set(f.room_id, (placeCountByRoom.get(f.room_id) ?? 0) + 1);
  }

  const roomFilters: RoomFilter[] = (rooms ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    itemCount: itemCountByRoom.get(r.id) ?? 0,
    placeCount: placeCountByRoom.get(r.id) ?? 0,
  }));

  return {
    home,
    rooms: roomFilters,
    items,
    totals: { items: items.length, rooms: roomFilters.length },
  };
}
