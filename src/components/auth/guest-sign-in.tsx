"use client";

import { useState, useActionState } from "react";
import { UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAsGuest, type AuthState } from "@/lib/actions/auth";

/**
 * "Continue as a guest" on the login page — just name + phone for now, no
 * OTP step (that shipped once already; removed for the time being, see git
 * history on this file/signInAsGuest if it needs to come back).
 */
export function GuestSignIn({ redirectTo }: { redirectTo: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInAsGuest, {});

  return (
    <div className="mt-4 border-t pt-4">
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen((v) => !v)}>
        <UserRound className="size-4" />
        Continue as a guest
      </Button>

      {/* Inline expand instead of a popup — same grid-template-rows trick used
          throughout the app (Add Money, goal cards, etc). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <p className="text-xs text-muted-foreground">
              Guest access only unlocks Let&apos;s Split for the group you were invited to — everything else stays
              locked until you create a real account.
            </p>
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your name</Label>
              <Input id="guest-name" name="name" placeholder="e.g. Priya Sharma" autoComplete="name" tabIndex={open ? 0 : -1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone number</Label>
              <Input id="guest-phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" tabIndex={open ? 0 : -1} />
            </div>
            {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending} tabIndex={open ? 0 : -1}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Continuing…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
