"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSplitGroup, type SplitGroupSummary } from "@/lib/actions/split";

const ICON_OPTIONS = ["🤝", "🏠", "✈️", "🎉", "🍽️", "🚗", "🏕️", "🎓"];

/** Every split group the caller belongs to, as a row of pills — clicking one switches ?group= without touching ?id=, matching how HouseholdSwitcher already swaps ?id= for households. */
export function SplitGroupSwitcher({
  householdId,
  groups,
  currentGroupId,
}: {
  householdId: string;
  groups: SplitGroupSummary[];
  currentGroupId: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g) => {
          const active = g.id === currentGroupId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => router.push(`/split?id=${householdId}&group=${g.id}`)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                active ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <span>{g.icon}</span>
              {g.name}
              <span className={cn("rounded-full px-1.5 py-0.5 text-xs", active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>
                {g.memberCount}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          New Group
        </button>
      </div>

      <CreateSplitGroupDialog
        householdId={householdId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(groupId) => {
          setCreateOpen(false);
          router.push(`/split?id=${householdId}&group=${groupId}`);
        }}
      />
    </>
  );
}

function CreateSplitGroupDialog({
  householdId,
  open,
  onOpenChange,
  onCreated,
}: {
  householdId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (groupId: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setIcon(ICON_OPTIONS[0]);
          setError(null);
        }
      }}
    >
      <DialogContent>
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
                const result = await createSplitGroup(householdId, name.trim(), icon);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                onCreated(result.groupId);
              })
            }
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
