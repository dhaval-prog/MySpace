import Link from "next/link";
import { expiryStatus } from "@/lib/expiry";
import type { HomeItemsView } from "@/lib/home-data";

/**
 * A lightweight horizontal-scroll strip (native overflow-x + snap, no drag
 * library) of items expiring within the week — reuses the same white-row
 * visual language as the rest of My Home instead of introducing a new card
 * style. Renders nothing when there's nothing expiring soon, per spec: an
 * empty "Expiring Soon" section is worse than no section at all.
 */
export function ExpiringSoonSlider({ items }: { items: HomeItemsView["items"] }) {
  const soon = items
    .map((item) => ({ item, status: expiryStatus(item.expiry_date) }))
    .filter((x) => x.status.level === "soon")
    .sort((a, b) => a.status.label.localeCompare(b.status.label));

  if (soon.length === 0) return null;

  return (
    <div>
      <p className="px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Expiring Soon</p>
      <div className="mt-2 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-0 md:px-0 md:[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:hidden">
        {soon.map(({ item, status }) => (
          <Link
            key={item.id}
            href={`/items/${item.id}`}
            className="w-[72%] shrink-0 snap-start rounded-2xl bg-white p-4 transition-colors hover:bg-muted/60 sm:w-[45%] md:w-[calc((100%-1.5rem)/3)]"
          >
            <p className="truncate font-medium text-foreground">{item.name}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {item.roomName} → {item.furnitureName}
            </p>
            <p className="mt-2 text-xs font-medium text-destructive">{status.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
