"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Fuel, Heart, Gift, Home, ShoppingCart, UtensilsCrossed, ShoppingBag, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGoal } from "@/lib/actions/household-goals";
import type { HouseholdGoalType } from "@/lib/supabase/types";

const GOAL_ICON_PRESETS = ["🎯", "✈️", "🏠", "📺", "🧊", "🎓", "🚗", "💍"];
// `icon` is the emoji actually stored on the goal (and rendered everywhere
// else it shows up — the budget cards, the detail header); `Icon` is only
// for this picker's own buttons, which use outline icons instead of emoji.
const BUDGET_NAME_PRESETS = [
  { name: "Fuel", icon: "⛽", Icon: Fuel },
  { name: "Health", icon: "❤️", Icon: Heart },
  { name: "Gift", icon: "🎁", Icon: Gift },
  { name: "Home", icon: "🏠", Icon: Home },
  { name: "Groceries", icon: "🛒", Icon: ShoppingCart },
  { name: "Eating Out", icon: "🍽️", Icon: UtensilsCrossed },
  { name: "Shopping", icon: "🛍️", Icon: ShoppingBag },
  { name: "Travel", icon: "✈️", Icon: Plane },
];
const RESET_DAY_PRESETS = [1, 5, 15, 25];
const AMOUNT_PRESETS = [5000, 10000, 15000, 25000];

/** The next time this day-of-month comes around — today counts as "already happened", so picking the current day rolls to next month rather than backdating to a date that's already passed. */
function nextResetDate(dayOfMonth: number): string {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toISOString().slice(0, 10);
}

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
  const [icon, setIcon] = useState(defaultGoalType === "spending" ? BUDGET_NAME_PRESETS[0].icon : GOAL_ICON_PRESETS[0]);
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isSpending = goalType === "spending";

  const amount = Number(targetAmount);
  const canSubmit = name.trim().length > 0 && Number.isFinite(amount) && amount > 0;

  function resetAll() {
    setGoalType(defaultGoalType);
    setName("");
    setIcon(defaultGoalType === "spending" ? BUDGET_NAME_PRESETS[0].icon : GOAL_ICON_PRESETS[0]);
    setTargetAmount("");
    setDeadline("");
    setShowCustomDate(false);
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
          {defaultGoalType !== "spending" && (
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
                  setIcon(BUDGET_NAME_PRESETS[0].icon);
                }}
                className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium", isSpending ? "border-primary bg-primary/10" : "")}
              >
                Spending Budget
              </button>
            </div>
          )}

          {isSpending ? (
            <>
              <p className="-mt-1 text-xs text-muted-foreground">Name it, set the amount, pick the day it resets.</p>

              <div className="space-y-2">
                <Label className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Name</Label>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_NAME_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setName(preset.name);
                        setIcon(preset.icon);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                        name === preset.name && icon === preset.icon
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : "border-transparent bg-muted"
                      )}
                    >
                      <preset.Icon className="size-4" />
                      {preset.name}
                    </button>
                  ))}
                </div>
                <Input
                  id="goal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Or type a custom name"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Resets on</Label>
                <div className="flex flex-wrap gap-1.5">
                  {RESET_DAY_PRESETS.map((day) => {
                    const candidate = nextResetDate(day);
                    const active = !showCustomDate && deadline === candidate;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setDeadline(candidate);
                          setShowCustomDate(false);
                        }}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                          active ? "border-secondary bg-secondary text-secondary-foreground" : "border-transparent bg-muted"
                        )}
                      >
                        {day}
                        {day === 1 ? "st" : day === 5 ? "th" : day === 15 ? "th" : "th"}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowCustomDate(true)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                      showCustomDate ? "border-secondary bg-secondary text-secondary-foreground" : "border-transparent bg-muted"
                    )}
                  >
                    Custom
                  </button>
                </div>
                {showCustomDate && (
                  <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1.5" />
                )}
              </div>

              <div className="space-y-2 rounded-2xl bg-muted p-4">
                <Label htmlFor="goal-target" className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Budget amount
                </Label>
                <Input
                  id="goal-target"
                  type="text"
                  inputMode="numeric"
                  value={targetAmount ? `₹${Number(targetAmount).toLocaleString("en-IN")}` : ""}
                  onChange={(e) => setTargetAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="₹0"
                  className="h-auto border-none bg-transparent p-0 font-heading text-4xl text-foreground shadow-none focus-visible:ring-0"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetAmount(String(preset))}
                      className={cn(
                        "rounded-full border px-1.5 py-1.5 text-center text-xs font-medium",
                        amount === preset ? "border-secondary bg-secondary text-secondary-foreground" : "border-transparent bg-white"
                      )}
                    >
                      ₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_ICON_PRESETS.map((emoji) => (
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
                <Label htmlFor="goal-name">Goal name</Label>
                <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Vacation" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target amount (₹)</Label>
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
                <Label htmlFor="goal-deadline">Deadline (optional)</Label>
                <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          {defaultGoalType !== "spending" && (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
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
