"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationPath } from "@/components/shared/location-path";
import { MoveItemDialog } from "@/components/items/move-item-dialog";
import { ItemDeleteButton } from "@/components/items/item-delete-button";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import { getItemDetail, type ItemDetail } from "@/lib/actions/items";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

export function ItemDetailSheet({
  itemId,
  open,
  onOpenChange,
}: {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ItemDetail | null>(null);

  useEffect(() => {
    if (!open || !itemId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(null);
    getItemDetail(itemId).then(setDetail);
  }, [open, itemId]);

  const item = detail?.item;
  const CategoryIcon = item ? getIcon(categoryIcon(item.category)) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {!detail || !item || !CategoryIcon ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-6 px-4 pb-4">
            <SheetHeader className="p-0">
              <div className="flex items-start justify-between gap-4">
                <SheetTitle>{item.name}</SheetTitle>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/items/${item.id}/edit`}>
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  }
                />
              </div>
            </SheetHeader>

            <div className="rounded-2xl border bg-card p-4">
              <LocationPath nodes={detail.path} container={item.container} className="text-sm" iconClassName="size-4" />
            </div>

            {item.photo_url && (
              <Image
                src={item.photo_url}
                alt={item.name}
                width={640}
                height={360}
                className="h-56 w-full rounded-2xl border object-cover"
                unoptimized
              />
            )}

            <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-3">
              <Detail label="Category">
                <span className="flex items-center gap-1.5">
                  <CategoryIcon className="size-4 text-primary" />
                  {categoryLabel(item.category)}
                </span>
              </Detail>
              <Detail label="Quantity">{item.quantity}</Detail>
              <Detail label="Added">{new Date(item.created_at).toLocaleDateString()}</Detail>
              <Detail label="Last Updated">{new Date(item.updated_at).toLocaleDateString()}</Detail>
              {item.description && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Description</p>
                  <p className="mt-1 text-sm">{item.description}</p>
                </div>
              )}
              {item.tags.length > 0 && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tags</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <MoveItemDialog
                itemId={item.id}
                currentHomeId={detail.homeId}
                currentRoomId={detail.roomId}
                currentFurnitureId={detail.furnitureId}
                currentStorageLocationId={item.storage_location_id}
              />
              <ItemDeleteButton itemId={item.id} name={item.name} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
