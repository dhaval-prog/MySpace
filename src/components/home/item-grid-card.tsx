"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { MoreVertical, Pencil, MoveRight, Trash2, Clock, MapPin, Package } from "lucide-react";
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
import { ExpiryBadge } from "@/components/items/expiry-badge";
import { getIcon } from "@/lib/icon-map";
import { categoryLabel, categoryIcon } from "@/lib/constants";
import { expiryStatus } from "@/lib/expiry";
import { deleteItem, getItemDetail, type ItemDetail } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";

function formatAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Clicking the card 3D-flips it (spec §6): the front is the compact
 * management view (category, name+qty, Room → Place, Edit/Move/Delete
 * menu); the back prominently shows the photo, name, Room → Place, and
 * expiry status/added date — the "where is it, at a glance" face. Same
 * col-start-1/row-start-1 + perspective/rotateY technique used for the
 * goal card's Contribute flip.
 */
export function ItemGridCard({
  item,
}: {
  item: Item & { roomName: string; furnitureName: string; furnitureIcon: string };
}) {
  const [flipped, setFlipped] = useState(false);
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
  const status = expiryStatus(item.expiry_date);

  return (
    <div className="relative [perspective:1600px]">
      <div
        className="grid transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none motion-reduce:duration-0"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front — compact management view */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            setFlipped(true);
          }}
          className="col-start-1 row-start-1 cursor-pointer rounded-2xl border bg-card p-5 transition-transform duration-200 ease-out [backface-visibility:hidden] hover:z-10 hover:scale-[1.02] hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CategoryIcon className="size-4 text-primary" />
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
              <DropdownMenuContent align="end" className="w-44 p-1.5" onClick={(e) => e.stopPropagation()}>
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
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">
                {item.roomName} → {item.furnitureName}
              </span>
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Added {formatAddedDate(item.created_at)}
            </p>
            <ExpiryBadge expiryDate={item.expiry_date} />
          </div>
        </div>

        {/* Back — the prominent "where is it" face */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped(false)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            setFlipped(false);
          }}
          className="col-start-1 row-start-1 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          {item.photo_url ? (
            <Image
              src={item.photo_url}
              alt={item.name}
              width={96}
              height={96}
              unoptimized
              className="size-24 rounded-2xl border object-cover"
            />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-2xl bg-muted">
              <Package className="size-8 text-muted-foreground" />
            </span>
          )}
          <div>
            <p className="font-semibold">{item.name}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {item.roomName} → {item.furnitureName}
            </p>
          </div>
          {status.level === "none" ? (
            <p className="font-mono text-xs text-muted-foreground">Added {formatAddedDate(item.created_at)}</p>
          ) : (
            <ExpiryBadge expiryDate={item.expiry_date} className="text-sm" />
          )}
        </div>
      </div>

      <EditItemDialog
        item={{ id: item.id, name: item.name, category: item.category, quantity: item.quantity, expiryDate: item.expiry_date, photoUrl: item.photo_url }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {detail && (
        <MoveItemDialog
          itemId={item.id}
          currentHomeId={detail.homeId}
          currentRoomId={detail.roomId}
          currentFurnitureId={detail.furnitureId}
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
