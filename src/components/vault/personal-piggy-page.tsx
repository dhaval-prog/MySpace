"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2, Lock, Coins, Wallet, Target, ScrollText } from "lucide-react";
import { Piggy, type PiggyCoinEvent, type PiggyMood } from "@/components/vault/piggy";
import { AddMoneyPanel, AddMoneyButton } from "@/components/vault/add-money-dialog";
import { TakeMoneyPanel, TakeMoneyButton } from "@/components/vault/take-money-dialog";
import { SavingsHistory } from "@/components/vault/savings-history";
import { RecurringSavingsCard } from "@/components/vault/recurring-savings-card";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/lib/hooks/use-count-up";
import type { VaultRecurringPlan, VaultTransaction } from "@/lib/supabase/types";
import type { HouseholdGoalSummary } from "@/lib/actions/household-goals";

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

export function PersonalPiggyPage({
  memberName,
  initialBalance,
  initialTransactions,
  initialPlan,
  goals = [],
}: {
  memberName: string;
  initialBalance: number;
  initialTransactions: VaultTransaction[];
  initialPlan: VaultRecurringPlan | null;
  goals?: HouseholdGoalSummary[];
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [mood, setMood] = useState<PiggyMood>(initialBalance <= 0 ? "empty" : "idle");
  const [coinEvent, setCoinEvent] = useState<PiggyCoinEvent>(null);
  const [expandedPanel, setExpandedPanel] = useState<"add" | "take" | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const displayBalance = useCountUp(balance);

  function react(nextMood: PiggyMood, event: PiggyCoinEvent, settleMood: PiggyMood) {
    setMood(nextMood);
    setCoinEvent(event);
    setTimeout(() => setCoinEvent(null), 900);
    setTimeout(() => setMood(settleMood), 900);
  }

  function handleAdded(newBalance: number, amount: number) {
    setBalance(newBalance);
    setTransactions((prev) => [
      { id: `optimistic-${Date.now()}`, user_id: "", type: "add", amount, category: null, comment: null, label: null, source: "manual", voice_command: null, normalized_intent: null, related_item_id: null, created_at: new Date().toISOString() },
      ...prev,
    ]);
    setUnlocked(true);
    react("happy", "in", newBalance <= 0 ? "empty" : "idle");
  }

  function handleTaken(newBalance: number, amount: number) {
    setBalance(newBalance);
    setTransactions((prev) => [
      { id: `optimistic-${Date.now()}`, user_id: "", type: "deduct", amount, category: "Other", comment: null, label: null, source: "manual", voice_command: null, normalized_intent: null, related_item_id: null, created_at: new Date().toISOString() },
      ...prev,
    ]);
    setUnlocked(true);
    react("sad", "out", newBalance <= 0 ? "empty" : "idle");
  }


  return (
    <div>
      <MobileBand
        title="Piggy"
        backHref="/home"
        right={
          <RoundIconButton href="/settings" ariaLabel="Settings">
            <Settings2 className="size-4.5" />
          </RoundIconButton>
        }
      />
      <DesktopBand breadcrumb="Piggy · Personal" title="Your piggy" subtitle={memberName} />

      <MobileHeroOverlap>
        <PiggyHero
          mood={mood}
          balance={balance}
          displayBalance={displayBalance}
          coinEvent={coinEvent}
          unlocked={unlocked}
          onUnlock={() => setUnlocked(true)}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionTile icon={<Coins className="size-4.5" />} label="Add money" sublabel="Coin goes in" tone="primary" onClick={() => setExpandedPanel(expandedPanel === "add" ? null : "add")} />
          <ActionTile icon={<Wallet className="size-4.5" />} label="Take out" sublabel="Quietly" onClick={() => setExpandedPanel(expandedPanel === "take" ? null : "take")} />
          <ActionTile icon={<Target className="size-4.5" />} label="Set a goal" sublabel={`${goals.length} running`} href="/goals" />
          <ActionTile icon={<ScrollText className="size-4.5" />} label="Activity" sublabel={`${transactions.length} entries`} tone="dark" onClick={() => setShowActivity((v) => !v)} />
        </div>

        <AddMoneyPanel onAdded={handleAdded} open={expandedPanel === "add"} onOpenChange={(v) => setExpandedPanel(v ? "add" : null)} />
        <TakeMoneyPanel balance={balance} onTaken={handleTaken} open={expandedPanel === "take"} onOpenChange={(v) => setExpandedPanel(v ? "take" : null)} />

        {showActivity && (
          <div className="mt-4 space-y-4">
            <RecurringSavingsCard plan={initialPlan} />
            <Card className="p-5">
              <SavingsHistory transactions={transactions} memberName={memberName} />
            </Card>
          </div>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-4 pb-8 md:grid md:grid-cols-[1fr_380px] md:px-8">
        <Card className="flex flex-col items-center gap-4 p-8">
          <Piggy mood={mood} fullness={fullnessFor(balance)} coinEvent={coinEvent} className="h-56 w-64" />
          <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">In the piggy</p>
          {unlocked ? (
            <p className="font-heading text-3xl text-foreground">{inr(displayBalance)}</p>
          ) : (
            <div className="flex items-center gap-2 font-heading text-2xl text-foreground">
              <span>₹</span>
              <span>• • • •</span>
            </div>
          )}
          {!unlocked && <p className="text-sm text-muted-foreground">Locked. Four digits to see the balance and move money.</p>}
          <Button size="lg" className="mt-2 w-full rounded-2xl" onClick={() => setUnlocked(true)}>
            <Lock className="size-4" />
            Open piggy
          </Button>

          {unlocked && (
            <div className="mt-2 flex w-full gap-3">
              <AddMoneyButton open={expandedPanel === "add"} onOpenChange={(v) => setExpandedPanel(v ? "add" : null)} />
              <TakeMoneyButton open={expandedPanel === "take"} onOpenChange={(v) => setExpandedPanel(v ? "take" : null)} />
            </div>
          )}
          <div className="w-full">
            <AddMoneyPanel onAdded={handleAdded} open={expandedPanel === "add"} onOpenChange={(v) => setExpandedPanel(v ? "add" : null)} />
            <TakeMoneyPanel balance={balance} onTaken={handleTaken} open={expandedPanel === "take"} onOpenChange={(v) => setExpandedPanel(v ? "take" : null)} />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-heading text-lg">Saving towards</p>
              <Link href="/goals" className="text-sm font-medium text-primary">
                Set a goal
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {goals.length === 0 ? (
                <p className="col-span-2 text-sm text-muted-foreground">No goals yet.</p>
              ) : (
                goals.slice(0, 4).map((g) => (
                  <Link
                    key={g.goal.id}
                    href={`/goals?id=${g.goal.household_id}`}
                    className="rounded-2xl bg-muted p-3 transition-colors hover:bg-muted/70"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm">{g.goal.icon}</span>
                      <span className="font-mono text-xs font-medium text-secondary">{g.progressPct}%</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{g.goal.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{inr(g.currentAmount)}…</p>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <RecurringSavingsCard plan={initialPlan} />

          <Card className="flex-1 overflow-y-auto p-5">
            <p className="font-heading text-lg">Recent activity</p>
            <div className="mt-3">
              <SavingsHistory transactions={transactions} memberName={memberName} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PiggyHero({
  mood,
  balance,
  displayBalance,
  coinEvent,
  unlocked,
  onUnlock,
}: {
  mood: PiggyMood;
  balance: number;
  displayBalance: number;
  coinEvent: PiggyCoinEvent;
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const isEmpty = balance <= 0;
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center">
        <Piggy mood={mood} fullness={fullnessFor(balance)} coinEvent={coinEvent} className="h-40 w-48" />

        {isEmpty && unlocked ? (
          <p className="mt-2 text-center font-heading text-lg text-foreground">Your Piggy is Empty</p>
        ) : (
          <>
            <p className="mt-4 font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">In the piggy</p>
            {unlocked ? (
              <p className="mt-1 font-heading text-3xl text-foreground">{inr(displayBalance)}</p>
            ) : (
              <div className="mt-1 flex items-center gap-2 font-heading text-3xl text-foreground">
                <span>₹</span>
                <span>• • • •</span>
              </div>
            )}
          </>
        )}

        <Button size="lg" className="mt-5 w-full rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary/85" onClick={onUnlock}>
          <Lock className="size-4" />
          Open piggy
        </Button>
      </div>
    </Card>
  );
}

function ActionTile({
  icon,
  label,
  sublabel,
  tone = "light",
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  tone?: "light" | "primary" | "dark";
  href?: string;
  onClick?: () => void;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "dark"
        ? "bg-secondary text-secondary-foreground"
        : "bg-white text-foreground";
  const iconToneClass = tone === "light" ? "bg-accent text-accent-foreground" : "bg-white/20 text-current";

  const body = (
    <>
      <span className={`flex size-9 items-center justify-center rounded-full ${iconToneClass}`}>{icon}</span>
      <div>
        <p className="font-medium">{label}</p>
        <p className={tone === "light" ? "text-xs text-muted-foreground" : "text-xs opacity-80"}>{sublabel}</p>
      </div>
    </>
  );

  const className = `flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-transform active:scale-[0.98] ${toneClass}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
