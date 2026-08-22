"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpense, createExpenseCategory, type ExpenseCategoryOption } from "@/lib/actions/expenses";
import type { HouseholdGoalSummary } from "@/lib/actions/household-goals";

const CATEGORY_ICON_PRESETS = ["🧾", "🏠", "🛒", "💡", "🛍️", "🎉", "👤", "🚗", "🍽️", "📱"];
const EXPENSE_AMOUNT_PRESETS = [300, 700, 1500, 3000];

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/**
 * + Add Expense — name/amount/category (with an inline "create new" chip
 * instead of a second dialog), an optional linked spending-budget goal, date
 * (defaults to today), and an optional receipt photo. Every field past
 * name+amount+category is optional, per spec §6 ("never forced into a
 * complicated flow").
 */
export function AddExpenseDialog({
  householdId,
  categories,
  spendingGoals,
  iconOnly = false,
  defaultGoalId,
  trigger,
}: {
  householdId: string;
  categories: ExpenseCategoryOption[];
  spendingGoals: HouseholdGoalSummary[];
  iconOnly?: boolean;
  defaultGoalId?: string;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [goalId, setGoalId] = useState<string>(defaultGoalId ?? "none");
  const [expenseDate, setExpenseDate] = useState(todayLocalDate());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICON_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [creatingCategory, startCategoryTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amountNumber = Number(amount);
  const canSubmit = description.trim().length > 0 && Number.isFinite(amountNumber) && amountNumber > 0 && !!categoryId;

  function resetAll() {
    setDescription("");
    setAmount("");
    setCategoryId(localCategories[0]?.id ?? null);
    setGoalId(defaultGoalId ?? "none");
    setExpenseDate(todayLocalDate());
    setReceiptFile(null);
    setReceiptPreview(null);
    setNewCategoryOpen(false);
    setNewCategoryName("");
    setNewCategoryIcon(CATEGORY_ICON_PRESETS[0]);
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
            <Button size="icon-sm" aria-label="Add Expense">
              <Plus className="size-4" />
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="size-4" />
              Add Expense
            </Button>
          ))
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-name">What was it?</Label>
            <Input id="expense-name" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Milk" autoFocus />
          </div>
          <div className="space-y-2 rounded-2xl bg-muted p-4">
            <Label htmlFor="expense-amount" className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Expense amount
            </Label>
            <Input
              id="expense-amount"
              type="text"
              inputMode="numeric"
              value={amount ? `₹${Number(amount).toLocaleString("en-IN")}` : ""}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="₹0"
              className="h-auto border-none bg-transparent p-0 font-heading text-4xl text-foreground shadow-none focus-visible:ring-0"
            />
            <div className="grid grid-cols-4 gap-1.5">
              {EXPENSE_AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={cn(
                    "rounded-full border px-1.5 py-1.5 text-center text-xs font-medium",
                    amountNumber === preset ? "border-secondary bg-secondary text-secondary-foreground" : "border-transparent bg-white"
                  )}
                >
                  ₹{preset.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {localCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                    categoryId === c.id ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <span>{c.icon}</span>
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNewCategoryOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground",
                  newCategoryOpen && "border-primary text-primary"
                )}
              >
                <Plus className="size-3" />
                New
              </button>
            </div>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: newCategoryOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-2.5">
                  <div className="flex flex-wrap gap-1">
                    {CATEGORY_ICON_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategoryIcon(emoji)}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full border text-sm",
                          newCategoryIcon === emoji ? "border-primary bg-primary/10" : "border-transparent bg-background"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={creatingCategory || !newCategoryName.trim()}
                      onClick={() =>
                        startCategoryTransition(async () => {
                          const result = await createExpenseCategory(householdId, newCategoryName, newCategoryIcon);
                          if ("error" in result) {
                            setError(result.error);
                            return;
                          }
                          const created = { id: result.categoryId, name: newCategoryName.trim(), icon: newCategoryIcon, isPreset: false };
                          setLocalCategories((prev) => [...prev, created]);
                          setCategoryId(created.id);
                          setNewCategoryOpen(false);
                          setNewCategoryName("");
                          setError(null);
                        })
                      }
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {spendingGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Budget (optional)</Label>
              <Select value={goalId} onValueChange={(v) => setGoalId(v ?? "none")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => (v === "none" ? "No budget" : (spendingGoals.find((g) => g.goal.id === v)?.goal.name ?? "No budget"))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No budget</SelectItem>
                  {spendingGoals.map((g) => (
                    <SelectItem key={g.goal.id} value={g.goal.id}>
                      {g.goal.icon} {g.goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            {receiptPreview ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded object URL, not an optimizable static asset */}
                <img src={receiptPreview} alt="Receipt preview" className="h-24 w-24 rounded-lg border object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                    setReceiptPreview(null);
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
                Attach a photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setReceiptFile(file);
                setReceiptPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending || !canSubmit}
            onClick={() =>
              startTransition(async () => {
                if (!categoryId) return;
                const result = await createExpense(
                  householdId,
                  {
                    description: description.trim(),
                    amount: amountNumber,
                    categoryId,
                    goalId: goalId === "none" ? null : goalId,
                    expenseDate,
                  },
                  receiptFile
                );
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
            Add Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
