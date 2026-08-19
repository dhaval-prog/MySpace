"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "@/lib/actions/auth";

/** Erases the signed-in user's entire account — every home, item, vault
 * transaction, and any household they own gets cascade-deleted along with
 * the auth login itself (see deleteMyAccount for the on-delete-cascade
 * chain this relies on). Irreversible, so it's gated behind typing DELETE. */
export function DeleteAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canDelete = confirmText.trim() === "DELETE";

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Delete my account
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setConfirmText("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently erases everything — your profile, every home, room, and item, your Personal Piggy, and
            any household you own (including it for every member in it). Your login is deleted too. This can&apos;t be
            undone.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete-account">
              Type <span className="font-semibold text-foreground">DELETE</span> to confirm
            </Label>
            <Input id="confirm-delete-account" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteMyAccount();
                  if ("error" in result) {
                    setError(result.error);
                    return;
                  }
                  router.push("/login");
                })
              }
            >
              <Trash2 className="size-4" />
              {pending ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
