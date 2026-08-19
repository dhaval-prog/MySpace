"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITEM_CATEGORIES, categoryLabel } from "@/lib/constants";
import { updateItem } from "@/lib/actions/items";

export interface EditableItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  expiryDate: string | null;
  photoUrl: string | null;
}

/** Controlled (`open`/`onOpenChange`) so both the grid card's dropdown and the full item-detail page can trigger the same dialog. Location changes go through the separate Move action instead. */
export function EditItemDialog({ item, open, onOpenChange }: { item: EditableItem; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [expiryDate, setExpiryDate] = useState(item.expiryDate ?? "");
  const [photoFile, setPhotoFile] = useState<File | null | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(item.photoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetFromItem() {
    setName(item.name);
    setCategory(item.category);
    setQuantity(String(item.quantity));
    setExpiryDate(item.expiryDate ?? "");
    setPhotoFile(undefined);
    setPhotoPreview(item.photoUrl);
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) resetFromItem();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Photo</Label>
            {photoPreview ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL / Supabase Storage URL, not an optimizable static asset */}
                <img src={photoPreview} alt="" className="h-24 w-24 rounded-lg border object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                <Camera className="size-4" />
                Add a photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPhotoFile(file);
                setPhotoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-item-name">Item Name</Label>
            <Input id="edit-item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Passport" autoFocus />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-item-quantity">Quantity</Label>
              <Input id="edit-item-quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-item-expiry">Expiry (optional)</Label>
            <Input id="edit-item-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
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
                const result = await updateItem(item.id, {
                  name,
                  category,
                  quantity: Number(quantity) || 1,
                  expiryDate: expiryDate || null,
                  photo: photoFile,
                });
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
