"use server";

import { createClient } from "@/lib/supabase/server";
import { buildLocationIndex, pathForStorageLocation } from "@/lib/location";
import { listMyHouseholds } from "@/lib/actions/household";
import type { RoomType } from "@/lib/constants";

export type QuickAddContext =
  | { kind: "place"; roomId: string; roomType: RoomType; roomName: string }
  | { kind: "item"; roomId: string; furnitureId: string; homeId: string }
  | { kind: "budget"; householdId: string }
  | { kind: "default" };

/**
 * What the bottom nav's central "+" button should do, given the page the
 * user is currently looking at — it's the same button everywhere, but "add
 * something" means something different depending on what you're already
 * looking at: a new Place on a Room page, a new Item on a Place page, and
 * (since an Item page has nothing further to contain) a new Place on that
 * item's own Room, same as if you'd navigated up to it.
 */
export async function getQuickAddContext(pathname: string): Promise<QuickAddContext> {
  if (pathname.startsWith("/expenses")) {
    const memberships = await listMyHouseholds();
    const householdId = memberships[0]?.household.id;
    return householdId ? { kind: "budget", householdId } : { kind: "default" };
  }

  const supabase = await createClient();

  const placeMatch = pathname.match(/^\/home\/rooms\/([^/]+)\/furniture\/([^/]+)/);
  if (placeMatch) {
    const [, roomId, furnitureId] = placeMatch;
    const { data: room } = await supabase.from("rooms").select("home_id").eq("id", roomId).maybeSingle();
    if (room) return { kind: "item", roomId, furnitureId, homeId: room.home_id };
    return { kind: "default" };
  }

  const roomMatch = pathname.match(/^\/home\/rooms\/([^/]+)$/);
  if (roomMatch) {
    const [, roomId] = roomMatch;
    const { data: room } = await supabase.from("rooms").select("name, type").eq("id", roomId).maybeSingle();
    if (room) return { kind: "place", roomId, roomType: room.type as RoomType, roomName: room.name };
    return { kind: "default" };
  }

  const itemMatch = pathname.match(/^\/items\/([^/]+)$/);
  if (itemMatch && itemMatch[1] !== "new") {
    const [, itemId] = itemMatch;
    const { data: item } = await supabase.from("items").select("storage_location_id").eq("id", itemId).maybeSingle();
    if (!item) return { kind: "default" };

    const index = await buildLocationIndex(supabase);
    const path = pathForStorageLocation(index, item.storage_location_id);
    const roomNode = path?.find((n) => n.type === "room");
    if (!roomNode) return { kind: "default" };
    const room = index.rooms.get(roomNode.id);
    if (!room) return { kind: "default" };

    return { kind: "place", roomId: room.id, roomType: room.type as RoomType, roomName: room.name };
  }

  return { kind: "default" };
}
