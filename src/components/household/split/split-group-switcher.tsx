"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, Mail, MessageSquare, Crown, Trash2 } from "lucide-react";
import { cn, initials, memberAccentClass } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { SwipeCarousel } from "@/components/shared/swipe-carousel";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";
import { useHouseholdPresence } from "@/lib/hooks/use-presence";
import { createSplitGroup, createExpense, deleteSplitGroup, type SplitGroupSummary } from "@/lib/actions/split";
import { generateInvite } from "@/lib/actions/household";
import { sendInviteSms } from "@/lib/actions/sms";
import type { HouseholdRole, SplitShareType } from "@/lib/supabase/types";

const ICON_OPTIONS = ["🤝", "🏠", "✈️", "🎉", "🍽️", "🚗", "🏕️", "🎓"];
const SPLIT_METHODS: { value: SplitShareType; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact Amount" },
  { value: "shares", label: "Shares" },
];

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Every split group the caller belongs to, as swipeable full group cards
 * (icon, creator, name, Invite, member avatars, Total Spent, delete) —
 * replaces the earlier segmented-pill toggle. Swiping calls router.push to
 * switch ?group=, the same way clicking a pill used to, so the
 * Expenses/Balances/Chat content below (server-rendered per active group)
 * re-fetches for whichever group the swipe lands on.
 */
