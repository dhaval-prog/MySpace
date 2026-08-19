"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditItemDialog, type EditableItem } from "@/components/items/edit-item-dialog";

export function EditItemButton({ item }: { item: EditableItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <EditItemDialog item={item} open={open} onOpenChange={setOpen} />
    </>
  );
}
