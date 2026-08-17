"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ItemDetailSheet } from "@/components/items/item-detail-sheet";
import { categoryLabel, categoryBadgeClass } from "@/lib/constants";
import { deleteItem } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";

function formatAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ItemGridCard({ item }: { item: Item }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${categoryBadgeClass(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="ghost" className="-mt-1 -mr-1.5 size-7 text-muted-foreground">
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/items/${item.id}/edit`} />}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button type="button" onClick={() => setDetailOpen(true)} className="mt-3 block w-full text-left">
        <p className="truncate font-semibold">{item.name}</p>
        <p className="truncate text-sm text-muted-foreground">{item.container || "—"}</p>
        <div className="mt-3 border-t pt-3">
          <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Added {formatAddedDate(item.created_at)}
          </p>
        </div>
      </button>

      <ItemDetailSheet itemId={item.id} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{item.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => startTransition(() => deleteItem(item.id))}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
