"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemGridCard } from "@/components/home/item-grid-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { RoomFilter, HomeItemsView } from "@/lib/home-data";

export function HomeItemsBrowser({ rooms, items }: { rooms: RoomFilter[]; items: HomeItemsView["items"] }) {
  const [roomId, setRoomId] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRoomId("all")}
          className={cn(
            "flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
            roomId === "all" ? "bg-primary text-primary-foreground" : "border bg-card text-foreground"
          )}
        >
          All
          <span className={cn("font-mono text-[11px]", roomId === "all" ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {items.length}
          </span>
        </button>
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRoomId(r.id)}
            className={cn(
              "flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
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

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search in ${activeRoomName ?? "My Home"}...`}
          className="h-11 w-full rounded-2xl border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

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
  );
}
