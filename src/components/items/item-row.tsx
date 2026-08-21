import Link from "next/link";
import Image from "next/image";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon, categoryLabel, categoryBadgeClass } from "@/lib/constants";
import type { Item } from "@/lib/supabase/types";
import { relativeDay } from "@/lib/utils";

export function ItemRow({ item }: { item: Item }) {
  const Icon = getIcon(categoryIcon(item.category));

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3.5 rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      {item.photo_url ? (
        <Image
          src={item.photo_url}
          alt={item.name}
          width={46}
          height={46}
          className="size-[46px] shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-2xl bg-muted text-primary">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.container ?? "—"}
          {item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${categoryBadgeClass(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{relativeDay(item.created_at)}</span>
      </div>
    </Link>
  );
}
