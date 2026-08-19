"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { UserRound, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signInAsGuest, type AuthState } from "@/lib/actions/auth";

/**
 * "Continue as a guest" on the login page — just name + phone, no OTP step
 * (removed for now — see git history on this file/signInAsGuest if it needs
 * to come back). Re-entering the same phone resumes that guest's prior
 * access rather than starting over (see signInAsGuest); past 7 days from
 * that phone's first guest sign-in, it's refused and this shows a "sign up
 * to continue" dialog instead of the plain inline error.
 */
export function GuestSignIn({ redirectTo, initiallyExpired = false }: { redirectTo: string; initiallyExpired?: boolean }) {
  const [open, setOpen] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(initiallyExpired);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInAsGuest, {});

  // Open the expired dialog when the action reports it — adjusted during
  // render (React's own documented pattern for "state changed, react to
  // it") rather than an effect, same as SwipeCarousel's prop-sync elsewhere
  // in this app.
  const [syncedState, setSyncedState] = useState(state);
  if (state !== syncedState) {
    setSyncedState(state);
    if (state.guestExpired) setExpiredOpen(true);
  }

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
              Guest access only unlocks Let&apos;s Split for the group you were invited to, for 7 days — everything
              else stays locked until you create a real account.
            </p>
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your name</Label>
              <Input id="guest-name" name="name" placeholder="e.g. Priya Sharma" autoComplete="name" tabIndex={open ? 0 : -1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone number</Label>
              <Input id="guest-phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" tabIndex={open ? 0 : -1} />
            </div>
            {state.error && !state.guestExpired && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
            )}
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

      <Dialog open={expiredOpen} onOpenChange={setExpiredOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Your guest access has ended
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Guest access to Let&apos;s Split lasts 7 days from your first sign-in. Create a free account to keep using
            it — your split group history stays right where it is.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button render={<Link href="/signup">Create an account</Link>} className="w-full" />
            <Button render={<Link href="/login">Log in instead</Link>} variant="outline" className="w-full" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
