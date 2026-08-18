"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, Copy, Check, Lock, Mail, MessageSquare, Send, KeyRound, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInvite } from "@/lib/actions/household";
import { sendInviteSms } from "@/lib/actions/sms";
import type { HouseholdInviteRole } from "@/lib/supabase/types";

const ROLE_OPTIONS: { value: HouseholdInviteRole; label: string; description: string }[] = [
  { value: "member", label: "Member", description: "Can contribute, create goals, and use the household chat." },
  { value: "viewer", label: "Viewer", description: "Can see shared savings and goals, but can't change anything." },
  { value: "limited_member", label: "Limited Member", description: "For kids or restricted access — personal piggy + limited visibility." },
  {
    value: "split_only",
    label: "Split Only",
    description: "Only sees Let's Split — shared expenses, balances, and settlements. No access to household savings, goals, members, or chat.",
  },
];

/**
 * `canInvite` is computed server-side from the caller's role in THIS
 * household (owner/co-owner, or — for a split group invite — that group's
 * own creator) and only ever hides the trigger — the real gate is the
 * household_invites_insert_inviter RLS policy (see supabase/schema.sql), so
 * a locked-out member can't just call generateInvite() directly either.
 */
export function InviteMemberDialog({
  householdId,
  canInvite,
  groupId,
  defaultRole = "member",
  /** Split-group invites (see split-group-workspace.tsx) skip the role picker entirely — a Let's Split invite is always Split Only, so there's nothing to choose. The code generates the moment the dialog opens. */
  lockToSplitOnly = false,
  /** Renders with no trigger button of its own — for embedding inside another control (e.g. HouseholdSwitcher's dropdown), which owns `open`/`onOpenChange` instead. */
  hideTrigger = false,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  householdId: string;
  canInvite: boolean;
  /** When set, a Split Only invite joins this specific split group instead of the household's default one — see create_split_group()/redeem_household_invite() in supabase/schema.sql. */
  groupId?: string;
  defaultRole?: HouseholdInviteRole;
  lockToSplitOnly?: boolean;
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const [role, setRole] = useState<HouseholdInviteRole>(lockToSplitOnly ? "split_only" : defaultRole);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [smsPending, startSmsTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setToken(null);
    setCopied(false);
    setLinkCopied(false);
    setPhone("");
    setSmsError(null);
    setSmsSent(false);
    setError(null);
    setRole(lockToSplitOnly ? "split_only" : defaultRole);
  }

  // A split-group invite never asks "which role?" — it's always Split Only
  // — so as soon as the dialog opens, generate the code right away instead
  // of making the user click through an extra step.
  useEffect(() => {
    if (!open || !lockToSplitOnly || token || pending) return;
    startTransition(async () => {
      const result = await generateInvite(householdId, "split_only", groupId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setToken(result.token);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lockToSplitOnly]);

  const inviteLink = token && typeof window !== "undefined" ? `${window.location.origin}/join?token=${token}` : "";
  const shareMessage = `Join me on My Space — use this link: ${inviteLink}`;

  if (!canInvite) {
    if (hideTrigger) return null;
    // Deliberately not the native `disabled` attribute — that sets
    // pointer-events:none, which would also swallow hover and hide the
    // tooltip explaining *why* it's locked. There's no onClick here, so it's
    // already inert; aria-disabled just tells assistive tech the same thing.
    return (
      <Button
        size="sm"
        variant="outline"
        aria-disabled="true"
        title="Only the Owner or Co-Owners can invite members."
        className="cursor-not-allowed text-muted-foreground/70 opacity-60 hover:bg-background hover:text-muted-foreground/70"
      >
        <Lock className="size-3.5" />
        Invite
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      {!hideTrigger && (
        <DialogTrigger
          render={
            <Button size="sm" variant="outline">
              <UserPlus className="size-4" />
              Invite
            </Button>
          }
        />
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
        </DialogHeader>

        {token ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl bg-primary/5 px-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserPlus className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">
                Share this code — whoever enters it joins as <span className="font-medium text-foreground capitalize">{role.replace("_", " ")}</span>.
                It expires in 7 days.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <KeyRound className="size-3.5" />
                Invite code
              </Label>
              <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5">
                <code className="min-w-0 flex-1 truncate text-xs">{token}</code>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(token);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="size-3.5" />
                Direct link
              </Label>
              <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{inviteLink}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    setLinkCopied(true);
                  }}
                >
                  {linkCopied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3"
                render={<a href={`mailto:?subject=${encodeURIComponent("Join me on My Space")}&body=${encodeURIComponent(shareMessage)}`} />}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="size-4" />
                </span>
                <span className="text-xs font-medium">Email</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3"
                render={<a href={`sms:?body=${encodeURIComponent(shareMessage)}`} />}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageSquare className="size-4" />
                </span>
                <span className="text-xs font-medium">Messages</span>
              </Button>
            </div>

            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <Label htmlFor="invite-sms-phone" className="text-xs text-muted-foreground">
                Or text it directly to a phone number
              </Label>
              <div className="flex gap-2">
                <Input
                  id="invite-sms-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setSmsSent(false);
                    setSmsError(null);
                  }}
                  placeholder="Phone number"
                  className="flex-1 bg-background"
                />
                <Button
                  variant={smsSent ? "outline" : "default"}
                  size="sm"
                  disabled={smsPending || !phone.trim() || smsSent}
                  onClick={() =>
                    startSmsTransition(async () => {
                      const result = await sendInviteSms(phone, shareMessage);
                      if ("error" in result) {
                        setSmsError(result.error);
                        return;
                      }
                      setSmsError(null);
                      setSmsSent(true);
                    })
                  }
                >
                  {smsSent ? <Check className="size-4" /> : <Send className="size-4" />}
                  {smsSent ? "Sent" : "Send"}
                </Button>
              </div>
              {smsError && <p className="text-xs text-destructive">{smsError}</p>}
            </div>
          </div>
        ) : lockToSplitOnly ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            {error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">Generating your invite code…</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as HouseholdInviteRole)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: HouseholdInviteRole) => ROLE_OPTIONS.find((r) => r.value === v)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_OPTIONS.find((r) => r.value === role)?.description}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!lockToSplitOnly && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {token ? "Done" : "Cancel"}
            </Button>
            {!token && (
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await generateInvite(householdId, role, groupId);
                    if ("error" in result) {
                      setError(result.error);
                      return;
                    }
                    setToken(result.token);
                  })
                }
              >
                Generate Code
              </Button>
            )}
          </DialogFooter>
        )}
        {lockToSplitOnly && token && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
