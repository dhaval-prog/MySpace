"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Piggy, type PiggyCoinEvent, type PiggyMood } from "@/components/vault/piggy";
import { AddMoneyButton, AddMoneyPanel } from "@/components/vault/add-money-dialog";
import { TakeMoneyButton, TakeMoneyPanel } from "@/components/vault/take-money-dialog";
import { SavingsHistory } from "@/components/vault/savings-history";
import { RecurringSavingsCard } from "@/components/vault/recurring-savings-card";
import { SwipeCarousel } from "@/components/shared/swipe-carousel";
import { useCountUp } from "@/lib/hooks/use-count-up";
import type { VaultRecurringPlan, VaultTransaction } from "@/lib/supabase/types";

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Piggy visibly fuller past ₹5k/₹15k/₹30k — deliberately coarse steps, not a precise gauge, so it never reads as a progress bar. */
function fullnessFor(balance: number): number {
  if (balance <= 0) return 0;
  if (balance < 5000) return 0.15;
  if (balance < 15000) return 0.4;
  if (balance < 30000) return 0.7;
  return 1;
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export function PersonalPiggyPage({
  memberName,
  initialBalance,
  initialTransactions,
  initialPlan,
}: {
  memberName: string;
  initialBalance: number;
  initialTransactions: VaultTransaction[];
  initialPlan: VaultRecurringPlan | null;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [mood, setMood] = useState<PiggyMood>(initialBalance <= 0 ? "empty" : "idle");
  const [coinEvent, setCoinEvent] = useState<PiggyCoinEvent>(null);
  const [balancePop, setBalancePop] = useState(false);
  // Only one of Add Money / Take Money Out can be expanded at a time —
  // both inline panels are driven from this single piece of state.
  const [expandedPanel, setExpandedPanel] = useState<"add" | "take" | null>(null);

  const displayBalance = useCountUp(balance);

  const monthStart = useMemo(() => startOfMonthISO(), []);
  const savedThisMonth = useMemo(
    () => transactions.filter((t) => t.type !== "deduct" && t.created_at >= monthStart).reduce((sum, t) => sum + t.amount, 0),
    [transactions, monthStart]
  );
  const lastAdded = useMemo(() => transactions.find((t) => t.type !== "deduct") ?? null, [transactions]);

  function react(nextMood: PiggyMood, event: PiggyCoinEvent, settleMood: PiggyMood) {
    setMood(nextMood);
    setCoinEvent(event);
    setBalancePop(true);
    setTimeout(() => setCoinEvent(null), 900);
    setTimeout(() => setBalancePop(false), 500);
    setTimeout(() => setMood(settleMood), 900);
  }

  function handleAdded(newBalance: number, amount: number) {
    setBalance(newBalance);
    setTransactions((prev) => [
      { id: `optimistic-${Date.now()}`, user_id: "", type: "add", amount, category: null, comment: null, label: null, source: "manual", voice_command: null, normalized_intent: null, related_item_id: null, created_at: new Date().toISOString() },
      ...prev,
    ]);
    react("happy", "in", newBalance <= 0 ? "empty" : "idle");
  }

  function handleTaken(newBalance: number, amount: number) {
    setBalance(newBalance);
    setTransactions((prev) => [
      { id: `optimistic-${Date.now()}`, user_id: "", type: "deduct", amount, category: "Other", comment: null, label: null, source: "manual", voice_command: null, normalized_intent: null, related_item_id: null, created_at: new Date().toISOString() },
      ...prev,
    ]);
    react("sad", "out", newBalance <= 0 ? "empty" : "idle");
  }

  const isEmpty = balance <= 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-8 py-8 md:px-16 md:py-14">
      <div className="hidden md:block">
        <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Personal Piggy</p>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl md:text-5xl">Your personal savings space</h1>
      </div>

      <SwipeCarousel
        peek
        slides={[
          <Card key="balance" className="p-5">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="order-2 text-center sm:order-1 sm:text-left">
                <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Piggy Balance</p>
                <p className={`mt-1 font-heading text-5xl text-foreground ${balancePop ? "piggy-balance-pop" : ""}`}>{inr(displayBalance)}</p>
                {!isEmpty && (
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>
                      Saved this month: <span className="font-medium text-foreground">{inr(savedThisMonth)}</span>
                    </p>
                    {lastAdded && (
                      <p>
                        Last added: <span className="font-medium text-foreground">{inr(lastAdded.amount)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Piggy mood={mood} fullness={fullnessFor(balance)} coinEvent={coinEvent} className="order-1 h-40 w-48 sm:order-2 sm:h-48 sm:w-56" />
            </div>

            {isEmpty && (
              <div className="mt-6 flex flex-col items-center gap-2 text-center">
                <p className="font-heading text-xl text-foreground">Your Piggy is Empty</p>
                <p className="text-sm text-muted-foreground">Let&apos;s put the first coin in.</p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
              <AddMoneyButton open={expandedPanel === "add"} onOpenChange={(v) => setExpandedPanel(v ? "add" : null)} />
              <TakeMoneyButton open={expandedPanel === "take"} onOpenChange={(v) => setExpandedPanel(v ? "take" : null)} />
            </div>
            <AddMoneyPanel
              onAdded={handleAdded}
              open={expandedPanel === "add"}
              onOpenChange={(v) => setExpandedPanel(v ? "add" : null)}
            />
            <TakeMoneyPanel
              balance={balance}
              onTaken={handleTaken}
              open={expandedPanel === "take"}
              onOpenChange={(v) => setExpandedPanel(v ? "take" : null)}
            />
          </Card>,

          <RecurringSavingsCard key="recurring" plan={initialPlan} />,

          <Card key="history" className="p-5">
            <CardHeader className="p-0">
              <CardTitle className="text-base">Savings History</CardTitle>
            </CardHeader>
            <CardContent className="mt-4 p-0">
              <SavingsHistory transactions={transactions} memberName={memberName} />
            </CardContent>
          </Card>,
        ]}
      />
    </div>
  );
}
