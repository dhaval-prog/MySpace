"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildLocationIndex, pathForStorageLocation } from "@/lib/location";
import type { ItemExpiryNotificationKind } from "@/lib/supabase/types";

export interface ExpiryNotification {
  id: string;
  itemId: string;
  itemName: string;
  roomName: string;
  furnitureName: string;
  kind: ItemExpiryNotificationKind;
  expiryDate: string;
  readAt: string | null;
  createdAt: string;
}

/**
 * Every expiry notification for the current user, newest first, each
 * resolved back to its item's name and Room → Place — the same
 * buildLocationIndex/pathForStorageLocation pair the item detail and My
 * Home pages already use, so a renamed room/place is reflected here too
 * instead of a name snapshot going stale.
 */
export const listNotifications = cache(async function listNotifications(limit = 30): Promise<ExpiryNotification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("item_expiry_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows || rows.length === 0) return [];

  const itemIds = Array.from(new Set(rows.map((r) => r.item_id)));
  const { data: items } = await supabase.from("items").select("id, name, storage_location_id").in("id", itemIds);
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  const index = await buildLocationIndex(supabase);

  const results: ExpiryNotification[] = [];
  for (const row of rows) {
    const item = itemById.get(row.item_id);
    if (!item) continue;
    const path = pathForStorageLocation(index, item.storage_location_id);
    if (!path) continue;
    const room = path.find((n) => n.type === "room");
    const furniture = path.find((n) => n.type === "furniture");
    results.push({
      id: row.id,
      itemId: row.item_id,
      itemName: item.name,
      roomName: room?.name ?? "",
      furnitureName: furniture?.name ?? "",
      kind: row.kind,
      expiryDate: row.expiry_date,
      readAt: row.read_at,
      createdAt: row.created_at,
    });
  }
  return results;
});

export async function markNotificationRead(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("item_expiry_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/home");
  revalidatePath("/alerts");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("item_expiry_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/home");
  revalidatePath("/alerts");
  return { ok: true };
}
