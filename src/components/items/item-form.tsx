"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker } from "@/components/items/location-picker";
import { ITEM_CATEGORIES, categoryLabel } from "@/lib/constants";
import type { ItemFormState } from "@/lib/actions/items";

type ItemAction = (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;

/**
 * Always a "create" form — kept deliberately minimal (Storage Location,
 * Item Name, Category, Quantity only). Description/Container/Tags/Photo
 * were removed from item creation entirely, matching how editing an
 * existing item is limited to name + category via EditItemDialog.
 */
export function ItemForm({
  action,
  initialLocation,
  initialName,
  locationLabel,
  submitLabel,
}: {
  action: ItemAction;
  initialLocation?: { roomId?: string; furnitureId?: string; storageLocationId?: string; homeId?: string };
  initialName?: string;
  locationLabel?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(action, {});
  const [showPicker, setShowPicker] = useState(!initialLocation?.storageLocationId);
  const [location, setLocation] = useState(
    initialLocation?.storageLocationId && initialLocation.roomId && initialLocation.furnitureId
      ? {
          roomId: initialLocation.roomId,
          furnitureId: initialLocation.furnitureId,
          storageLocationId: initialLocation.storageLocationId,
        }
      : null
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="roomId" value={location?.roomId ?? initialLocation?.roomId ?? ""} />
      <input type="hidden" name="furnitureId" value={location?.furnitureId ?? initialLocation?.furnitureId ?? ""} />
      <input type="hidden" name="storageLocationId" value={location?.storageLocationId ?? ""} />

      <div className="space-y-1.5">
        <Label>Storage Location</Label>
        {!showPicker && locationLabel ? (
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span>{locationLabel}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPicker(true)}>
              <Pencil className="size-3.5" />
              Change
            </Button>
          </div>
        ) : (
          <LocationPicker
            initialHomeId={initialLocation?.homeId}
            initialRoomId={initialLocation?.roomId}
            initialFurnitureId={initialLocation?.furnitureId}
            initialStorageLocationId={initialLocation?.storageLocationId}
            onChange={setLocation}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" name="name" defaultValue={initialName} placeholder="Passport" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select name="category" defaultValue="other">
            <SelectTrigger className="w-full">
              <SelectValue>{(v) => categoryLabel(v)}</SelectValue>
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
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
        </div>
      </div>

      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
