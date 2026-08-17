"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { renameHome } from "@/lib/actions/homes";

export function RenameHomeDialog({ homeId, currentName }: { homeId: string; currentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();

  return (
    <>
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
      <Dialog open={open} onOpenChange={setOpen}>
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
