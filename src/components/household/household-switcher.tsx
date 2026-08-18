"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHousehold, joinHousehold } from "@/lib/actions/household";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";
import { ManageHouseholdDialog, ManageHouseholdButton } from "@/components/household/manage-household-dialog";
import { LeaveHouseholdDialog, LeaveHouseholdButton } from "@/components/household/leave-household-dialog";
import type { HouseholdListEntry } from "@/lib/actions/household";

export function HouseholdSwitcher({
  households,
  currentId,
  basePath = "/goals",
  canInvite = false,
}: {
  households: HouseholdListEntry[];
  currentId: string;
  basePath?: string;
  /** Shows an "Invite" item above "Create Your Own" for the current household — hidden entirely (not just disabled) when the caller can't invite, since a split_only viewer of this menu has nothing to do with it. */
  canInvite?: boolean;
}) {
  const router = useRouter();
  const current = households.find((h) => h.household.id === currentId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<{ id: string; name: string } | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" className="gap-1.5 rounded-full bg-white">
              🏠 {current?.household.name ?? "Our Home"}
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-72 p-1.5">
          {/* Menu.GroupLabel (DropdownMenuLabel) requires a Menu.Group ancestor to register its
              label id — used bare, Base UI throws error #31 the instant the menu opens. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 pt-1 pb-1.5">Your households</DropdownMenuLabel>
            {households.map((h) => {
              const active = h.household.id === currentId;
              const isOwner = h.role === "owner";
              return (
                <DropdownMenuItem
                  key={h.household.id}
                  closeOnClick={false}
                  className={cn("gap-3 rounded-lg px-2 py-2", active && "bg-primary/10")}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`${basePath}?id=${h.household.id}`);
                  }}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">🏠</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", active ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                      {h.household.name}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                    {h.role}
                  </span>
                  {active && <Check className="size-4 shrink-0 text-primary" />}
                  {isOwner ? (
                    <ManageHouseholdButton
                      onClick={() => {
                        setMenuOpen(false);
                        setManageTarget({ id: h.household.id, name: h.household.name });
                      }}
                    />
                  ) : (
                    <LeaveHouseholdButton
                      onClick={() => {
                        setMenuOpen(false);
                        setLeaveTarget({ id: h.household.id, name: h.household.name });
                      }}
                    />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
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

      {manageTarget && (
        <ManageHouseholdDialog
          householdId={manageTarget.id}
          householdName={manageTarget.name}
          open={!!manageTarget}
          onOpenChange={(v) => {
            if (!v) setManageTarget(null);
          }}
          onDeleted={() => router.push(basePath)}
        />
      )}
      {leaveTarget && (
        <LeaveHouseholdDialog
          householdId={leaveTarget.id}
          householdName={leaveTarget.name}
          open={!!leaveTarget}
          onOpenChange={(v) => {
            if (!v) setLeaveTarget(null);
          }}
          onLeft={() => router.push(basePath)}
        />
      )}
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
          <Label htmlFor="household-name">Household name</Label>
          <Input id="household-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Our Home" autoFocus />
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
          <Label htmlFor="invite-token">Invite code</Label>
          <Input
            id="invite-token"
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
