"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITEM_CATEGORIES, categoryLabel } from "@/lib/constants";
import { updateItemNameCategory } from "@/lib/actions/items";

/**
 * Editing an item is deliberately limited to its name and category —
 * everything else (description, container, tags, photo) is set once at
 * creation, and location changes go through the separate Move action.
 * Controlled (`open`/`onOpenChange`) so both the grid card's dropdown and
 * the full item-detail page can trigger the same dialog.
 */
export function EditItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: { id: string; name: string; category: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setName(item.name);
          setCategory(item.category);
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-item-name">Item Name</Label>
            <Input id="edit-item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Passport" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "other")}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => categoryLabel(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !name.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await updateItemNameCategory(item.id, name, category);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                onOpenChange(false);
                router.refresh();
              })
            }
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
