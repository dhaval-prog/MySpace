"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGoal } from "@/lib/actions/household-goals";
import type { HouseholdGoalType } from "@/lib/supabase/types";

const GOAL_ICON_PRESETS = ["🎯", "✈️", "🏠", "📺", "🧊", "🎓", "🚗", "💍"];
const BUDGET_ICON_PRESETS = ["💳", "🏠", "🛒", "🎉", "🛍️", "💡", "🚗", "📅"];

export function CreateGoalDialog({
  householdId,
  iconOnly = false,
  defaultGoalType = "saving",
  triggerLabel,
  trigger,
}: {
  householdId: string;
  iconOnly?: boolean;
  defaultGoalType?: HouseholdGoalType;
  triggerLabel?: string;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [goalType, setGoalType] = useState<HouseholdGoalType>(defaultGoalType);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(defaultGoalType === "spending" ? BUDGET_ICON_PRESETS[0] : GOAL_ICON_PRESETS[0]);
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isSpending = goalType === "spending";
  const iconPresets = isSpending ? BUDGET_ICON_PRESETS : GOAL_ICON_PRESETS;

  const amount = Number(targetAmount);
  const canSubmit = name.trim().length > 0 && Number.isFinite(amount) && amount > 0;

  function resetAll() {
    setGoalType(defaultGoalType);
    setName("");
    setIcon(defaultGoalType === "spending" ? BUDGET_ICON_PRESETS[0] : GOAL_ICON_PRESETS[0]);
    setTargetAmount("");
    setDeadline("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger
        render={
          trigger ??
          (iconOnly ? (
            <Button size="icon-sm" aria-label="New Goal">
              <Plus className="size-4" />
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="size-4" />
              {triggerLabel ?? "New Goal"}
            </Button>
          ))
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSpending ? "Create a spending budget" : "Create a savings goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setGoalType("saving");
                setIcon(GOAL_ICON_PRESETS[0]);
              }}
              className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium", !isSpending ? "border-primary bg-primary/10" : "")}
            >
              Saving Goal
            </button>
            <button
              type="button"
              onClick={() => {
                setGoalType("spending");
                setIcon(BUDGET_ICON_PRESETS[0]);
              }}
              className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium", isSpending ? "border-primary bg-primary/10" : "")}
            >
              Spending Budget
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {iconPresets.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`flex size-9 items-center justify-center rounded-full border text-lg ${icon === emoji ? "border-primary bg-primary/10" : "border-transparent bg-muted"}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-name">{isSpending ? "Budget name" : "Goal name"}</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isSpending ? "e.g. Monthly Household" : "e.g. Family Vacation"}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-target">{isSpending ? "Budget amount (₹)" : "Target amount (₹)"}</Label>
            <Input
              id="goal-target"
              type="number"
              min={1}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="60000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">{isSpending ? "Resets by (optional)" : "Deadline (optional)"}</Label>
            <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !canSubmit}
            onClick={() =>
              startTransition(async () => {
                const result = await createGoal(householdId, {
                  name: name.trim(),
                  icon,
                  targetAmount: amount,
                  deadline: deadline || null,
                  goalType,
                });
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                resetAll();
                router.refresh();
              })
            }
          >
            {isSpending ? "Create Budget" : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
