"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ItemForm } from "@/components/items/item-form";
import { createItem } from "@/lib/actions/items";

export function AddItemDialog({ homeId }: { homeId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="rounded-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add Item
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Add Item</DialogTitle>
            <p className="text-sm text-muted-foreground">Tell us what it is and exactly where you&apos;re keeping it.</p>
          </DialogHeader>
          <ItemForm action={createItem} initialLocation={{ homeId }} submitLabel="Save Item" />
        </DialogContent>
      </Dialog>
    </>
  );
}
