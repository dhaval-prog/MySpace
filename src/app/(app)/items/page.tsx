import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getItemsWithPaths } from "@/lib/items-data";
import { ItemList } from "@/components/items/item-list";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";

export default async function AllItemsPage() {
  const supabase = await createClient();
  const results = await getItemsWithPaths(supabase);

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
        title={`${results.length} item${results.length === 1 ? "" : "s"} filed`}
        subtitle="Everything across your home, searchable by name or place."
        action={
          <Link href="/items/new" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">
            + Add Item
          </Link>
        }
      />

      <MobileHeroOverlap className="pb-6">
        {results.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nothing stored here yet.</p>
          </Card>
        ) : (
          <ItemList results={results} />
        )}
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        {results.length === 0 ? (
          <EmptyState icon="Package" title="No items yet" description="Nothing stored here yet." />
        ) : (
          <div className="max-w-3xl">
            <ItemList results={results} />
          </div>
        )}
      </div>
    </div>
  );
}
