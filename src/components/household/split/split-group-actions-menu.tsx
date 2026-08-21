"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";
import { deleteSplitGroup } from "@/lib/actions/split";

/** Invite/delete for the group currently open in the Split Detail card — the same actions the old per-group grid cards carried, moved here now that the wallet stack itself is just cards + a flat list. */
export function SplitGroupActionsMenu({
  householdId,
  groupId,
  groupName,
  canInvite,
  canDelete,
}: {
  householdId: string;
  groupId: string;
  groupName: string;
  canInvite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  if (!canInvite && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="ghost" aria-label="Group actions">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {canInvite && (
            <DropdownMenuItem onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Invite
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete group
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canInvite && (
        <InviteMemberDialog householdId={householdId} canInvite={canInvite} groupId={groupId} lockToSplitOnly hideTrigger open={inviteOpen} onOpenChange={setInviteOpen} />
      )}

      {canDelete && (
        <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteError(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{groupName}&rdquo;?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This permanently deletes this group along with its expenses and settlement history. This can&apos;t be undone.
            </p>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={() =>
                  startDeleteTransition(async () => {
                    const result = await deleteSplitGroup(groupId);
                    if ("error" in result) {
                      setDeleteError(result.error);
                      return;
                    }
                    setDeleteOpen(false);
                    router.push(`/split?id=${householdId}`);
                  })
                }
              >
                <Trash2 className="size-4" />
                Delete Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
