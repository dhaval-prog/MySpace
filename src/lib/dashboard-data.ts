import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Item } from "@/lib/supabase/types";
import { buildScopedLocationIndex, pathForStorageLocation, type LocationNode } from "@/lib/location";

export interface RecentItem {
  item: Item;
  path: LocationNode[];
}

export interface StorageAreaUsage {
  furnitureId: string;
  furnitureName: string;
  roomName: string;
  icon: string;
  itemCount: number;
}

export interface DashboardData {
  hasHomes: boolean;
  recentItems: RecentItem[];
  topAreas: StorageAreaUsage[];
  totals: { rooms: number; items: number; noPhoto: number };
}

const RECENT_ITEM_COLUMNS =
  "id, user_id, storage_location_id, name, category, description, quantity, container, photo_url, tags, is_favorite, is_important, qr_code, created_at, updated_at";

/**
 * The dashboard's single data source. Deliberately does NOT call
 * buildLocationIndex() or fetch every item — that full-home-hierarchy dump
 * is for My Home/item-browsing/item-movement, not for four summary numbers
 * and a couple of small lists. Counts are computed by Postgres (count-only
 * head requests, no rows transferred); "top storage areas" is computed by
 * the get_top_storage_areas() RPC (a GROUP BY in Postgres, not a JS loop
 * over every item); location paths are resolved only for the ~13 specific
 * storage locations this page actually renders (8 recent items + up to 5
 * top areas), via buildScopedLocationIndex() instead of the full index.
 */
export async function getDashboardData(supabase: SupabaseClient<Database>): Promise<DashboardData> {
  const [homesCountRes, roomsCountRes, itemsCountRes, noPhotoCountRes, recentItemsRes, topAreasRes] = await Promise.all([
    supabase.from("homes").select("*", { count: "exact", head: true }),
    supabase.from("rooms").select("*", { count: "exact", head: true }),
    supabase.from("items").select("*", { count: "exact", head: true }),
    supabase.from("items").select("*", { count: "exact", head: true }).is("photo_url", null),
    supabase.from("items").select(RECENT_ITEM_COLUMNS).order("created_at", { ascending: false }).limit(8),
    supabase.rpc("get_top_storage_areas", { p_limit: 5 }),
  ]);

  const recentItemsData = (recentItemsRes.data ?? []) as Item[];
  const topAreaRows = (topAreasRes.data ?? []) as { furniture_id: string; item_count: number }[];

  const furnitureIds = topAreaRows.map((r) => r.furniture_id);
  const [{ data: topFurnitureRows }, scopedIndex] = await Promise.all([
    furnitureIds.length ? supabase.from("furniture").select("id, name, icon, room_id").in("id", furnitureIds) : Promise.resolve({ data: [] }),
    buildScopedLocationIndex(
      supabase,
      recentItemsData.map((i) => i.storage_location_id)
    ),
  ]);

  const roomIds = Array.from(new Set((topFurnitureRows ?? []).map((f) => f.room_id)));
  const { data: topRoomRows } = roomIds.length ? await supabase.from("rooms").select("id, name").in("id", roomIds) : { data: [] };
  const roomNameById = new Map((topRoomRows ?? []).map((r) => [r.id, r.name]));
  const furnitureById = new Map((topFurnitureRows ?? []).map((f) => [f.id, f]));

  const topAreas: StorageAreaUsage[] = topAreaRows.map((row) => {
    const furniture = furnitureById.get(row.furniture_id);
    return {
      furnitureId: row.furniture_id,
      furnitureName: furniture?.name ?? "Unknown",
      roomName: furniture ? (roomNameById.get(furniture.room_id) ?? "") : "",
      icon: furniture?.icon ?? "Package",
      itemCount: row.item_count,
    };
  });

  const recentItems: RecentItem[] = [];
  for (const item of recentItemsData) {
    const path = pathForStorageLocation(scopedIndex, item.storage_location_id);
    if (path) recentItems.push({ item, path });
  }

  return {
    hasHomes: (homesCountRes.count ?? 0) > 0,
    recentItems,
    topAreas,
    totals: {
      rooms: roomsCountRes.count ?? 0,
      items: itemsCountRes.count ?? 0,
      noPhoto: noPhotoCountRes.count ?? 0,
    },
  };
}
