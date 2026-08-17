import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Item } from "@/lib/supabase/types";
import { buildLocationIndex, pathForStorageLocation, type LocationNode } from "@/lib/location";

export interface ItemWithPath {
  item: Item;
  path: LocationNode[];
}

export async function getItemsWithPaths(supabase: SupabaseClient<Database>): Promise<ItemWithPath[]> {
  const index = await buildLocationIndex(supabase);

  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });

  const results: ItemWithPath[] = [];
  for (const item of items ?? []) {
    const path = pathForStorageLocation(index, item.storage_location_id);
    if (path) results.push({ item, path });
  }
  return results;
}
