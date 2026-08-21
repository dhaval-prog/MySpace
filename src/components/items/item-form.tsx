"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listRooms, listFurniture } from "@/lib/actions/browse";
import { getIcon } from "@/lib/icon-map";
import { ITEM_CATEGORIES, categoryIcon, categoryLabel } from "@/lib/constants";
import type { ItemFormState } from "@/lib/actions/items";

type ItemAction = (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;

interface Option {
  id: string;
  name: string;
}

/**
 * One page, every field visible at once — Room and Place are pill-pickers
 * inline rather than separate wizard steps, so nothing blocks the user from
 * reaching the submit button just because they haven't answered questions
 * in a fixed order yet (the old 4-step flow's actual failure mode: no
 * homeId in scope meant step 2 could never even load the room list).
 * `variant="desktop"` additionally renders a live preview card next to the
 * form; `variant="mobile"` (the default rendering, chosen by the caller)
 * renders the form alone.
 */
export function ItemForm({
  action,
  initialLocation,
  initialName,
  submitLabel,
  variant = "desktop",
}: {
  action: ItemAction;
  initialLocation?: { roomId?: string; furnitureId?: string; homeId?: string };
  initialName?: string;
  submitLabel: string;
  variant?: "mobile" | "desktop";
}) {
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(action, {});

  const homeId = initialLocation?.homeId ?? "";
  const [name, setName] = useState(initialName ?? "");
  const [roomId, setRoomId] = useState(initialLocation?.roomId ?? "");
  const [furnitureId, setFurnitureId] = useState(initialLocation?.furnitureId ?? "");
  const [rooms, setRooms] = useState<Option[]>([]);
  const [furniture, setFurniture] = useState<Option[]>([]);

  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!homeId) return;
    listRooms(homeId).then(setRooms);
  }, [homeId]);

  useEffect(() => {
    if (!roomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFurniture([]);
      return;
    }
    listFurniture(roomId).then(setFurniture);
  }, [roomId]);

  const roomName = rooms.find((r) => r.id === roomId)?.name;
  const furnitureName = furniture.find((f) => f.id === furnitureId)?.name;
  const canSubmit = name.trim().length > 0 && !!roomId && !!furnitureId && Number(quantity) >= 1;
  const CategoryIcon = getIcon(categoryIcon(category));

  const form = (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="furnitureId" value={furnitureId} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="expiryDate" value={expiryDate} />

      <div>
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">What it is</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Item name</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Passport" autoFocus className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "other")}>
              <SelectTrigger className="h-11 w-full">
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
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiry">Expiry (optional)</Label>
            <Input id="expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-11" />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything worth remembering" />
        </div>

        <div className="mt-3 space-y-1.5">
          <Label>Photo (optional)</Label>
          {photoPreview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable static asset */}
              <img src={photoPreview} alt="" className="h-24 w-24 rounded-2xl border object-cover" />
              <button
                type="button"
                onClick={() => {
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
              className="flex items-center gap-2 rounded-2xl border border-dashed px-3 py-2.5 text-xs font-medium text-muted-foreground"
            >
              <Camera className="size-4" />
              Add a photo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPhotoPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </div>
      </div>

      <div>
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Where it lives</p>

        <div className="mt-2 space-y-1.5">
          <Label>Room</Label>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">This home doesn&apos;t have any rooms yet — add one from My Home first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRoomId(r.id);
                    setFurnitureId("");
                  }}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    roomId === r.id ? "border-secondary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted"
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {roomId && (
          <div className="mt-3 space-y-1.5">
            <Label>Place in {roomName ?? "this room"}</Label>
            {furniture.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {roomName ?? "This room"} doesn&apos;t have any places yet — add one from the room page first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {furniture.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFurnitureId(f.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      furnitureId === f.id ? "border-secondary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted"
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={pending || !canSubmit}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );

  if (variant !== "desktop") return form;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
      <div className="space-y-3">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Preview</p>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable static asset
              <img src={photoPreview} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <CategoryIcon className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg text-foreground">{name || "Item name"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {roomName && furnitureName ? `${roomName} → ${furnitureName}` : "Pick a room and place"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Qty {quantity || 1}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{categoryLabel(category)}</span>
          </div>
        </Card>
      </div>
      <div>{form}</div>
    </div>
  );
}
