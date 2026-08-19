"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildLocationIndex, pathForStorageLocation, type LocationNode } from "@/lib/location";
import type { Item } from "@/lib/supabase/types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface ItemFormState {
  error?: string;
}

async function uploadPhotoIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return {};

  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "This image is too large. Please upload an image smaller than 5MB." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("item-photos").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) return { error: "Something went wrong while uploading the photo. Please try again." };

  const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
  return { url: data.publicUrl };
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Every furniture ("Place") has exactly one storage_location, auto-created alongside it and never surfaced in the UI (see addFurniture() and storage_locations_one_per_furniture in supabase/schema.sql) — this is the one place that FK gets resolved from the Place the user actually picked. */
async function resolveStorageLocationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  furnitureId: string
): Promise<{ id: string } | { error: string }> {
  const { data } = await supabase.from("storage_locations").select("id").eq("furniture_id", furnitureId).maybeSingle();
  if (!data) return { error: "That place couldn't be found." };
  return { id: data.id };
}

export interface NewItemInput {
  storageLocationId: string;
  name: string;
  category?: string;
  description?: string | null;
  quantity?: number;
  container?: string | null;
  photoUrl?: string | null;
  expiryDate?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  isImportant?: boolean;
}

/** Shared insert logic used by both the manual form action and voice-add. */
async function insertItemRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: NewItemInput
): Promise<{ id: string } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Please give the item a name." };
  if (!input.storageLocationId) return { error: "Please choose where this item is stored." };

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      storage_location_id: input.storageLocationId,
      name,
      category: input.category ?? "other",
      description: input.description ?? null,
      quantity: input.quantity ?? 1,
      container: input.container ?? null,
      photo_url: input.photoUrl ?? null,
      expiry_date: input.expiryDate ?? null,
      tags: input.tags ?? [],
      is_favorite: input.isFavorite ?? false,
      is_important: input.isImportant ?? false,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Something went wrong while saving this item. Please try again." };
  return { id: data.id };
}

export async function createItem(_prevState: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const roomId = String(formData.get("roomId") ?? "");
  const furnitureId = String(formData.get("furnitureId") ?? "");
  if (!furnitureId) return { error: "Please choose where this item is kept." };

  const resolved = await resolveStorageLocationId(supabase, furnitureId);
  if ("error" in resolved) return { error: resolved.error };

  const { url, error: uploadError } = await uploadPhotoIfPresent(supabase, user.id, formData);
  if (uploadError) return { error: uploadError };

  const expiryDateRaw = String(formData.get("expiryDate") ?? "");

  const result = await insertItemRow(supabase, user.id, {
    storageLocationId: resolved.id,
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? "other"),
    description: String(formData.get("description") ?? "") || null,
    quantity: Number(formData.get("quantity") ?? 1) || 1,
    container: String(formData.get("container") ?? "") || null,
    photoUrl: url ?? null,
    expiryDate: expiryDateRaw || null,
    tags: parseTags(String(formData.get("tags") ?? "")),
    isFavorite: formData.get("isFavorite") === "on",
    isImportant: formData.get("isImportant") === "on",
  });
  if ("error" in result) return { error: result.error };

  revalidatePath(`/home/rooms/${roomId}/furniture/${furnitureId}`);
  revalidatePath("/items");
  revalidatePath("/home");
  redirect(`/home/rooms/${roomId}/furniture/${furnitureId}`);
}

/**
 * Voice-add counterpart to createItem — same insertItemRow logic and the
 * same `items` table/model, just a plain-object signature instead of a
 * <form> FormData binding (voice input is assembled from parsed speech, not
 * a form submit) and it reports success instead of redirecting, since the
 * confirm-card UI decides what happens next.
 */
export async function createItemFromVoice(
  input: NewItemInput & { roomId: string; furnitureId: string }
): Promise<{ itemId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const result = await insertItemRow(supabase, user.id, input);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/home/rooms/${input.roomId}/furniture/${input.furnitureId}`);
  revalidatePath("/items");
  revalidatePath("/home");
  return { itemId: result.id };
}

export interface UpdateItemInput {
  name: string;
  category: string;
  quantity: number;
  expiryDate?: string | null;
  /** undefined = leave the photo alone, null = remove it, a File = replace it. */
  photo?: File | null;
}

/** Everything an item's own Edit dialog can change — name, category, quantity, expiry, and the photo. Location changes go through the separate Move action instead. */
export async function updateItem(itemId: string, input: UpdateItemInput): Promise<{ ok: true } | { error: string }> {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { error: "Please give the item a name." };
  if (!Number.isFinite(input.quantity) || input.quantity < 1) return { error: "Quantity must be at least 1." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const update: Partial<Item> = {
    name: trimmedName,
    category: input.category,
    quantity: input.quantity,
    expiry_date: input.expiryDate ?? null,
  };

  if (input.photo === null) {
    update.photo_url = null;
  } else if (input.photo) {
    const formData = new FormData();
    formData.set("photo", input.photo);
    const { url, error: uploadError } = await uploadPhotoIfPresent(supabase, user.id, formData);
    if (uploadError) return { error: uploadError };
    update.photo_url = url ?? null;
  }

  const { error } = await supabase.from("items").update(update).eq("id", itemId);
  if (error) return { error: "Something went wrong while saving this item. Please try again." };

  revalidatePath(`/items/${itemId}`);
  revalidatePath("/items");
  revalidatePath("/home");
  return { ok: true };
}

export interface ItemDetail {
  item: Item;
  path: LocationNode[];
  homeId: string;
  roomId: string;
  furnitureId: string;
}

/** Powers the item-detail popup (ItemDetailSheet) — same data the full
 * /items/[itemId] page fetches, just callable on demand from a card click
 * instead of requiring a navigation. */
export async function getItemDetail(itemId: string): Promise<ItemDetail | null> {
  const supabase = await createClient();
  const { data: item } = await supabase.from("items").select("*").eq("id", itemId).maybeSingle();
  if (!item) return null;

  const index = await buildLocationIndex(supabase);
  const path = pathForStorageLocation(index, item.storage_location_id);
  if (!path) return null;

  const home = path.find((n) => n.type === "home");
  const room = path.find((n) => n.type === "room");
  const furniture = path.find((n) => n.type === "furniture");
  if (!home || !room || !furniture) return null;

  return { item, path, homeId: home.id, roomId: room.id, furnitureId: furniture.id };
}

export async function deleteItem(itemId: string) {
  const supabase = await createClient();
  await supabase.from("items").delete().eq("id", itemId);
  revalidatePath("/items");
  revalidatePath("/home");
  redirect("/items");
}

/** newFurnitureId is the Place the user picked in MoveItemDialog — resolved to that Place's one storage_location the same way createItem does. */
export async function moveItem(itemId: string, newFurnitureId: string) {
  const supabase = await createClient();
  const resolved = await resolveStorageLocationId(supabase, newFurnitureId);
  if ("error" in resolved) throw new Error(resolved.error);

  const { error } = await supabase.from("items").update({ storage_location_id: resolved.id }).eq("id", itemId);
  if (error) throw new Error("Something went wrong while moving this item. Please try again.");

  revalidatePath(`/items/${itemId}`);
  revalidatePath("/items");
  redirect(`/items/${itemId}`);
}
