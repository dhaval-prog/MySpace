"use client";

import { useState, useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setPiggyRecurringPlan } from "@/lib/actions/vault";
import type { VaultRecurringPlan, VaultRecurringScheduleMode } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function formatNextRun(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function clampDay(raw: string, fallback: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(28, Math.max(1, n));
}

/**
 * A schedule-mode pill that doubles as its own day-of-month entry point:
 * first click picks this mode and shows a dimmed prompt in place of the
 * label; a second click (while already the active mode) swaps the pill for
 * a real number input; once a day has been set, the pill shows "Day N"
 * instead of the prompt from then on.
 */
function ScheduleModeButton({
  label,
  prompt,
  active,
  editing,
  day,
  dayConfirmed,
  onSelect,
  onOpenEdit,
  onDayChange,
  onCloseEdit,
}: {
  label: string;
  prompt: string;
  active: boolean;
  editing: boolean;
  day: string;
  dayConfirmed: boolean;
  onSelect: () => void;
  onOpenEdit: () => void;
  onDayChange: (value: string) => void;
  onCloseEdit: () => void;
}) {
  if (active && editing) {
    return (
      <Input
        type="number"
        min={1}
        max={28}
        autoFocus
        value={day}
        onChange={(e) => onDayChange(e.target.value)}
        onBlur={onCloseEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCloseEdit();
        }}
        placeholder="1–28"
        className="flex-1 rounded-lg text-center text-xs font-medium"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={active ? onOpenEdit : onSelect}
      className={cn(
        "flex-1 rounded-lg border px-3 py-2 text-xs font-medium",
        active ? "border-primary bg-primary/10" : ""
      )}
    >
      {active ? (dayConfirmed ? <span>Day {day}</span> : <span className="text-muted-foreground/60">{prompt}</span>) : label}
    </button>
  );
}

/** Regular Savings — a plan/reminder the cron job (src/app/api/vault/cron/recurring-run) actually deposits on schedule, never a claim of moving real bank money. */
export function RecurringSavingsCard({ plan }: { plan: VaultRecurringPlan | null }) {
  const [enabled, setEnabled] = useState(plan?.enabled ?? false);
  const [amount, setAmount] = useState(String(plan?.amount ?? 5000));
  const [scheduleMode, setScheduleMode] = useState<VaultRecurringScheduleMode>(plan?.schedule_mode ?? "salary");
  const [dayOfMonth, setDayOfMonth] = useState(String(plan?.day_of_month ?? 1));
  const [dayConfirmed, setDayConfirmed] = useState(Boolean(plan));
  const [editingDay, setEditingDay] = useState(false);
  const [nextRunDate, setNextRunDate] = useState(plan?.next_run_date ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function selectMode(mode: VaultRecurringScheduleMode) {
    setScheduleMode(mode);
    setEditingDay(false);
  }

  function closeDayEdit() {
    setEditingDay(false);
    setDayOfMonth((current) => String(clampDay(current, plan?.day_of_month ?? 1)));
    setDayConfirmed(true);
  }

  function save(next: { enabled: boolean }) {
    startTransition(async () => {
      setError(null);
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        setError("Enter a valid monthly amount.");
        return;
      }
      const result = await setPiggyRecurringPlan({
        amount: value,
        scheduleMode,
        dayOfMonth: clampDay(dayOfMonth, 1),
        enabled: next.enabled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(result.plan.enabled);
      setNextRunDate(result.plan.next_run_date);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <Card className="p-5 transition-transform duration-300 ease-out hover:scale-[1.015] motion-reduce:transition-none motion-reduce:hover:scale-100">
      <CardHeader className="flex-row items-center justify-between p-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCcw className="size-4 text-primary" />
          Regular Savings
        </CardTitle>
        <Switch checked={enabled} disabled={pending} onCheckedChange={(v) => save({ enabled: v })} />
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0">
        <p className="text-sm text-muted-foreground">Keep your Piggy growing automatically.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="recurring-amount">Amount per month (₹)</Label>
            <Input id="recurring-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Schedule</Label>
            <div className="flex gap-2">
              <ScheduleModeButton
                label="Salary day"
                prompt="Enter Day Of Salary"
                active={scheduleMode === "salary"}
                editing={editingDay}
                day={dayOfMonth}
                dayConfirmed={dayConfirmed}
                onSelect={() => selectMode("salary")}
                onOpenEdit={() => setEditingDay(true)}
                onDayChange={setDayOfMonth}
                onCloseEdit={closeDayEdit}
              />
              <ScheduleModeButton
                label="Chosen date"
                prompt="Enter Day Of Month (1-28)"
                active={scheduleMode === "date"}
                editing={editingDay}
                day={dayOfMonth}
                dayConfirmed={dayConfirmed}
                onSelect={() => selectMode("date")}
                onOpenEdit={() => setEditingDay(true)}
                onDayChange={setDayOfMonth}
                onCloseEdit={closeDayEdit}
              />
            </div>
          </div>
        </div>

        {enabled && nextRunDate && (
          <p className="text-sm text-muted-foreground">
            Next contribution: <span className="font-medium text-foreground">₹{Number(amount || 0).toLocaleString("en-IN")}</span> on{" "}
            {formatNextRun(nextRunDate)}
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button size="sm" variant="outline" disabled={pending} onClick={() => save({ enabled })}>
          {saved ? "Saved" : pending ? "Saving…" : "Save Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
