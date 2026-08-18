"use client";

import { useState, useTransition } from "react";
import { Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { takeMoneyOutOfPiggy } from "@/lib/actions/vault";
import { VAULT_CATEGORIES } from "@/lib/voice/types";

/** Split from the panel — see AddMoneyButton for why. */
export function TakeMoneyButton({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Button size="lg" variant="outline" aria-expanded={open} onClick={() => onOpenChange(!open)}>
      <Wallet className="size-4" />
      Take Money Out
    </Button>
  );
}

/**
 * Expands inline below the Add Money / Take Money Out buttons instead of
 * opening a modal — see AddMoneyPanel for the shared rationale.
 * `open`/`onOpenChange` are controlled by the parent so only one of
 * Add/Take can be expanded at a time.
 */
export function TakeMoneyPanel({
  balance,
  onTaken,
  open,
  onOpenChange,
}: {
  balance: number;
  onTaken: (balance: number, amount: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount("");
    setCategory("Other");
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
              <p className="font-heading text-base text-foreground">Take Money Out</p>
              <p className="text-sm text-muted-foreground">Your Piggy currently has ₹{Math.round(balance).toLocaleString("en-IN")}.</p>
            </div>
            <Button size="icon-sm" variant="ghost" className="shrink-0" onClick={close}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="take-money-amount">Amount (₹)</Label>
            <Input
              id="take-money-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "Other")}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>{(v: string) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VAULT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="take-money-comment">Note (optional)</Label>
            <Input
              id="take-money-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Weekend groceries"
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
                  if (value > balance) {
                    setError(`Your Piggy only has ₹${Math.round(balance).toLocaleString("en-IN")} saved right now.`);
                    return;
                  }
                  const result = await takeMoneyOutOfPiggy(value, category, comment.trim() || null);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  close();
                  onTaken(result.balance, value);
                })
              }
            >
              {pending ? "Taking out…" : "Take Money Out"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
