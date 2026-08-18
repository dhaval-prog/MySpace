"use client";

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RefreshCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { VaultTransaction, VaultTransactionType } from "@/lib/supabase/types";

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

type Filter = "all" | "add" | "deduct" | "recurring";

const FILTER_TYPE: Record<Filter, VaultTransactionType | null> = {
  all: null,
  add: "add",
  deduct: "deduct",
  recurring: "recurring",
};

/** Groups transactions by calendar day, matching the "Today / +₹5,000 / Added Money" layout from the spec — always rendered from whatever transactions were already fetched, no extra round trip for filtering. */
export function SavingsHistory({ transactions, memberName }: { transactions: VaultTransaction[]; memberName: string }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const type = FILTER_TYPE[filter];
    return type ? transactions.filter((t) => t.type === type) : transactions;
  }, [transactions, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, VaultTransaction[]>();
    for (const t of filtered) {
      const key = dayLabel(t.created_at);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter((v as Filter) ?? "all")}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="add">Added</TabsTrigger>
          <TabsTrigger value="deduct">Taken Out</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No savings activity here yet.</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, rows]) => (
            <div key={day}>
              <p className="mb-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">{day}</p>
              <ul className="space-y-2">
                {rows.map((t) => {
                  const isAdd = t.type !== "deduct";
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", isAdd ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive")}>
                        {t.type === "recurring" ? <RefreshCcw className="size-4" /> : isAdd ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.label || (t.type === "recurring" ? "Regular Saving" : isAdd ? "Added Money" : t.category || "Money Out")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {memberName} · {timeLabel(t.created_at)}
                        </p>
                        {t.comment && <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.comment}</p>}
                      </div>
                      <span className={cn("shrink-0 font-mono text-sm font-semibold", isAdd ? "text-positive" : "text-destructive")}>
                        {isAdd ? "+" : "-"}
                        {inr(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