export function SplitGroupSwitcher({
  householdId,
  groups,
  currentGroupId,
  currentUserId,
  myRole,
}: {
  householdId: string;
  groups: SplitGroupSummary[];
  currentGroupId: string;
  currentUserId: string;
  myRole: HouseholdRole;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SplitGroupSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const onlineUserIds = useHouseholdPresence(householdId, currentUserId);

  const activeIndex = Math.max(
    0,
    groups.findIndex((g) => g.id === currentGroupId)
  );

  return (
    <>
      <SwipeCarousel
        activeIndex={activeIndex}
        onActiveIndexChange={(i) => {
          const g = groups[i];
          if (g) router.push(`/split?id=${householdId}&group=${g.id}`);
        }}
        slides={groups.map((g) => {
          const canInvite = myRole === "owner" || myRole === "co_owner" || g.createdBy === currentUserId;
          const canDelete = groups.length > 1 && (myRole === "owner" || g.createdBy === currentUserId);
          return (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3.5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-xl">{g.icon}</span>
                <div>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {g.createdByName}
                    <Crown className="size-3.5 text-amber-500" />
                  </span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{g.name}</p>
                    <InviteMemberDialog householdId={householdId} canInvite={canInvite} groupId={g.id} lockToSplitOnly />
                  </div>
                  <AvatarGroup className="mt-1.5">
                    {g.memberPreview.map((m, i) => (
                      <Avatar key={m.userId} size="sm">
                        <AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback>
                        {onlineUserIds.has(m.userId) && <AvatarBadge className="bg-emerald-500" title="Active now" />}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                </div>
              </div>
              <div className="text-right">
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(g)}
                    title="Delete group"
                    className="mb-1 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">Total Spent</p>
                <p className="mt-0.5 text-2xl font-semibold">{inr(g.totalSpent)}</p>
              </div>
            </div>
          );
        })}
      />

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          New Group
        </button>
      </div>

      <CreateSplitGroupDialog
        householdId={householdId}
        currentUserId={currentUserId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onDone={(groupId) => {
          setCreateOpen(false);
          router.push(`/split?id=${householdId}&group=${groupId}`);
        }}
      />

      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(v) => {
            if (!v) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{deleteTarget.name}&rdquo;?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This permanently deletes this group along with its expenses and settlement history. This can&apos;t be undone.
            </p>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deletePending}
                onClick={() =>
                  startDeleteTransition(async () => {
                    const result = await deleteSplitGroup(deleteTarget.id);
                    if ("error" in result) {
                      setDeleteError(result.error);
                      return;
                    }
                    setDeleteTarget(null);
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

type Step = "form" | "invite-share";

function CreateSplitGroupDialog({
  householdId,
  currentUserId,
  open,
  onOpenChange,
  onDone,
}: {
  householdId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: (groupId: string) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [amount, setAmount] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitShareType>("equal");
  const [inviteContact, setInviteContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [smsStatus, setSmsStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [smsError, setSmsError] = useState<string | null>(null);

  function resetAll() {
    setStep("form");
    setName("");
    setIcon(ICON_OPTIONS[0]);
    setAmount("");
    setSplitMethod("equal");
    setInviteContact("");
    setError(null);
    setNewGroupId(null);
    setInviteLink(null);
    setLinkCopied(false);
    setSmsStatus("idle");
    setSmsError(null);
  }

  const looksLikeEmail = inviteContact.includes("@");
  const shareMessage = inviteLink ? `Join me on My Space — use this link: ${inviteLink}` : "";

  // As soon as the invite link is ready, if the contact looks like a phone
  // number (not an email), send it automatically via MSG91 — no second
  // click needed. Falls back to showing the manual link/email/SMS options
  // below regardless of whether this succeeds.
  useEffect(() => {
    if (step !== "invite-share" || looksLikeEmail || !inviteContact.trim() || !shareMessage) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSmsStatus("sending");
    sendInviteSms(inviteContact, shareMessage).then((result) => {
      if ("error" in result) {
        setSmsStatus("error");
        setSmsError(result.error);
        return;
      }
      setSmsStatus("sent");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetAll();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create a split group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIcon(opt)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border text-lg transition",
                      icon === opt ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="split-group-name">Group name</Label>
                <Input
                  id="split-group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekend in Austin"
                  autoFocus
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="split-group-amount">Log a first expense (optional)</Label>
                <Input
                  id="split-group-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Total spent so far (₹)"
                />
                <p className="text-xs text-muted-foreground">Paid by you.</p>
              </div>

              {amount && (
                <div className="space-y-1.5">
                  <Label>Split method</Label>
                  <div className="flex gap-2">
                    {SPLIT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setSplitMethod(m.value)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-medium",
                          splitMethod === m.value ? "border-primary bg-primary/10" : "border-border"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You&apos;re the only member so far, so this logs the full amount as yours until others join.
                  </p>
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="split-group-invite">Invite someone (Split Only access, optional)</Label>
                <Input
                  id="split-group-invite"
                  value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  placeholder="Phone number or email address"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                disabled={pending || !name.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const groupResult = await createSplitGroup(householdId, name.trim(), icon);
                    if ("error" in groupResult) {
                      setError(groupResult.error);
                      return;
                    }
                    const groupId = groupResult.groupId;

                    const spent = Number(amount);
                    if (Number.isFinite(spent) && spent > 0) {
                      // Only the creator is a member at this point, so the
                      // chosen split method can't change the outcome yet —
                      // it's logged fully owed by the creator until others
                      // join; splitMethod becomes meaningful for expenses
                      // added after that.
                      const expenseResult = await createExpense(
                        householdId,
                        {
                          description: name.trim(),
                          amount: spent,
                          category: null,
                          paidBy: currentUserId,
                          splitMethod: "equal",
                          participants: [{ userId: currentUserId }],
                        },
                        groupId
                      );
                      if ("error" in expenseResult) {
                        setError(expenseResult.error);
                        return;
                      }
                    }

                    if (inviteContact.trim()) {
                      const inviteResult = await generateInvite(householdId, "split_only", groupId);
                      if (!("error" in inviteResult)) {
                        const link = `${window.location.origin}/join?token=${inviteResult.token}`;
                        setNewGroupId(groupId);
                        setInviteLink(link);
                        setStep("invite-share");
                        return;
                      }
                    }

                    onDone(groupId);
                  })
                }
              >
                Create Group
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite sent — share the link</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Send this link to {inviteContact || "them"} — opening it joins them straight into &ldquo;{name}&rdquo; with Split Only access.
              </p>

              {!looksLikeEmail && smsStatus !== "idle" && (
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    smsStatus === "sent" ? "text-positive" : smsStatus === "error" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {smsStatus === "sending" && "Sending a text to " + inviteContact + "…"}
                  {smsStatus === "sent" && (
                    <>
                      <Check className="size-3.5" /> Text sent to {inviteContact}
                    </>
                  )}
                  {smsStatus === "error" && smsError}
                </p>
              )}

              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{inviteLink}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    if (inviteLink) navigator.clipboard.writeText(inviteLink);
                    setLinkCopied(true);
                  }}
                >
                  {linkCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  render={
                    <a
                      href={
                        looksLikeEmail
                          ? `mailto:${inviteContact}?subject=${encodeURIComponent("Join me on My Space")}&body=${encodeURIComponent(shareMessage)}`
                          : `mailto:?subject=${encodeURIComponent("Join me on My Space")}&body=${encodeURIComponent(shareMessage)}`
                      }
                    />
                  }
                >
                  <Mail className="size-4" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  render={<a href={`sms:${looksLikeEmail ? "" : inviteContact}?body=${encodeURIComponent(shareMessage)}`} />}
                >
                  <MessageSquare className="size-4" />
                  Open in Messages
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => newGroupId && onDone(newGroupId)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
