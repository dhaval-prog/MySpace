import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Item } from "@/lib/supabase/types";
import { buildLocationIndex, pathForStorageLocation, type LocationNode } from "@/lib/location";

export interface ItemWithPath {
  item: Item;
  path: LocationNode[];
}

export interface ItemsPage {
  results: ItemWithPath[];
  total: number;
  hasMore: boolean;
}

const ITEMS_PAGE_SIZE = 30;

/**
 * Paginated (not "fetch every item the user owns unconditionally") — a
 * household that's been in use for a while can easily have hundreds of
 * items, and the All Items page previously shipped every single one of
 * them, with full paths, on first load. `offset`/`limit` mirror
 * listExpenses' own pagination shape.
 */
export async function getItemsWithPaths(
  supabase: SupabaseClient<Database>,
  { offset = 0, limit = ITEMS_PAGE_SIZE }: { offset?: number; limit?: number } = {}
): Promise<ItemsPage> {
  const [index, { data: items, count }] = await Promise.all([
    buildLocationIndex(supabase),
    supabase
      .from("items")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
  ]);

  const results: ItemWithPath[] = [];
  for (const item of items ?? []) {
    const path = pathForStorageLocation(index, item.storage_location_id);
    if (path) results.push({ item, path });
  }

  const total = count ?? results.length;
  return { results, total, hasMore: offset + (items?.length ?? 0) < total };
}
