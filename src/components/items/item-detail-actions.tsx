"use client";

import { useState, useTransition } from "react";
import { Check, MoveRight, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListRow } from "@/components/layout/list-row";
import { MoveItemDialog } from "@/components/items/move-item-dialog";
import { EditItemDialog, type EditableItem } from "@/components/items/edit-item-dialog";
import { deleteItem } from "@/lib/actions/items";

interface Location {
  homeId: string;
  roomId: string;
  roomName: string;
  furnitureId: string;
  furnitureName: string;
}

/**
 * The item detail page's actions — "Mark used" (deleteItem, re-framed as
 * closing the loop on a consumable rather than a generic delete) plus
 * Move/Edit. `variant="menu"` packs Move/Edit into a compact "..." dropdown
 * next to the heading (desktop); `variant="list"` renders them as full
 * ListRow actions instead (mobile), matching how the rest of the app splits
 * a dense menu vs. a tappable list per breakpoint.
 */
export function ItemDetailActions({
  item,
  location,
  variant,
}: {
  item: EditableItem;
  location: Location;
  variant: "menu" | "list";
}) {
  const [markUsedOpen, setMarkUsedOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const markUsedDialog = (
    <Dialog open={markUsedOpen} onOpenChange={setMarkUsedOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark &ldquo;{item.name}&rdquo; as used?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This removes it from {location.furnitureName} and closes the loop — you&apos;ll see it again if you file a new one.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMarkUsedOpen(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={() => startTransition(() => deleteItem(item.id))}>
            <Check className="size-4" />
            Mark used
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const moveAndEditDialogs = (
    <>
      <MoveItemDialog
        itemId={item.id}
        currentHomeId={location.homeId}
        currentRoomId={location.roomId}
        currentFurnitureId={location.furnitureId}
        open={moveOpen}
        onOpenChange={setMoveOpen}
      />
      <EditItemDialog item={item} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );

  if (variant === "menu") {
    return (
      <div className="flex items-center gap-1.5">
        <Button className="rounded-full" onClick={() => setMarkUsedOpen(true)}>
          <Check className="size-4" />
          Mark used
        </Button>
        {markUsedDialog}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal className="size-4" /></Button>} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMoveOpen(true)}>
              <MoveRight className="size-4" />
              Move place
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {moveAndEditDialogs}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full rounded-2xl" disabled={pending} onClick={() => setMarkUsedOpen(true)}>
        <Check className="size-4" />
        Mark used
      </Button>
      {markUsedDialog}

      <div>
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Actions</p>
        <div className="mt-2 space-y-2">
          <ListRow
            onClick={() => setMoveOpen(true)}
            icon={<MoveRight className="size-4.5" />}
            title="Move place"
            subtitle={`${location.roomName} → ${location.furnitureName}`}
            chevron
          />
          <ListRow onClick={() => setEditOpen(true)} icon={<Pencil className="size-4.5" />} title="Edit item" subtitle="Name, qty, expiry" chevron />
        </div>
      </div>
      {moveAndEditDialogs}
    </div>
  );
}
