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

/** Regular Savings — a plan/reminder the cron job (src/app/api/vault/cron/recurring-run) actually deposits on schedule, never a claim of moving real bank money. */
export function RecurringSavingsCard({ plan }: { plan: VaultRecurringPlan | null }) {
  const [enabled, setEnabled] = useState(plan?.enabled ?? false);
  const [amount, setAmount] = useState(String(plan?.amount ?? 5000));
  const [scheduleMode, setScheduleMode] = useState<VaultRecurringScheduleMode>(plan?.schedule_mode ?? "salary");
  const [dayOfMonth, setDayOfMonth] = useState(String(plan?.day_of_month ?? 1));
  const [nextRunDate, setNextRunDate] = useState(plan?.next_run_date ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

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
        dayOfMonth: Number(dayOfMonth) || 1,
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
    <Card className="p-5">
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
              <button
                type="button"
                onClick={() => setScheduleMode("salary")}
                className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium", scheduleMode === "salary" ? "border-primary bg-primary/10" : "")}
              >
                Salary day
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("date")}
                className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium", scheduleMode === "date" ? "border-primary bg-primary/10" : "")}
              >
                Chosen date
              </button>
            </div>
          </div>
        </div>

        {scheduleMode === "date" && (
          <div className="space-y-1.5">
            <Label htmlFor="recurring-day">Day of month (1–28)</Label>
            <Input
              id="recurring-day"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="w-28"
            />
          </div>
        )}

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
