"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shown when a guest (anonymous, invite-only Split access) taps a locked
 * nav item — everything but Split stays behind this until they create a
 * real account or log into one. */
export function SignInPromptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            Sign in to unlock
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          As a guest you can only use Let&apos;s Split for the group you were invited to. Create a free account or log
          into one to unlock My Home, Personal Piggy, Goals, and Settings.
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button render={<Link href="/signup">Create an account</Link>} className="w-full" />
          <Button render={<Link href="/login">Log in</Link>} variant="outline" className="w-full" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
