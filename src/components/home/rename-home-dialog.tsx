"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { renameHome } from "@/lib/actions/homes";

/**
 * Uncontrolled by default (renders its own pencil trigger). Pass
 * `open`/`onOpenChange` to drive it from elsewhere instead — e.g. a
 * dropdown menu item — in which case no trigger is rendered.
 */
export function RenameHomeDialog({
  homeId,
  currentName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  homeId: string;
  currentName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {controlledOpen === undefined && (
        <button
          type="button"
          aria-label="Rename home"
          onClick={() => {
            setName(currentName);
            setOpen(true);
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setName(currentName);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename home</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !name.trim()}
              onClick={() =>
                startTransition(async () => {
                  await renameHome(homeId, name.trim());
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
