"use server";

import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView, type HomeItemsView } from "@/lib/home-data";
import { expiryStatus } from "@/lib/expiry";

export interface SearchResult {
  id: string;
  name: string;
  roomName: string;
  furnitureName: string;
  quantity: number;
  expiryLabel: string | null;
  expiryLevel: "none" | "normal" | "soon" | "expired";
}

const FIELD_WEIGHT = {
  nameExact: 100,
  nameStarts: 80,
  nameWord: 65,
  nameSubstring: 50,
  tag: 40,
  category: 30,
  location: 25,
  description: 15,
} as const;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** How well one item matches a (already-normalized, non-empty) query — the
 * higher of every field that matches, not a sum, so an item that merely
 * mentions the room name in passing never outranks a real name match. */
function scoreItem(item: HomeItemsView["items"][number], q: string): number {
  const name = normalize(item.name);
  let best = 0;

  if (name === q) best = Math.max(best, FIELD_WEIGHT.nameExact);
  else if (name.startsWith(q)) best = Math.max(best, FIELD_WEIGHT.nameStarts);
  else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) best = Math.max(best, FIELD_WEIGHT.nameWord);
  else if (name.includes(q)) best = Math.max(best, FIELD_WEIGHT.nameSubstring);

  if (item.tags.some((t) => normalize(t).includes(q))) best = Math.max(best, FIELD_WEIGHT.tag);
  if (normalize(item.category).includes(q)) best = Math.max(best, FIELD_WEIGHT.category);
  if (normalize(item.roomName).includes(q) || normalize(item.furnitureName).includes(q)) best = Math.max(best, FIELD_WEIGHT.location);
  if (item.description && normalize(item.description).includes(q)) best = Math.max(best, FIELD_WEIGHT.description);

  return best;
}

/**
 * Server-side search — the client only ever gets back a capped, ranked
 * result set (never the whole home's item list), so a debounced keystroke
 * costs one small round trip instead of re-filtering a potentially large
 * array in the browser. Matches name (exact/prefix/word/substring), tags,
 * category, and the item's Room → Place — "charger" finds "MacBook
 * Charger" wherever it's filed, not just items literally named "charger".
 */
export async function searchItems(homeId: string, query: string, limit = 20): Promise<SearchResult[]> {
  const q = normalize(query);
  if (!q) return [];

  const supabase = await createClient();
  const view = await getHomeItemsView(supabase, homeId);
  if (!view) return [];

  const ranked = view.items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);

  return ranked.map(({ item }) => {
    const status = expiryStatus(item.expiry_date);
    return {
      id: item.id,
      name: item.name,
      roomName: item.roomName,
      furnitureName: item.furnitureName,
      quantity: item.quantity,
      expiryLabel: status.level === "none" ? null : status.label,
      expiryLevel: status.level,
    };
  });
}
