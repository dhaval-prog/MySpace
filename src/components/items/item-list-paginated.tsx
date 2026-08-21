"use client";

import { useState, useTransition } from "react";
import { ItemList } from "@/components/items/item-list";
import { Button } from "@/components/ui/button";
import { loadMoreItems } from "@/lib/actions/items";
import type { ItemsPage } from "@/lib/items-data";

/** All Items, loaded a page at a time — see getItemsWithPaths for why. */
export function ItemListPaginated({ initial }: { initial: ItemsPage }) {
  const [results, setResults] = useState(initial.results);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <ItemList results={results} />
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const next = await loadMoreItems(results.length);
                setResults((prev) => [...prev, ...next.results]);
                setHasMore(next.hasMore);
              })
            }
          >
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
