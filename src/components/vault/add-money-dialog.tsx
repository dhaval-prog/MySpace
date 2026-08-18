"use client";

import { useState, useTransition } from "react";
import { Coins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMoneyToPiggy } from "@/lib/actions/vault";

/**
 * Split from the panel so the trigger can sit side by side with
 * TakeMoneyButton in a plain flex row — a combined button+panel fragment
 * would force a flex-wrap line break between them even while the panel is
 * collapsed to zero height (its own w-full basis-full alone is enough to
 * push a wrap).
 */
export function AddMoneyButton({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Button size="lg" aria-expanded={open} onClick={() => onOpenChange(!open)}>
      <Coins className="size-4" />
      Add Money
    </Button>
  );
}

/**
 * Expands inline below the Add Money / Take Money Out buttons instead of
 * opening a modal — the Piggy Balance card (and the carousel it sits in,
 * via its ResizeObserver) grows to fit it. `open`/`onOpenChange` are
 * controlled by the parent so only one of Add/Take can be expanded at a
 * time.
 */
export function AddMoneyPanel({
  onAdded,
  open,
  onOpenChange,
}: {
  onAdded: (balance: number, amount: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount("");
    setComment("");
    setError(null);
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div className="mt-4 space-y-4 rounded-2xl border bg-muted/30 p-4 text-left">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-base text-foreground">Add Money</p>
              <p className="text-sm text-muted-foreground">Put some money aside.</p>
            </div>
            <Button size="icon-sm" variant="ghost" className="shrink-0" onClick={close}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-money-amount">Amount (₹)</Label>
            <Input
              id="add-money-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-money-comment">Note (optional)</Label>
            <Input
              id="add-money-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Birthday money"
              className="bg-background"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={pending || !amount.trim()}
              onClick={() =>
                startTransition(async () => {
                  const value = Number(amount);
                  if (!Number.isFinite(value) || value <= 0) {
                    setError("Enter a valid amount.");
                    return;
                  }
                  const result = await addMoneyToPiggy(value, comment.trim() || null);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  close();
                  onAdded(result.balance, value);
                })
              }
            >
              {pending ? "Adding…" : "Add Money"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
