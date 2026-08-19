"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { cn, initials, memberAccentClass } from "@/lib/utils";
import {
  getGoalDetail,
  contributeToGoal,
  deleteGoal,
  type HouseholdGoalSummary,
  type HouseholdGoalDetail,
} from "@/lib/actions/household-goals";
import {
  listGoalMembers,
  listEligibleGoalMembers,
  addGoalMember,
  removeGoalMember,
  type GoalMemberInfo,
} from "@/lib/actions/household-goal-members";
import { MemberManagerDialog } from "@/components/household/member-manager-dialog";
import { listGoalMessages, type GoalChatMessageWithSender } from "@/lib/actions/household-goal-chat";
import { GoalChatPanel } from "@/components/household/goal-chat-panel";
import type { HouseholdVaultTransactionSource } from "@/lib/supabase/types";

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * A goal's progress card — clicking it expands a panel directly below with
 * the full contributor breakdown and a Contribute form, mirroring spec
 * §8/§9 exactly (amount + source, then per-contributor amount +
 * percentage). Inline rather than a modal so it reads as part of the card
 * itself, matching the same grid-template-rows expand used elsewhere
 * (Regular Savings' Add Money panel, My Home's sticky filters). `canDelete`
 * is computed by the server (household owner or the goal's creator) — the
 * icon below only hides itself for everyone else, the real gate lives in
 * delete_household_goal(). The Saved/Target progress block has its own
 * click target, independent of that: clicking it 3D-flips just that block
 * to a quick Contribute form (stopPropagation keeps it from also toggling
 * the panel below) — a shortcut to the same contributeToGoal() the panel's
 * own Contribute form (under the Members tab) uses.
 */
export function GoalCard({
  summary,
  canDelete,
  currentUserId,
}: {
  summary: HouseholdGoalSummary;
  canDelete: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [view, setView] = useState<"members" | "chat">("members");
  const [detail, setDetail] = useState<HouseholdGoalDetail | null>(null);
  const [members, setMembers] = useState<GoalMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<GoalChatMessageWithSender[] | null>(null);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<HouseholdVaultTransactionSource>("personal_vault");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  const { goal, currentAmount, progressPct, members: cardMembers } = summary;
  // canDelete is computed server-side as owner-or-creator — the same gate as
  // can_manage_goal() in supabase/schema.sql, so it doubles as "can manage
  // this goal's member list" without a second server round-trip.
  const canManageMembers = canDelete;

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setView("members");
    Promise.all([getGoalDetail(goal.id), listGoalMembers(goal.id)]).then(([d, m]) => {
      setDetail(d);
      setMembers(m);
      setLoading(false);
    });
  }, [open, goal.id]);

  useEffect(() => {
    if (view !== "chat") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatMessages(null);
    listGoalMessages(goal.id).then(setChatMessages);
  }, [view, goal.id]);

  const contributeAmount = Number(amount);
  const canContribute = Number.isFinite(contributeAmount) && contributeAmount > 0;
  const remaining = Math.max(goal.target_amount - currentAmount, 0);

  // Every goal member shown, even ones with $0 contributed yet — amount/
  // percentage come from getGoalDetail's live contributor breakdown when
  // available, falling back to zero while that's still loading.
  const contributorByUserId = new Map((detail?.contributors ?? []).map((c) => [c.userId, c]));
  const memberRows = members.map((m) => {
    const contributor = contributorByUserId.get(m.userId);
    const amountPaid = contributor?.amount ?? 0;
    return {
      ...m,
      amountPaid,
      pctOfGoal: goal.target_amount > 0 ? Math.min(100, Math.round((amountPaid / goal.target_amount) * 100)) : 0,
    };
  });

  return (
    <div className="relative self-start">
      {/* Not a real <button> — the Contribute face below needs to nest an
          actual Input/Button, which isn't valid inside a <button>. role="button"
          + the click/keydown handlers keep the same toggle-the-panel-below
          behavior and keyboard accessibility. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="w-full cursor-pointer rounded-2xl border bg-card p-5 text-left transition-all duration-200 ease-out hover:z-10 hover:scale-[1.02] hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-xl">{goal.icon}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{goal.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Created by {summary.creatorName}</p>
          </div>
        </div>

        {/* Flip card: front face is the Saved/Target progress summary,
            back face is a quick Contribute form — clicking either face
            flips it in place, independent of the toggle-the-panel-below
            click on the rest of this card (stopPropagation on both faces). */}
        <div className="relative mt-5 [perspective:1200px]">
          <div
            className="grid transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none motion-reduce:duration-0"
            style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setFlipped(true);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                setFlipped(true);
              }}
              className="col-start-1 row-start-1 cursor-pointer rounded-2xl border bg-muted/30 p-4 [backface-visibility:hidden]"
            >
              <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                <span>Saved</span>
                <span>Target</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-foreground">{inr(currentAmount)}</span>
                <span className="text-2xl font-semibold text-muted-foreground">{inr(goal.target_amount)}</span>
              </div>
              <Progress value={progressPct} max={100} className="mt-3" />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{inr(remaining)} remaining</span>
                <span>{progressPct}% complete</span>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setFlipped(false);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                setFlipped(false);
              }}
              className="col-start-1 row-start-1 cursor-pointer space-y-3 rounded-2xl border bg-background p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Contribute</p>
                <span className="text-xs text-muted-foreground">Back</span>
              </div>
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Label htmlFor={`contribute-amount-flip-${goal.id}`}>Amount (₹)</Label>
                <Input
                  id={`contribute-amount-flip-${goal.id}`}
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2000"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSource("personal_vault");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${source === "personal_vault" ? "border-primary bg-primary/10" : ""}`}
                >
                  My Personal Piggy
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSource("external");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${source === "external" ? "border-primary bg-primary/10" : ""}`}
                >
                  External / Manual
                </button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={pending || !canContribute}
                onClick={(e) => {
                  e.stopPropagation();
                  startTransition(async () => {
                    const result = await contributeToGoal(goal.id, contributeAmount, source);
                    if ("error" in result) {
                      setError(result.error);
                      return;
                    }
                    setAmount("");
                    setError(null);
                    const refreshed = await getGoalDetail(goal.id);
                    setDetail(refreshed);
                    router.refresh();
                    setFlipped(false);
                  });
                }}
              >
                Contribute {amount ? inr(contributeAmount) : ""}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3.5">
          {cardMembers.length > 0 ? (
            <AvatarGroup>
              {cardMembers.slice(0, 3).map((m, i) => (
                <Avatar key={m.userId} size="sm">
                  <AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback>
                </Avatar>
              ))}
              {cardMembers.length > 3 && (
                <AvatarGroupCount className="size-6 text-xs">+{cardMembers.length - 3}</AvatarGroupCount>
              )}
            </AvatarGroup>
          ) : (
            <span />
          )}
          {goal.deadline && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {monthYear(goal.deadline)}
            </span>
          )}
        </div>
      </div>

      {canDelete && (
        <button
          type="button"
          title={`Delete "${goal.name}"`}
          onClick={(e) => {
            e.stopPropagation();
            setDeleteError(null);
            setDeleteOpen(true);
          }}
          className="absolute -top-2 -right-2 z-20 flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:border-destructive/40 hover:text-destructive"
        >
          <X className="size-3.5" />
          <span className="sr-only">Delete &ldquo;{goal.name}&rdquo; goal</span>
        </button>
      )}

      {/* Expands directly below the card instead of opening a modal — the
          grid-template-rows 0fr/1fr trick used for other inline panels in
          the app (no JS height measurement needed to animate it). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-5 rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              {canManageMembers ? (
                <MemberManagerDialog
                  title={`Members of "${goal.name}"`}
                  members={members}
                  fetchEligible={() => listEligibleGoalMembers(goal.id, goal.household_id)}
                  onAdd={(userId) => addGoalMember(goal.id, userId)}
                  onRemove={(userId) => removeGoalMember(goal.id, userId)}
                  householdId={goal.household_id}
                  currentUserId={currentUserId}
                />
              ) : (
                <span />
              )}
              <Button size="icon-sm" variant="ghost" className="shrink-0" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="relative flex items-center rounded-full bg-muted p-1">
              <div
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-card shadow-sm ring-1 ring-foreground/10 transition-transform duration-300 ease-out"
                style={{ transform: view === "chat" ? "translateX(100%)" : "translateX(0)" }}
              />
              <button
                type="button"
                onClick={() => setView("members")}
                className={cn(
                  "relative z-10 flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  view === "members" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Members
              </button>
              <button
                type="button"
                onClick={() => setView("chat")}
                className={cn(
                  "relative z-10 flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  view === "chat" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Chat
              </button>
            </div>

            {view === "members" ? (
              <div className="space-y-5">
                <div>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : memberRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {memberRows.map((m, i) => (
                        <li key={m.userId}>
                          <div className="flex items-center gap-2.5 text-sm">
                            <Avatar size="sm">
                              <AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {m.name}
                              {m.isCreator && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(creator)</span>}
                            </span>
                            <span className="font-medium">{inr(m.amountPaid)}</span>
                          </div>
                          <Progress value={m.pctOfGoal} max={100} className="mt-2 h-1.5" />
                          <p className="mt-1 text-right text-xs text-muted-foreground">{m.pctOfGoal}% of goal</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="-mx-4 -mb-4 flex h-[380px] flex-col border-t">
                {chatMessages ? (
                  <GoalChatPanel goalId={goal.id} currentUserId={currentUserId} initialMessages={chatMessages} />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">Loading…</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{goal.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the goal along with its contribution progress and history. This can&apos;t be undone.
          </p>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                startDeleteTransition(async () => {
                  const result = await deleteGoal(goal.id);
                  if ("error" in result) {
                    setDeleteError(result.error);
                    return;
                  }
                  setDeleteOpen(false);
                  router.refresh();
                })
              }
            >
              Delete Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
