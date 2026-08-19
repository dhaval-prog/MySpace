"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getExpenseDetail, deleteExpense, type ExpenseDetail } from "@/lib/actions/expenses";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fullDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ExpenseDetailDialog({
  expenseId,
  open,
  onOpenChange,
}: {
  expenseId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setConfirmDelete(false);
    setError(null);
    getExpenseDetail(expenseId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [open, expenseId]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.description ?? "Expense"}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !detail ? (
            <p className="text-sm text-muted-foreground">This expense couldn&apos;t be found.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-semibold">{inr(detail.amount)}</p>
                <p className="text-sm text-muted-foreground">
                  {detail.categoryIcon} {detail.categoryName} · {fullDate(detail.expenseDate)}
                </p>
              </div>

              {detail.goalName && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Budget: </span>
                  <span className="font-medium">{detail.goalName}</span>
                </p>
              )}

              <p className="text-xs text-muted-foreground">Added by {detail.createdByName}</p>

              {detail.receiptUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoOpen(true)}
                  className="block transition duration-200 ease-out hover:scale-[1.02]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded Supabase Storage URL, not an optimizable static asset */}
                  <img src={detail.receiptUrl} alt="Receipt" className="h-40 w-40 rounded-lg border object-cover" />
                </button>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              {confirmDelete ? (
                <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm">Delete &ldquo;{detail.description}&rdquo;? This can&apos;t be undone.</p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={pending}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteExpense(expenseId);
                          if ("error" in result) {
                            setError(result.error);
                            return;
                          }
                          onOpenChange(false);
                          router.refresh();
                        })
                      }
                    >
                      Delete Expense
                    </Button>
                  </div>
                </div>
              ) : (
                detail.canDelete && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </DialogFooter>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-2xl p-2">
          {detail?.receiptUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Supabase Storage URL, not an optimizable static asset
            <img src={detail.receiptUrl} alt="Receipt" className="max-h-[80vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
