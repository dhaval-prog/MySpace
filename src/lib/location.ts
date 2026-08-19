import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Furniture, Home, Room, StorageLocation } from "@/lib/supabase/types";

export interface LocationNode {
  type: "home" | "room" | "furniture" | "storage";
  id: string;
  name: string;
  icon: string;
}

export interface LocationIndex {
  homes: Map<string, Home>;
  rooms: Map<string, Room>;
  furniture: Map<string, Furniture>;
  storageLocations: Map<string, StorageLocation>;
}

/**
 * Loads every home/room/furniture/storage_location the current user owns
 * (RLS-scoped) into in-memory maps, so breadcrumb paths for any number of
 * items can be resolved without an N+1 query per item.
 */
export async function buildLocationIndex(
  supabase: SupabaseClient<Database>
): Promise<LocationIndex> {
  const [homesRes, roomsRes, furnitureRes, storageRes] = await Promise.all([
    supabase.from("homes").select("*"),
    supabase.from("rooms").select("*"),
    supabase.from("furniture").select("*"),
    supabase.from("storage_locations").select("*"),
  ]);

  return {
    homes: new Map((homesRes.data ?? []).map((h) => [h.id, h])),
    rooms: new Map((roomsRes.data ?? []).map((r) => [r.id, r])),
    furniture: new Map((furnitureRes.data ?? []).map((f) => [f.id, f])),
    storageLocations: new Map((storageRes.data ?? []).map((s) => [s.id, s])),
  };
}

/**
 * Resolves an item's storage_location back to its Room → Place (furniture)
 * path. The storage_location itself is deliberately NOT included in the
 * returned path — every furniture now has exactly one, auto-managed and
 * named to match the furniture (see storage_locations_one_per_furniture in
 * supabase/schema.sql), so from the user's perspective the location IS the
 * Place, not a separate step underneath it.
 */
export function pathForStorageLocation(
  index: LocationIndex,
  storageLocationId: string
): LocationNode[] | null {
  const storage = index.storageLocations.get(storageLocationId);
  if (!storage) return null;

  const furniture = index.furniture.get(storage.furniture_id);
  if (!furniture) return null;
  const room = index.rooms.get(furniture.room_id);
  if (!room) return null;
  const home = index.homes.get(room.home_id);
  if (!home) return null;

  return [
    { type: "home", id: home.id, name: home.name, icon: "Home" },
    { type: "room", id: room.id, name: room.name, icon: room.icon },
    { type: "furniture", id: furniture.id, name: furniture.name, icon: furniture.icon },
  ];
}

export function breadcrumbText(nodes: LocationNode[], container?: string | null): string {
  const parts = nodes.map((n) => n.name);
  if (container) parts.push(container);
  return parts.join(" → ");
}
