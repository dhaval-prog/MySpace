"use client";

import { useState, useTransition } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { takeMoneyOutOfPiggy } from "@/lib/actions/vault";
import { VAULT_CATEGORIES } from "@/lib/voice/types";

export function TakeMoneyDialog({
  balance,
  onTaken,
  trigger,
}: {
  balance: number;
  onTaken: (balance: number, amount: number) => void;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="lg" variant="outline">
              <Wallet className="size-4" />
              Take Money Out
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take Money Out</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Taking some money out? Your Piggy currently has ₹{Math.round(balance).toLocaleString("en-IN")}.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="take-money-amount">Amount (₹)</Label>
            <Input
              id="take-money-amount"
              type="number"
              min={1}
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "Other")}>
              <SelectTrigger className="w-full">
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
            <Input id="take-money-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Weekend groceries" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
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
                setOpen(false);
                reset();
                onTaken(result.balance, value);
              })
            }
          >
            {pending ? "Taking out…" : "Take Money Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
