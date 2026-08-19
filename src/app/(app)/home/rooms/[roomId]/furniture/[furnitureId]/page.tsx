import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ChevronRight, Home as HomeIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFurnitureDetail } from "@/lib/furniture-data";
import { getIcon, getCompactIcon } from "@/lib/icon-map";
import { ItemGridCard } from "@/components/home/item-grid-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default async function FurniturePage({ params }: { params: Promise<{ roomId: string; furnitureId: string }> }) {
  const { roomId, furnitureId } = await params;
  const supabase = await createClient();
  const detail = await getFurnitureDetail(supabase, furnitureId);
  if (!detail) notFound();

  const { home, room, furniture, items } = detail;
  const RoomIcon = getCompactIcon(room.icon);
  const FurnitureIcon = getIcon(furniture.icon);

  const cardItems = items.map((item) => ({ ...item, roomName: room.name, furnitureName: furniture.name, furnitureIcon: furniture.icon }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/home?id=${home.id}`} className="flex items-center gap-1 hover:text-foreground">
          <HomeIcon className="size-3.5" />
          {home.name}
        </Link>
        <ChevronRight className="size-3.5 opacity-50" />
        <Link href={`/home/rooms/${roomId}`} className="flex items-center gap-1 hover:text-foreground">
          <RoomIcon className="size-3.5" />
          {room.name}
        </Link>
        <ChevronRight className="size-3.5 opacity-50" />
        <span className="flex items-center gap-1 font-medium text-foreground">
          <FurnitureIcon className="size-3.5" />
          {furniture.name}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{furniture.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          size="sm"
          render={
            <Link href={`/items/new?roomId=${roomId}&furnitureId=${furnitureId}&homeId=${home.id}`}>
              <Plus className="size-4" />
              Add Item
            </Link>
          }
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={furniture.icon}
          title="Nothing here yet"
          description={`Add the first item you keep in ${furniture.name}.`}
          action={
            <Button
              render={
                <Link href={`/items/new?roomId=${roomId}&furnitureId=${furnitureId}&homeId=${home.id}`}>
                  <Plus className="size-4" />
                  Add Item
                </Link>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cardItems.map((item) => (
            <ItemGridCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
