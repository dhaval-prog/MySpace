"use client";

import { useEffect, useState, useTransition } from "react";
import { MoreVertical, Pencil, MoveRight, Trash2, Clock, ChevronRight, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditItemDialog } from "@/components/items/edit-item-dialog";
import { MoveItemDialog } from "@/components/items/move-item-dialog";
import { getIcon } from "@/lib/icon-map";
import { categoryLabel, categoryIcon } from "@/lib/constants";
import { deleteItem, getItemDetail, type ItemDetail } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";

function formatAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * A flat, static card — no flip. Everything (category, name, quantity,
 * furniture/storage location, added date, and the Edit/Move/Delete menu)
 * lives on one face, since the furniture/storage names are already part of
 * the list view's data and don't need a lazy detail fetch to display.
 */
export function ItemGridCard({
  item,
}: {
  item: Item & { furnitureName: string; furnitureIcon: string; storageLocationName: string };
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!moveOpen || detail) return;
    getItemDetail(item.id).then(setDetail);
  }, [moveOpen, detail, item.id]);

  const CategoryIcon = getIcon(categoryIcon(item.category));
  const FurnitureIcon = getIcon(item.furnitureIcon);

  return (
    <div className="rounded-2xl border bg-card p-5 transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.03] hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:scale-100">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <CategoryIcon className="size-4 text-primary" />
          {categoryLabel(item.category)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="ghost" className="-mt-1 -mr-1.5 size-7 text-muted-foreground">
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44 p-1.5">
            <DropdownMenuItem className="gap-2 px-2 py-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 px-2 py-1.5" onClick={() => setMoveOpen(true)}>
              <MoveRight className="size-4" />
              Move Item
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="gap-2 px-2 py-1.5" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{item.name}</span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Qty {item.quantity}</span>
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <FurnitureIcon className="size-3.5 shrink-0" />
          <span className="truncate">{item.furnitureName}</span>
          <ChevronRight className="size-3 shrink-0 opacity-50" />
          <Rows3 className="size-3.5 shrink-0" />
          <span className="truncate">{item.storageLocationName}</span>
        </p>
      </div>

      <div className="mt-3 border-t pt-3">
        <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Added {formatAddedDate(item.created_at)}
        </p>
      </div>

      <EditItemDialog item={{ id: item.id, name: item.name, category: item.category }} open={editOpen} onOpenChange={setEditOpen} />

      {detail && (
        <MoveItemDialog
          itemId={item.id}
          currentHomeId={detail.homeId}
          currentRoomId={detail.roomId}
          currentFurnitureId={detail.furnitureId}
          currentStorageLocationId={item.storage_location_id}
          open={moveOpen}
          onOpenChange={setMoveOpen}
        />
      )}

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
