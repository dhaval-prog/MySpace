"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/layout/list-row";
import type { HomeItemsView } from "@/lib/home-data";

const RECENT_KEY = "myspace.recent-searches";

function loadRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const existing = loadRecent().filter((q) => q.toLowerCase() !== query.toLowerCase());
    sessionStorage.setItem(RECENT_KEY, JSON.stringify([query, ...existing].slice(0, 5)));
  } catch {
    // sessionStorage unavailable — recent list just won't persist.
  }
}

export function SearchWorkspace({ items, totalItems }: { items: HomeItemsView["items"]; totalItems: number }) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadRecent()));

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, q]);

  const best = results[0] ?? null;
  const also = results.slice(1);

  function commitSearch(value: string) {
    if (!value.trim()) return;
    saveRecent(value.trim());
    setRecent(loadRecent());
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => commitSearch(query)}
            onKeyDown={(e) => e.key === "Enter" && commitSearch(query)}
            placeholder="Search your items…"
            className="w-full rounded-2xl bg-muted py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
      </Card>

      {!q ? (
        <Card className="p-5">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Recent</p>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Say it or type it — search {totalItems} items across your home.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => setQuery(r)} className="flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-left text-sm font-medium hover:bg-muted/70">
                  <SearchIcon className="size-4 text-muted-foreground" />
                  {r}
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Results {results.length}</p>
            <p className="text-xs text-muted-foreground">{totalItems} items searched</p>
          </div>

          {best ? (
            <Card className="p-5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Best match</p>
              <p className="mt-1 font-heading text-xl">{best.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{best.roomName}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{best.furnitureName}</span>
              </div>
              <Button className="mt-4 w-full rounded-2xl" render={<Link href={`/items/${best.id}`} />}>
                <Navigation className="size-4" />
                Take me there
              </Button>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No items match &ldquo;{query}&rdquo;.</p>
            </Card>
          )}

          {also.length > 0 && (
            <div>
              <p className="px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Also matched {also.length}</p>
              <div className="mt-2 space-y-2">
                {also.slice(0, 8).map((item) => (
                  <ListRow key={item.id} href={`/items/${item.id}`} title={item.name} subtitle={`${item.roomName} → ${item.furnitureName}`} chevron />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
