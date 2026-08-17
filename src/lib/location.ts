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
 * Same shape as buildLocationIndex(), but scoped to only the ancestry chain
 * of the given storage_location ids — for the dashboard's ~8 recent items,
 * this is a handful of rows instead of the user's entire home hierarchy.
 * Walks parent_id chains iteratively (usually 1-2 round trips; nesting is
 * rarely deep) rather than assuming a fixed depth.
 */
export async function buildScopedLocationIndex(
  supabase: SupabaseClient<Database>,
  storageLocationIds: string[]
): Promise<LocationIndex> {
  const storageLocations = new Map<string, StorageLocation>();
  let frontier = Array.from(new Set(storageLocationIds));

  while (frontier.length > 0) {
    const { data } = await supabase.from("storage_locations").select("*").in("id", frontier);
    const next: string[] = [];
    for (const row of data ?? []) {
      storageLocations.set(row.id, row);
      if (row.parent_id && !storageLocations.has(row.parent_id)) next.push(row.parent_id);
    }
    frontier = Array.from(new Set(next));
  }

  const furnitureIds = Array.from(new Set(Array.from(storageLocations.values()).map((s) => s.furniture_id)));
  const { data: furnitureRows } = furnitureIds.length
    ? await supabase.from("furniture").select("*").in("id", furnitureIds)
    : { data: [] as Furniture[] };
  const furniture = new Map((furnitureRows ?? []).map((f) => [f.id, f]));

  const roomIds = Array.from(new Set(Array.from(furniture.values()).map((f) => f.room_id)));
  const { data: roomRows } = roomIds.length ? await supabase.from("rooms").select("*").in("id", roomIds) : { data: [] as Room[] };
  const rooms = new Map((roomRows ?? []).map((r) => [r.id, r]));

  const homeIds = Array.from(new Set(Array.from(rooms.values()).map((r) => r.home_id)));
  const { data: homeRows } = homeIds.length ? await supabase.from("homes").select("*").in("id", homeIds) : { data: [] as Home[] };
  const homes = new Map((homeRows ?? []).map((h) => [h.id, h]));

  return { homes, rooms, furniture, storageLocations };
}

export function pathForStorageLocation(
  index: LocationIndex,
  storageLocationId: string
): LocationNode[] | null {
  const storageChain: StorageLocation[] = [];
  let current = index.storageLocations.get(storageLocationId);
  while (current) {
    storageChain.unshift(current);
    current = current.parent_id ? index.storageLocations.get(current.parent_id) : undefined;
  }
  if (storageChain.length === 0) return null;

  const furniture = index.furniture.get(storageChain[0].furniture_id);
  if (!furniture) return null;
  const room = index.rooms.get(furniture.room_id);
  if (!room) return null;
  const home = index.homes.get(room.home_id);
  if (!home) return null;

  return [
    { type: "home", id: home.id, name: home.name, icon: "Home" },
    { type: "room", id: room.id, name: room.name, icon: room.icon },
    { type: "furniture", id: furniture.id, name: furniture.name, icon: furniture.icon },
    ...storageChain.map((s) => ({ type: "storage" as const, id: s.id, name: s.name, icon: "Rows3" })),
  ];
}

export function breadcrumbText(nodes: LocationNode[], container?: string | null): string {
  const parts = nodes.map((n) => n.name);
  if (container) parts.push(container);
  return parts.join(" → ");
}
