"use client";

import { useEffect, useState, useTransition } from "react";
import { Crown, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { listHouseholdMembersLite, removeMember, deleteHousehold } from "@/lib/actions/household";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  co_owner: "Co-Owner",
  member: "Member",
  viewer: "Viewer",
  limited_member: "Limited",
  split_only: "Split Only",
};

/**
 * Owner-only household management — the member roster (with a Remove button
 * on everyone but the owner) plus a danger zone to delete the household
 * outright. Always controlled: opened from a household row in
 * HouseholdSwitcher, which also owns closing its own dropdown first.
 */
export function ManageHouseholdDialog({
  householdId,
  householdName,
  open,
  onOpenChange,
  onDeleted,
}: {
  householdId: string;
  householdName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [members, setMembers] = useState<{ userId: string; name: string; role: string }[] | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canDelete = confirmText.trim() === householdName;

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMembers(null);
    setRemoveError(null);
    setConfirmText("");
    setDeleteError(null);
    listHouseholdMembersLite(householdId).then(setMembers);
  }, [open, householdId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage &ldquo;{householdName}&rdquo;</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Members</Label>
          {members === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-sm">
                  <Avatar size="sm">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                  {m.role !== "owner" && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setRemovingId(m.userId);
                        startTransition(async () => {
                          const result = await removeMember(householdId, m.userId);
                          if ("error" in result) {
                            setRemoveError(result.error);
                            setRemovingId(null);
                            return;
                          }
                          setRemoveError(null);
                          setRemovingId(null);
                          setMembers((prev) => prev?.filter((mm) => mm.userId !== m.userId) ?? null);
                        });
                      }}
                    >
                      {pending && removingId === m.userId ? "…" : <X className="size-3.5" />}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {removeError && <p className="text-sm text-destructive">{removeError}</p>}
        </div>

        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <Label className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <Trash2 className="size-3.5" />
            Danger zone
          </Label>
          <p className="text-xs text-muted-foreground">
            Permanently deletes &ldquo;{householdName}&rdquo; for everyone — all members, goals, savings, and Let&apos;s Split groups. This
            can&apos;t be undone.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-household-name" className="sr-only">
              Type {householdName} to confirm
            </Label>
            <Input
              id="confirm-household-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${householdName}" to confirm`}
              autoComplete="off"
              className="bg-background"
            />
          </div>
          {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          <Button
            variant="destructive"
            size="sm"
            disabled={!canDelete || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteHousehold(householdId);
                if ("error" in result) {
                  setDeleteError(result.error);
                  return;
                }
                onOpenChange(false);
                onDeleted();
              })
            }
          >
            <Trash2 className="size-4" />
            Delete Household
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small trigger icon for the owner's row in HouseholdSwitcher. */
export function ManageHouseholdButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      title="Manage household"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn("shrink-0 text-muted-foreground")}
    >
      <Crown className="size-3.5" />
    </Button>
  );
}
