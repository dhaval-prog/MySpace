"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinHousehold } from "@/lib/actions/household";

/** Manual counterpart to the /join?token= link — for whoever has the code itself (read aloud, texted as plain text, etc.) rather than a clickable link. Lands on Let's Split either way, same as the link flow. */
export function JoinWithCodeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setToken("");
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <KeyRound className="size-4" />
            Join with a Code
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join with a code</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="join-code">Invite code</Label>
          <Input
            id="join-code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the code someone shared with you"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
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
                setOpen(false);
                router.push(`/split?id=${result.householdId}`);
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
