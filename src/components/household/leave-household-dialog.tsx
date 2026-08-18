"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { leaveHousehold } from "@/lib/actions/household";

/** A member (never the owner) leaving a household they belong to. Always controlled — opened from a row in HouseholdSwitcher. */
export function LeaveHouseholdDialog({
  householdId,
  householdName,
  open,
  onOpenChange,
  onLeft,
}: {
  householdId: string;
  householdName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave &ldquo;{householdName}&rdquo;?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You&apos;ll lose access to its shared savings, goals, and Let&apos;s Split groups. Someone with access can invite you back later.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await leaveHousehold(householdId);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                onOpenChange(false);
                onLeft();
              })
            }
          >
            <LogOut className="size-4" />
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small trigger icon for a non-owner's row in HouseholdSwitcher. */
export function LeaveHouseholdButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      title="Leave household"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="shrink-0 text-muted-foreground"
    >
      <LogOut className="size-3.5" />
    </Button>
  );
}
