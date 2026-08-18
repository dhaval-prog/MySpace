"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHousehold, joinHousehold } from "@/lib/actions/household";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";

/**
 * The "..." beside the Goals heading — Invite / Create Your Own / Join with
 * a code, nothing else. Household switching itself now lives entirely in
 * HouseholdCardRow's card row below the heading, so this menu no longer
 * carries a household list the way HouseholdSwitcher's dropdown used to.
 */
export function GoalsOptionsMenu({
  currentId,
  basePath = "/goals",
  canInvite = false,
}: {
  currentId: string;
  basePath?: string;
  canInvite?: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon" variant="ghost" aria-label="Goals options" className="size-8 shrink-0 text-muted-foreground">
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-52 p-1.5">
          {canInvite && (
            <DropdownMenuItem className="gap-3 rounded-lg px-2 py-2" onClick={() => setInviteOpen(true)}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserPlus className="size-4" />
              </span>
              Invite
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-3 rounded-lg px-2 py-2" onClick={() => setCreateOpen(true)}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-4" />
            </span>
            Create Your Own
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 rounded-lg px-2 py-2" onClick={() => setJoinOpen(true)}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-4" />
            </span>
            Join with a code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateHouseholdDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => router.push(`${basePath}?id=${id}`)} />
      <JoinHouseholdDialog open={joinOpen} onOpenChange={setJoinOpen} onJoined={(id) => router.push(`${basePath}?id=${id}`)} />
      {canInvite && <InviteMemberDialog householdId={currentId} canInvite={canInvite} hideTrigger open={inviteOpen} onOpenChange={setInviteOpen} />}
    </>
  );
}

function CreateHouseholdDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (householdId: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a household</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="goals-household-name">Household name</Label>
          <Input id="goals-household-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Our Home" autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !name.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await createHousehold(name.trim());
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                setName("");
                setError(null);
                onOpenChange(false);
                onCreated(result.householdId);
              })
            }
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JoinHouseholdDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (householdId: string) => void;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a household</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="goals-invite-token">Invite code</Label>
          <Input
            id="goals-invite-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the code someone shared with you"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !token.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await joinHousehold(token.trim());
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                setToken("");
                setError(null);
                onOpenChange(false);
                onJoined(result.householdId);
              })
            }
          >
            Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
