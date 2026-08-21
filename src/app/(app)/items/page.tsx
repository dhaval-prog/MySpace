import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getItemsWithPaths } from "@/lib/items-data";
import { ItemListPaginated } from "@/components/items/item-list-paginated";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileBand, DesktopBand, RoundIconButton } from "@/components/layout/page-band";

export default async function AllItemsPage() {
  const supabase = await createClient();
  const page = await getItemsWithPaths(supabase);

  return (
    <div>
      <MobileBand
        title="Items"
        backHref="/home"
        right={
          <RoundIconButton href="/settings" ariaLabel="Profile">
            <User className="size-4.5" />
          </RoundIconButton>
        }
      />
      <DesktopBand
        breadcrumb="Items · Andheri Flat"
        title={`${page.total} item${page.total === 1 ? "" : "s"} filed`}
        subtitle="Everything across your home, searchable by name or place."
        action={
          <Link href="/items/new" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">
            + Add Item
          </Link>
        }
      />

      {/* A gentler overlap than MobileHeroOverlap's own -mt-9 — this page's
          first content is the bare item list (no hero Card underneath to
          absorb the pull-up), so the full -mt-9 let the band's rounded
          corner cut into the first row. Applied directly (rather than via
          that helper) so the item list itself — data, not just markup —
          renders once and is simply restyled for desktop's wider,
          non-overlapping container, instead of appearing twice in the page. */}
      <div className="relative z-10 -mt-4 px-4 pb-8 md:mt-0 md:px-8">
        {page.total === 0 ? (
          <EmptyState icon="Package" title="No items yet" description="Nothing stored here yet." />
        ) : (
          <div className="md:max-w-3xl">
            <ItemListPaginated initial={page} />
          </div>
        )}
      </div>
    </div>
  );
}
