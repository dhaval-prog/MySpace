"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameHomeDialog } from "@/components/home/rename-home-dialog";
import { AddRoomDialog } from "@/components/home/add-room-dialog";
import { DeleteHomeDialog } from "@/components/home/delete-home-dialog";

/** The "..." beside the My Home title — Rename / Add Room / Delete, each
 * driving its existing dialog in controlled mode. */
export function HomeActionsMenu({
  homeId,
  homeName,
  roomCount,
}: {
  homeId: string;
  homeName: string;
  roomCount: number;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon" variant="ghost" aria-label="Home options" className="size-8 shrink-0 text-muted-foreground">
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-44 p-1.5">
          <DropdownMenuItem className="gap-2 px-2 py-1.5" onClick={() => setRenameOpen(true)}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 px-2 py-1.5" onClick={() => setAddRoomOpen(true)}>
            <Plus className="size-4" />
            Add Room
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="gap-2 px-2 py-1.5" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameHomeDialog homeId={homeId} currentName={homeName} open={renameOpen} onOpenChange={setRenameOpen} />
      <AddRoomDialog homeId={homeId} open={addRoomOpen} onOpenChange={setAddRoomOpen} />
      <DeleteHomeDialog homeId={homeId} homeName={homeName} roomCount={roomCount} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
