"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronLeft, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listRooms, listFurniture } from "@/lib/actions/browse";
import { ITEM_CATEGORIES, categoryLabel } from "@/lib/constants";
import type { ItemFormState } from "@/lib/actions/items";

type ItemAction = (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;

interface Option {
  id: string;
  name: string;
}

type Step = 1 | 2 | 3 | 4;
const STEP_TITLE: Record<Step, string> = {
  1: "What are you adding?",
  2: "Where is it?",
  3: "Which place?",
  4: "A few more details",
};

/**
 * Four-step mental model (spec §14): Item → Room → Place → Optional
 * details, one `<form>` the whole way through so the final step's submit
 * button is the only real POST. `homeId` is always known by the time this
 * renders (the caller is always scoped to one home already — see
 * items/new/page.tsx and HomeItemsBrowser), so there's no separate "which
 * home" step. When roomId+furnitureId are already known too (adding from a
 * specific Place's own page), the flow starts straight at step 4 instead —
 * "Change" drops back to step 2 without losing the name already typed.
 */
export function ItemForm({
  action,
  initialLocation,
  initialName,
  submitLabel,
}: {
  action: ItemAction;
  initialLocation?: { roomId?: string; furnitureId?: string; homeId?: string };
  initialName?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(action, {});

  const homeId = initialLocation?.homeId ?? "";
  const locationKnown = !!(initialLocation?.roomId && initialLocation?.furnitureId);
  const [step, setStep] = useState<Step>(locationKnown ? 4 : 1);

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

  const canGoStep2 = name.trim().length > 0;
  const canSubmit = name.trim().length > 0 && !!roomId && !!furnitureId && Number(quantity) >= 1;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="furnitureId" value={furnitureId} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="expiryDate" value={expiryDate} />

      <div className="flex items-center gap-2">
        {step > 1 && !(step === 4 && locationKnown) && (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        <p className="text-sm font-medium text-muted-foreground">{STEP_TITLE[step]}</p>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Passport"
            autoFocus
            className="h-12 text-base"
          />
          <Button type="button" className="w-full" size="lg" disabled={!canGoStep2} onClick={() => setStep(2)}>
            Next
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">This home doesn&apos;t have any rooms yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRoomId(r.id);
                    setFurnitureId("");
                    setStep(3);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                    roomId === r.id ? "border-primary bg-primary/10" : "hover:border-primary/40"
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {furniture.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {roomName ?? "This room"} doesn&apos;t have any places yet — add one from the room page first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {furniture.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFurnitureId(f.id);
                    setStep(4);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                    furnitureId === f.id ? "border-primary bg-primary/10" : "hover:border-primary/40"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="truncate">
              {name} · {roomName ?? "…"} → {furnitureName ?? "…"}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)}>
              Change
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Photo (optional)</Label>
            {photoPreview ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable static asset */}
                <img src={photoPreview} alt="" className="h-24 w-24 rounded-lg border object-cover" />
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
                className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Expiry (optional)</Label>
              <Input id="expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category (optional)</Label>
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything worth remembering" />
          </div>

          {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={pending || !canSubmit}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
