"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addFurniture(
  roomId: string,
  name: string,
  type: string,
  icon: string,
  description?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { count } = await supabase
    .from("furniture")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  const { data: furniture, error } = await supabase
    .from("furniture")
    .insert({
      user_id: user.id,
      room_id: roomId,
      name,
      type,
      icon,
      description: description || null,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error || !furniture) throw new Error(error?.message ?? "Failed to add furniture");

  // Every Place gets exactly one storage_location, auto-managed and never
  // surfaced in the UI — items attach to the Place directly from the
  // user's perspective (see storage_locations_one_per_furniture in
  // supabase/schema.sql). This row is what items.storage_location_id
  // actually points at underneath.
  await supabase.from("storage_locations").insert({
    user_id: user.id,
    furniture_id: furniture.id,
    name,
    type: "default",
  });

  revalidatePath("/home/rooms/" + roomId);
  return furniture.id as string;
}

export async function renameFurniture(
  furnitureId: string,
  roomId: string,
  name: string,
  description?: string
) {
  const supabase = await createClient();
  await supabase.from("furniture").update({ name, description: description || null }).eq("id", furnitureId);
  // Keep the Place's one auto-managed storage_location's name in sync — it's
  // never edited directly, so this is the only place it can drift from the
  // furniture's own name.
  await supabase.from("storage_locations").update({ name }).eq("furniture_id", furnitureId);
  revalidatePath(`/home/rooms/${roomId}/furniture/${furnitureId}`);
  revalidatePath(`/home/rooms/${roomId}`);
}

export async function deleteFurniture(furnitureId: string, roomId: string) {
  const supabase = await createClient();
  await supabase.from("furniture").delete().eq("id", furnitureId);
  revalidatePath("/home/rooms/" + roomId);
  redirect("/home/rooms/" + roomId);
}
