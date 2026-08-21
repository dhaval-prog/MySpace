import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRoomDetailView } from "@/lib/room-detail-data";
import { ItemForm } from "@/components/items/item-form";
import { createItem } from "@/lib/actions/items";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";
import { NewHomeSetup } from "@/components/home/new-home-setup";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string; furnitureId?: string; homeId?: string; name?: string }>;
}) {
  const { roomId, furnitureId, homeId: homeIdParam, name } = await searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  // The "+ Add Item" shortcuts that don't already know which home they're
  // in (the bottom nav's + button, the Items page) rely on this falling
  // back to the user's first home — without it, ItemForm's homeId-gated
  // room lookup silently never runs and the room picker always reads
  // "no rooms yet".
  const { data: homes } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true });
  if (!homes || homes.length === 0) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-3xl p-4 md:p-8">
          <NewHomeSetup />
        </div>
      </div>
    );
  }
  const homeId = homeIdParam && homes.some((h) => h.id === homeIdParam) ? homeIdParam : homes[0].id;
  const homeName = homes.find((h) => h.id === homeId)?.name ?? "Home";

  // Arriving from a specific Place's own "Add Item" button (roomId already
  // known) gets a contextual "Filing into {room}" band instead of the
  // generic one — the room's own totals are already exactly what
  // getRoomDetailView computes for its own page.
  const roomContext = roomId ? await getRoomDetailView(supabase, roomId) : null;

  return (
    <div>
      <MobileBand
        title="Add Item"
        backHref="/items"
        right={
          <RoundIconButton href="/settings" ariaLabel="Profile">
            <User className="size-4.5" />
          </RoundIconButton>
        }
        stats={
          roomContext
            ? [
                { label: "Filing into", value: roomContext.room.name },
                { label: "Items there", value: roomContext.totals.items },
              ]
            : undefined
        }
      />
      <DesktopBand breadcrumb={`Add item · ${homeName}`} title="What are you putting away?" subtitle="Name and place are required; everything else can wait" />

      <MobileHeroOverlap className="pb-6">
        <Card className="p-5">
          <ItemForm action={createItem} initialLocation={{ roomId, furnitureId, homeId }} initialName={name} submitLabel="Save Item" variant="mobile" />
        </Card>
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        <Card className="max-w-4xl p-6">
          <ItemForm action={createItem} initialLocation={{ roomId, furnitureId, homeId }} initialName={name} submitLabel="Save Item" variant="desktop" />
        </Card>
      </div>
    </div>
  );
}
