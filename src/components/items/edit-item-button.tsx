"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditItemDialog } from "@/components/items/edit-item-dialog";

export function EditItemButton({ item }: { item: { id: string; name: string; category: string } }) {
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
