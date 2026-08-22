import Image from "next/image";
import { notFound } from "next/navigation";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildLocationIndex, pathForStorageLocation } from "@/lib/location";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import { expiryStatus, isUrgentExpiry, expiryBadgeLabel, byExpirySoonestFirst } from "@/lib/expiry";
import { displayName, cn } from "@/lib/utils";
import { ListRow } from "@/components/layout/list-row";
import { StatChip } from "@/components/layout/stat-chip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ItemDetailActions } from "@/components/items/item-detail-actions";
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

  const [{ data: siblingsRaw }, { data: profile }] = await Promise.all([
    supabase.from("items").select("*").eq("storage_location_id", item.storage_location_id).neq("id", item.id),
    supabase.from("profiles").select("name, email").eq("id", item.user_id).maybeSingle(),
  ]);
  const siblings = [...(siblingsRaw ?? [])].sort(byExpirySoonestFirst);

  const CategoryIcon = getIcon(categoryIcon(item.category));
  const status = expiryStatus(item.expiry_date);
  const addedByName = displayName(profile);
  const addedDate = new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const editableItem = { id: item.id, name: item.name, category: item.category, quantity: item.quantity, expiryDate: item.expiry_date, photoUrl: item.photo_url };
  const location = { homeId: home.id, roomId: room.id, roomName: room.name, furnitureId: furniture.id, furnitureName: furniture.name };

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
      />
      <DesktopBand
        breadcrumb={`${room.name} → ${furniture.name}${item.container ? ` → ${item.container}` : ""}`}
        title={item.name}
        subtitle={`Qty ${item.quantity} · added ${addedDate} by ${addedByName}${status.level !== "none" ? ` · expires ${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}` : ""}`}
        action={<ItemDetailActions item={editableItem} location={location} variant="menu" />}
      />

      <MobileHeroOverlap className="mt-3 space-y-4 pb-6">
        <div className="flex items-center justify-between px-1">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {room.name} → {furniture.name}
          </p>
          {item.container && (
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{item.container}</span>
          )}
        </div>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-xl">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Added {addedDate} by {addedByName}
              </p>
            </div>
            {status.level !== "none" && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase",
                  status.level === "expired" || isUrgentExpiry(item.expiry_date) ? "bg-blush-tint text-destructive" : "bg-positive/10 text-positive"
                )}
              >
                {expiryBadgeLabel(item.expiry_date)}
              </span>
            )}
          </div>

          {item.photo_url && (
            <Image src={item.photo_url} alt={item.name} width={640} height={360} sizes="100vw" className="mt-4 h-44 w-full rounded-2xl object-cover" />
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatChip label="Expires" value={status.level === "none" ? "Not set" : status.label} tone={status.level === "expired" ? "destructive" : "default"} />
            <StatChip label="Category" value={categoryLabel(item.category)} />
            <StatChip label="Qty" value={item.quantity} />
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
        </Card>

        <ItemDetailActions item={editableItem} location={location} variant="list" />

        {siblings.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Also in {furniture.name}</p>
              <p className="text-xs text-muted-foreground">
                {siblings.length} item{siblings.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {siblings.map((s) => {
                const sStatus = expiryStatus(s.expiry_date);
                const sUrgent = sStatus.level === "expired" || isUrgentExpiry(s.expiry_date);
                const SIcon = getIcon(categoryIcon(s.category));
                return (
                  <ListRow
                    key={s.id}
                    href={`/items/${s.id}`}
                    icon={<SIcon className="size-4.5" />}
                    title={s.name}
                    subtitle={[s.quantity > 1 ? `Qty ${s.quantity}` : null, s.container].filter(Boolean).join(" · ") || undefined}
                    trailing={
                      sStatus.level === "none" ? undefined : (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase",
                            sUrgent ? "bg-blush-tint text-destructive" : "bg-positive/10 text-positive"
                          )}
                        >
                          {expiryBadgeLabel(s.expiry_date)}
                        </span>
                      )
                    }
                    chevron={sStatus.level === "none"}
                  />
                );
              })}
            </div>
          </div>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Also in {furniture.name}</p>
            <p className="text-xs text-muted-foreground">
              {siblings.length} item{siblings.length === 1 ? "" : "s"}
            </p>
          </div>
          {siblings.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Nothing else filed here yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {siblings.map((s) => {
                const sStatus = expiryStatus(s.expiry_date);
                const sUrgent = sStatus.level === "expired" || isUrgentExpiry(s.expiry_date);
                const SIcon = getIcon(categoryIcon(s.category));
                return (
                  <ListRow
                    key={s.id}
                    href={`/items/${s.id}`}
                    icon={<SIcon className="size-4.5" />}
                    title={s.name}
                    subtitle={[s.quantity > 1 ? `Qty ${s.quantity}` : null, s.container].filter(Boolean).join(" · ") || undefined}
                    trailing={
                      sStatus.level === "none" ? undefined : (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase",
                            sUrgent ? "bg-blush-tint text-destructive" : "bg-positive/10 text-positive"
                          )}
                        >
                          {expiryBadgeLabel(s.expiry_date)}
                        </span>
                      )
                    }
                    chevron={sStatus.level === "none"}
                  />
                );
              })}
            </div>
          )}
        </div>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            {item.photo_url ? (
              <Image src={item.photo_url} alt={item.name} width={112} height={112} className="size-28 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="flex size-28 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <CategoryIcon className="size-9" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-2xl">{item.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {categoryLabel(item.category)} · Qty {item.quantity}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Added {addedDate} by {addedByName}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatChip
              label="Status"
              value={status.level === "none" ? "—" : status.label}
              tone={status.level === "expired" ? "destructive" : "default"}
            />
            <StatChip label="Room" value={room.name} />
            <StatChip label="Place" value={furniture.name} />
            <StatChip label="Shelf" value={item.container ?? "—"} />
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
        </Card>
      </div>
    </div>
  );
}
