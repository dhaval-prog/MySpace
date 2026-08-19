"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ExpenseCategoryOption } from "@/lib/actions/expenses";

/** Filters the Transactions list via ?category=, the same URL-driven pattern Let's Split uses for switching groups — shareable/bookmarkable and re-fetches server-side rather than hiding rows client-side. */
export function CategoryFilterChips({
  householdId,
  categories,
  activeCategoryId,
}: {
  householdId: string;
  categories: ExpenseCategoryOption[];
  activeCategoryId?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => router.push(`/expenses?id=${householdId}`)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
          !activeCategoryId ? "border-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
        )}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => router.push(`/expenses?id=${householdId}&category=${c.id}`)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            activeCategoryId === c.id ? "border-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
          )}
        >
          <span>{c.icon}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
