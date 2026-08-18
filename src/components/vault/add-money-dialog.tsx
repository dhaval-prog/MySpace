"use client";

import { useState, useTransition } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMoneyToPiggy } from "@/lib/actions/vault";

export function AddMoneyDialog({ onAdded, trigger }: { onAdded: (balance: number, amount: number) => void; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount("");
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
            <Button size="lg">
              <Coins className="size-4" />
              Add Money
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Money</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Put some money aside.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-money-amount">Amount (₹)</Label>
            <Input
              id="add-money-amount"
              type="number"
              min={1}
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-money-comment">Note (optional)</Label>
            <Input
              id="add-money-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Birthday money"
            />
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
                const result = await addMoneyToPiggy(value, comment.trim() || null);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                reset();
                onAdded(result.balance, value);
              })
            }
          >
            {pending ? "Adding…" : "Add Money"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
