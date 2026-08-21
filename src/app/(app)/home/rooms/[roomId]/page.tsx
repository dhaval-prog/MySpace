import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddFurnitureDialog } from "@/components/home/add-furniture-dialog";
import { FurnitureCard } from "@/components/home/furniture-card";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";
import type { RoomType } from "@/lib/constants";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) notFound();

  const { data: home } = await supabase.from("homes").select("*").eq("id", room.home_id).maybeSingle();
  if (!home) notFound();

  const { data: furniture } = await supabase
    .from("furniture")
    .select("*")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: true });

  const furnitureIds = (furniture ?? []).map((f) => f.id);
  const { data: locations } = furnitureIds.length
    ? await supabase.from("storage_locations").select("id, furniture_id").in("furniture_id", furnitureIds)
    : { data: [] as { id: string; furniture_id: string }[] };

  const locationIds = (locations ?? []).map((l) => l.id);
  const { data: items } = locationIds.length
    ? await supabase.from("items").select("id, storage_location_id").in("storage_location_id", locationIds)
    : { data: [] as { id: string; storage_location_id: string }[] };

  const locToFurniture = new Map((locations ?? []).map((l) => [l.id, l.furniture_id]));
  const countByFurniture = new Map<string, number>();
  for (const item of items ?? []) {
    const fId = locToFurniture.get(item.storage_location_id);
    if (!fId) continue;
    countByFurniture.set(fId, (countByFurniture.get(fId) ?? 0) + 1);
  }

  const placeCount = (furniture ?? []).length;
  const itemCount = (items ?? []).length;

  return (
    <div>
      <MobileBand title={room.name} backHref={`/home?id=${home.id}`} stats={[{ label: "Items here", value: itemCount }, { label: "Places", value: placeCount }]} />
      <DesktopBand
        breadcrumb={`My Home → ${room.name}`}
        title={room.name}
        subtitle={`${itemCount} items across ${placeCount} place${placeCount === 1 ? "" : "s"}`}
        action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} />}
      />

      <MobileHeroOverlap className="pb-6">
        {placeCount === 0 ? (
          <EmptyState
            icon={room.icon}
            isRoomIcon
            title="No places yet"
            description="This room is empty. Add your first place — a fridge, a wardrobe, a shelf — to start organizing your belongings."
            action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} />}
          />
        ) : (
          <Card className="p-5">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Places {placeCount}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(furniture ?? []).map((f) => (
                <FurnitureCard key={f.id} roomId={roomId} furniture={f} itemCount={countByFurniture.get(f.id) ?? 0} />
              ))}
            </div>
          </Card>
        )}
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        {placeCount === 0 ? (
          <EmptyState
            icon={room.icon}
            isRoomIcon
            title="No places yet"
            description="This room is empty. Add your first place — a fridge, a wardrobe, a shelf — to start organizing your belongings."
            action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} />}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(furniture ?? []).map((f) => (
              <FurnitureCard key={f.id} roomId={roomId} furniture={f} itemCount={countByFurniture.get(f.id) ?? 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
