import Image from "next/image";
import { notFound } from "next/navigation";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildLocationIndex, pathForStorageLocation } from "@/lib/location";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import { expiryStatus } from "@/lib/expiry";
import { LocationPath } from "@/components/shared/location-path";
import { ExpiryBadge } from "@/components/items/expiry-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EditItemButton } from "@/components/items/edit-item-button";
import { MoveItemDialog } from "@/components/items/move-item-dialog";
import { ItemDeleteButton } from "@/components/items/item-delete-button";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";

export default async function ItemDetailPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase.from("items").select("*").eq("id", itemId).maybeSingle();
  if (!item) notFound();

  const index = await buildLocationIndex(supabase);
  const path = pathForStorageLocation(index, item.storage_location_id);
  if (!path) notFound();

  const home = path.find((n) => n.type === "home")!;
  const room = path.find((n) => n.type === "room")!;
  const furniture = path.find((n) => n.type === "furniture")!;
  const CategoryIcon = getIcon(categoryIcon(item.category));
  const status = expiryStatus(item.expiry_date);

  return (
    <div>
      <MobileBand
        title="Item"
        backHref={`/home/rooms/${room.id}`}
        right={
          <RoundIconButton href="/settings" ariaLabel="Profile">
            <User className="size-4.5" />
          </RoundIconButton>
        }
        stats={[
          { label: "Expires in", value: status.level === "none" ? "—" : status.label, tone: status.level === "expired" ? "destructive" : "default" },
          { label: "Quantity", value: item.quantity },
        ]}
      />
      <DesktopBand
        breadcrumb={`${room.name} → ${furniture.name}`}
        title={item.name}
        subtitle={`Qty ${item.quantity} · added ${new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
        action={<EditItemButton item={{ id: item.id, name: item.name, category: item.category, quantity: item.quantity, expiryDate: item.expiry_date, photoUrl: item.photo_url }} />}
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-xl">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Added {new Date(item.created_at).toLocaleDateString()} · ₹{item.quantity}</p>
            </div>
            <ExpiryBadge expiryDate={item.expiry_date} />
          </div>
          <div className="mt-3">
            <LocationPath nodes={path} container={item.container} className="text-sm" iconClassName="size-4" />
          </div>

          {item.photo_url && (
            <Image src={item.photo_url} alt={item.name} width={640} height={360} sizes="100vw" className="mt-4 h-44 w-full rounded-2xl object-cover" />
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Expires</p>
              <p className="mt-0.5 text-sm font-semibold">{status.level === "none" ? "Not set" : status.label}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Category</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold">
                <CategoryIcon className="size-3.5 text-primary" />
                {categoryLabel(item.category)}
              </p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Qty</p>
              <p className="mt-0.5 text-sm font-semibold">{item.quantity}</p>
            </div>
          </div>

          {item.description && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Description</p>
              <p className="mt-1 text-sm">{item.description}</p>
            </div>
          )}
          {item.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            <EditItemButton item={{ id: item.id, name: item.name, category: item.category, quantity: item.quantity, expiryDate: item.expiry_date, photoUrl: item.photo_url }} />
            <MoveItemDialog itemId={item.id} currentHomeId={home.id} currentRoomId={room.id} currentFurnitureId={furniture.id} />
            <ItemDeleteButton itemId={item.id} name={item.name} />
          </div>
        </Card>
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          {item.photo_url ? (
            <Image src={item.photo_url} alt={item.name} width={640} height={360} sizes="(max-width: 1024px) 50vw, 33vw" className="h-56 w-full rounded-2xl object-cover" />
          ) : (
            <div className="flex h-56 w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">No photo</div>
          )}
          <div className="mt-4">
            <LocationPath nodes={path} container={item.container} className="text-sm" iconClassName="size-4" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <p className="font-heading text-2xl">{item.name}</p>
            {item.expiry_date && <p className="font-heading text-2xl">{new Date(item.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{categoryLabel(item.category)} · Qty {item.quantity}</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Status</p>
              <p className={`mt-0.5 text-sm font-semibold ${status.level === "expired" ? "text-destructive" : ""}`}>{status.level === "none" ? "—" : status.label}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Room</p>
              <p className="mt-0.5 text-sm font-semibold">{room.name}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Place</p>
              <p className="mt-0.5 text-sm font-semibold">{furniture.name}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Qty</p>
              <p className="mt-0.5 text-sm font-semibold">{item.quantity}</p>
            </div>
          </div>

          {item.description && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Description</p>
              <p className="mt-1 text-sm">{item.description}</p>
            </div>
          )}
          {item.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            <MoveItemDialog itemId={item.id} currentHomeId={home.id} currentRoomId={room.id} currentFurnitureId={furniture.id} />
            <ItemDeleteButton itemId={item.id} name={item.name} />
          </div>
        </Card>
      </div>
    </div>
  );
}
