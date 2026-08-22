import Link from "next/link";
import { Plus } from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon } from "@/lib/constants";
import { expiryStatus, isUrgentExpiry, expiryBadgeLabel, byExpirySoonestFirst } from "@/lib/expiry";
import { relativeDay, cn } from "@/lib/utils";
import { ListRow } from "@/components/layout/list-row";
import { StatChip } from "@/components/layout/stat-chip";
import { PlaceActionsMenu } from "@/components/home/place-actions-menu";
import type { FurnitureDetail } from "@/lib/furniture-data";

/**
 * A Place's own detail — heading, live stats, and its full Contents list —
 * shared between the Room page's embedded desktop panel and the standalone
 * furniture page mobile navigates to, so the two never drift apart.
 */
export function PlaceDetailPanel({ detail }: { detail: FurnitureDetail }) {
  const { home, room, furniture, items } = detail;
  const sorted = [...items].sort(byExpirySoonestFirst);
  const statuses = new Map(items.map((item) => [item.id, expiryStatus(item.expiry_date)]));
  const expiringCount = items.filter((item) => {
    const level = statuses.get(item.id)!.level;
    return level === "soon" || level === "expired";
  }).length;
  const fineCount = items.length - expiringCount;
  const lastFiled = items[0]?.created_at;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading text-3xl leading-tight text-foreground">{furniture.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {room.name} → {furniture.name} · {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {expiringCount > 0 && (
            <p className="font-heading text-3xl text-foreground">
              {expiringCount} <span className="text-lg">soon</span>
            </p>
          )}
          <Link
            href={`/items/new?roomId=${room.id}&furnitureId=${furniture.id}&homeId=${home.id}`}
            className="hidden h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85 md:inline-flex"
          >
            <Plus className="size-4" />
            Add Item
          </Link>
          <PlaceActionsMenu roomId={room.id} placeId={furniture.id} placeName={furniture.name} itemCount={items.length} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip label="Items" value={items.length} />
        <StatChip label="Expiring" value={expiringCount} tone={expiringCount > 0 ? "destructive" : "default"} />
        <StatChip label="Fine" value={fineCount} />
        <StatChip label="Last filed" value={lastFiled ? relativeDay(lastFiled) : "—"} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Contents</p>
          <p className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing filed here yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {sorted.map((item) => {
              const status = statuses.get(item.id)!;
              const urgent = status.level === "expired" || isUrgentExpiry(item.expiry_date);
              const ItemIcon = getIcon(categoryIcon(item.category));
              const subtitle = [item.quantity > 1 ? `Qty ${item.quantity}` : null, item.container].filter(Boolean).join(" · ");
              return (
                <ListRow
                  key={item.id}
                  href={`/items/${item.id}`}
                  icon={<ItemIcon className="size-4.5" />}
                  title={item.name}
                  subtitle={subtitle || undefined}
                  trailing={
                    status.level === "none" ? undefined : (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase",
                          urgent ? "bg-blush-tint text-destructive" : "bg-positive/10 text-positive"
                        )}
                      >
                        {expiryBadgeLabel(item.expiry_date)}
                      </span>
                    )
                  }
                  chevron={status.level === "none"}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
