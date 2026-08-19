"use client";

import { useState, useTransition } from "react";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LocationPicker } from "@/components/items/location-picker";
import { moveItem } from "@/lib/actions/items";

/**
 * Uncontrolled by default (renders its own "Move" trigger button, used on
 * the item-detail page and the flipped grid-card back face). Pass
 * `open`/`onOpenChange` to drive it from elsewhere instead — e.g. a
 * dropdown menu item — in which case no trigger is rendered.
 */
export function MoveItemDialog({
  itemId,
  currentHomeId,
  currentRoomId,
  currentFurnitureId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  itemId: string;
  currentHomeId: string;
  currentRoomId: string;
  currentFurnitureId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [selection, setSelection] = useState<{ furnitureId: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              <MoveRight className="size-4" />
              Move
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move item</DialogTitle>
        </DialogHeader>
        <LocationPicker
          initialHomeId={currentHomeId}
          initialRoomId={currentRoomId}
          initialFurnitureId={currentFurnitureId}
          onChange={setSelection}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selection || selection.furnitureId === currentFurnitureId || pending}
            onClick={() =>
              startTransition(async () => {
                if (!selection) return;
                await moveItem(itemId, selection.furnitureId);
              })
            }
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
