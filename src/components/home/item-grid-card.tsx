"use client";

import { useEffect, useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationPath } from "@/components/shared/location-path";
import { EditItemDialog } from "@/components/items/edit-item-dialog";
import { MoveItemDialog } from "@/components/items/move-item-dialog";
import { ItemDeleteButton } from "@/components/items/item-delete-button";
import { getIcon } from "@/lib/icon-map";
import { categoryLabel, categoryBadgeClass, categoryIcon } from "@/lib/constants";
import { deleteItem, getItemDetail, type ItemDetail } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";

function formatAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatAddedDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US");
}

/** A single small uppercase-label/value pair, matching the flipped card's Category/Quantity/Added row. */
function BackDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold">{children}</p>
    </div>
  );
}

/**
 * Flips in place to show item details on click, instead of opening a
 * separate sheet — the whole front face is the "show details" trigger, the
 * whole back face (outside its Edit/Move/Delete controls) is "hide
 * details," so the same click gesture toggles both directions. Both faces
 * are absolutely stacked inside a fixed-height, 3D-perspective wrapper so
 * the flip never shifts anything else in the grid.
 */
export function ItemGridCard({ item }: { item: Item & { furnitureName: string } }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!flipped || detail) return;
    getItemDetail(item.id).then(setDetail);
  }, [flipped, detail, item.id]);

  const CategoryIcon = getIcon(categoryIcon(item.category));

  return (
    <div className="relative h-48" style={{ perspective: "1600px" }}>
      <div
        className="relative h-full w-full transition-transform duration-500 ease-out"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border bg-card p-5"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${categoryBadgeClass(item.category)}`}>
              {categoryLabel(item.category)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="-mt-1 -mr-1.5 size-7 text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button type="button" onClick={() => setFlipped(true)} className="mt-3 block w-full text-left">
            <p className="truncate font-semibold">{item.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {categoryLabel(item.category)} · Qty {item.quantity} · {item.furnitureName}
            </p>
            <div className="mt-3 border-t pt-3">
              <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                Added {formatAddedDate(item.created_at)}
              </p>
            </div>
          </button>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border bg-card p-5"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <button type="button" onClick={() => setFlipped(false)} className="flex-1 overflow-y-auto text-left">
            {!detail ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <BackDetail label="Category">
                    <span className="flex items-center gap-1.5">
                      <CategoryIcon className="size-4 text-primary" />
                      {categoryLabel(item.category)}
                    </span>
                  </BackDetail>
                  <BackDetail label="Quantity">{item.quantity}</BackDetail>
                  <BackDetail label="Added">{formatAddedDateShort(item.created_at)}</BackDetail>
                </div>

                <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
                  <LocationPath nodes={detail.path} className="text-sm" iconClassName="size-4" />
                </div>
              </div>
            )}
          </button>

          {detail && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="secondary" className="rounded-xl" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
              </Button>
              <div className="flex gap-2">
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
        </div>
      </div>

      <EditItemDialog item={{ id: item.id, name: item.name, category: item.category }} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{item.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => startTransition(() => deleteItem(item.id))}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
