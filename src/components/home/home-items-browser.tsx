"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemGridCard } from "@/components/home/item-grid-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemForm } from "@/components/items/item-form";
import { createItem } from "@/lib/actions/items";
import type { RoomFilter, HomeItemsView } from "@/lib/home-data";

type Mode = "all" | "add";

export function HomeItemsBrowser({
  homeId,
  rooms,
  items,
}: {
  homeId: string;
  rooms: RoomFilter[];
  items: HomeItemsView["items"];
}) {
  const [mode, setMode] = useState<Mode>("all");
  const [roomId, setRoomId] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(true);

  const activeRoomName = roomId === "all" ? null : (rooms.find((r) => r.id === roomId)?.name ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (roomId !== "all" && item.roomId !== roomId) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, roomId, query]);

  return (
    <div className="space-y-5">
      {/* Sticks below the app header while scrolling on mobile — the toggle,
          room pills, and search stay put, cards below them scroll on.
          Desktop keeps its normal flow (md:static). */}
      <div className="sticky top-[61px] z-20 -mx-4 space-y-3 overflow-x-hidden bg-background px-4 pt-1 pb-3 md:static md:mx-0 md:space-y-5 md:px-0 md:pt-0 md:pb-0">
        <div className="flex flex-nowrap items-center gap-3">
          {/* Search Bar sits first — open by default, it expands to fill the
              row (flex-1), pushing Add Items/All to the right on the same
              line; closed, it shrinks back to a compact pill button. */}
          <div className={cn("flex min-w-0 items-center", searchOpen ? "flex-1" : "shrink-0")}>
            {searchOpen ? (
              <div className="relative w-full">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search in ${activeRoomName ?? "My Home"}...`}
                  className="h-[34px] w-full rounded-full border bg-card pr-9 pl-9 text-sm outline-none focus:border-primary"
                  tabIndex={mode === "all" ? 0 : -1}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-[30px] shrink-0 items-center justify-center gap-1.5 rounded-full border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Search className="size-3.5" />
                Search Bar
              </button>
            )}
          </div>

          {/* A grouped segmented control (not just two more pills in the
              row) so the All/Add Items toggle reads as one intentional
              control at a glance, distinct from the room filter chips. */}
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-card p-1">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={cn(
                "flex h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                mode === "add" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}
            >
              Add Items
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("all");
                setRoomId("all");
              }}
              className={cn(
                "flex h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                mode === "all" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}
            >
              All
              <span className={cn("font-mono text-[11px]", mode === "all" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {items.length}
              </span>
            </button>
          </div>
        </div>

        {/* Room filter chips — their own line below the search/mode row now
            that Search Bar can claim the rest of that row's width. */}
        <div
          dir="rtl"
          className="overflow-hidden transition-[max-width] duration-500 ease-out motion-reduce:transition-none"
          style={{ maxWidth: mode === "all" ? "800px" : "0px" }}
        >
          <div
            dir="ltr"
            className={cn(
              "flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 transition-opacity duration-500 ease-out motion-reduce:transition-none",
              mode === "all" ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoomId(r.id)}
                className={cn(
                  "flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                  roomId === r.id ? "bg-primary text-primary-foreground" : "border bg-card text-foreground"
                )}
              >
                {r.name}
                <span className={cn("font-mono text-[11px]", roomId === r.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {r.itemCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Both panels share one grid cell so the container's height tracks
          whichever is on screen. The outgoing panel fades out quickly with
          no delay so it's gone before the incoming one starts sliding in —
          otherwise the outgoing Add Items form is still visibly fading
          while the room cards are opening, which reads as an extra "form
          column" step in what should be a single clean reveal. */}
      <div className="grid overflow-x-hidden">
        <div
          className={cn(
            "col-start-1 row-start-1 transition-all ease-out motion-reduce:transition-none motion-reduce:delay-0 motion-reduce:duration-0",
            mode === "all" ? "translate-x-0 opacity-100 delay-200 duration-500" : "pointer-events-none translate-x-6 opacity-0 delay-0 duration-150"
          )}
          aria-hidden={mode !== "all"}
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon="Package"
              title="No items here"
              description={query ? "No items match your search." : "This space doesn't have any items yet."}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <ItemGridCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "col-start-1 row-start-1 transition-all ease-out motion-reduce:transition-none motion-reduce:delay-0 motion-reduce:duration-0",
            mode === "add" ? "translate-x-0 opacity-100 delay-200 duration-500" : "pointer-events-none -translate-x-6 opacity-0 delay-0 duration-150"
          )}
          aria-hidden={mode !== "add"}
        >
          <div className="max-w-lg rounded-2xl border bg-card p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">Tell us what it is and exactly where you&apos;re keeping it.</p>
            <div className="mt-4">
              <ItemForm action={createItem} initialLocation={{ homeId }} submitLabel="Save Item" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
