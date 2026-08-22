import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRoomDetailView } from "@/lib/room-detail-data";
import { getFurnitureDetail } from "@/lib/furniture-data";
import { getCompactIcon } from "@/lib/icon-map";
import { cn, spellSmallNumber, capitalize } from "@/lib/utils";
import { AddFurnitureDialog } from "@/components/home/add-furniture-dialog";
import { PlaceDetailPanel } from "@/components/home/place-detail-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";
import { ListRow } from "@/components/layout/list-row";
import { StatChip } from "@/components/layout/stat-chip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RoomType } from "@/lib/constants";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ place?: string }>;
}) {
  const { roomId } = await params;
  const { place } = await searchParams;
  const supabase = await createClient();

  const view = await getRoomDetailView(supabase, roomId);
  if (!view) notFound();
  const { home, room, places, totals } = view;

  const fineOf = (itemCount: number, expiringCount: number) => (itemCount > 0 ? Math.round(((itemCount - expiringCount) / itemCount) * 100) : 100);
  const inGoodOrderPct = fineOf(totals.items, totals.expiring);
  const busiestPlaceId = places.length > 0 ? places.reduce((a, b) => (b.itemCount > a.itemCount ? b : a)).id : null;
  const selectedPlaceId = place && places.some((p) => p.id === place) ? place : places[0]?.id;
  const selectedDetail = selectedPlaceId ? await getFurnitureDetail(supabase, selectedPlaceId) : null;

  const headlineWords =
    totals.expiring > 0 ? `${capitalize(spellSmallNumber(totals.expiring))} thing${totals.expiring === 1 ? "" : "s"} in here expire this week` : null;

  return (
    <div>
      <MobileBand title={room.name} backHref={`/home?id=${home.id}`} />
      <DesktopBand
        breadcrumb={`My Home → ${room.name}`}
        title={room.name}
        subtitle={`${totals.items} items across ${totals.places} place${totals.places === 1 ? "" : "s"}${totals.expiring > 0 ? ` · ${totals.expiring} expiring this week` : ""}`}
        action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} roomName={room.name} trigger={<Button><Plus className="size-4" />Add to {room.name}</Button>} />}
      />

      <div className="mt-4 flex items-center justify-between px-5 md:hidden">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{room.name}</p>
        <p className="text-sm text-muted-foreground">
          {totals.places} place{totals.places === 1 ? "" : "s"}
        </p>
      </div>

      <MobileHeroOverlap className="mt-3 space-y-4 pb-6">
        <Card className="p-5">
          <p className="font-heading text-xl leading-tight text-foreground">
            {headlineWords ? `${headlineWords}.` : "Everything in here is in order."}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatChip label="Items" value={totals.items} />
            <StatChip label="Places" value={totals.places} />
            <StatChip label="Expiring" value={totals.expiring} tone={totals.expiring > 0 ? "destructive" : "default"} />
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${inGoodOrderPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground uppercase">{inGoodOrderPct}% in good order</p>
        </Card>

        {places.length === 0 ? (
          <EmptyState
            icon={room.icon}
            isRoomIcon
            title="No places yet"
            description="This room is empty. Add your first place — a fridge, a wardrobe, a shelf — to start organizing your belongings."
            action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} roomName={room.name} />}
          />
        ) : (
          <div>
            <p className="px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Places {places.length}</p>
            <div className="mt-2 space-y-2">
              {places.map((p) => {
                const PlaceIcon = getCompactIcon(p.icon);
                const isBusiest = p.id === busiestPlaceId;
                return (
                  <ListRow
                    key={p.id}
                    href={`/home/rooms/${roomId}/furniture/${p.id}`}
                    icon={<PlaceIcon className="size-4.5" />}
                    iconClassName={isBusiest ? "bg-chart-2 text-foreground" : undefined}
                    title={p.name}
                    subtitle={`${p.itemCount} item${p.itemCount === 1 ? "" : "s"}`}
                    chevron
                    barPct={isBusiest ? fineOf(p.itemCount, p.expiringCount) : undefined}
                  />
                );
              })}
            </div>
          </div>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-[3fr_7fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Places</p>
            <AddFurnitureDialog
              roomId={roomId}
              roomType={room.type as RoomType}
              roomName={room.name}
              trigger={
                <button type="button" className="text-sm font-medium text-primary">
                  New place
                </button>
              }
            />
          </div>

          {places.length === 0 ? (
            <EmptyState
              icon={room.icon}
              isRoomIcon
              title="No places yet"
              description="This room is empty. Add your first place — a fridge, a wardrobe, a shelf — to start organizing your belongings."
              action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} roomName={room.name} />}
            />
          ) : (
            <>
              <div className="space-y-2">
                {places.map((p) => {
                  const PlaceIcon = getCompactIcon(p.icon);
                  const isSelected = p.id === selectedPlaceId;
                  return (
                    <Link key={p.id} href={`/home/rooms/${roomId}?place=${p.id}`} className="block">
                      <ListRow
                        icon={<PlaceIcon className="size-4.5" />}
                        iconClassName={isSelected ? "bg-chart-2 text-foreground" : undefined}
                        title={p.name}
                        subtitle={`${p.itemCount} item${p.itemCount === 1 ? "" : "s"}${p.expiringCount > 0 ? ` · ${p.expiringCount} expiring` : ""}`}
                        className={cn(isSelected && "ring-1 ring-secondary/40")}
                        barPct={isSelected ? fineOf(p.itemCount, p.expiringCount) : undefined}
                      />
                    </Link>
                  );
                })}
              </div>
              <AddFurnitureDialog
                roomId={roomId}
                roomType={room.type as RoomType}
                roomName={room.name}
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                  >
                    <Plus className="size-4" />
                    New place
                  </button>
                }
              />
            </>
          )}
        </div>

        <div className="space-y-4">
          {selectedDetail && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{selectedDetail.furniture.name}</p>
              <p className="text-xs text-muted-foreground">Sorted by what expires first</p>
            </div>
          )}
          {selectedDetail ? (
            <Card className="p-6">
              <PlaceDetailPanel detail={selectedDetail} />
            </Card>
          ) : (
            <EmptyState
              icon={room.icon}
              isRoomIcon
              title="No place selected"
              description="Add a place to this room to start filing items into it."
              action={<AddFurnitureDialog roomId={roomId} roomType={room.type as RoomType} roomName={room.name} />}
            />
          )}
        </div>
      </div>
    </div>
  );
}
