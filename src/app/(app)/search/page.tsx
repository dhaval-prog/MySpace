import { redirect } from "next/navigation";
import { Mic, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView } from "@/lib/home-data";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { SearchWorkspace } from "@/components/home/search-workspace";
import { EmptyState } from "@/components/shared/empty-state";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const { data: homes } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true });
  if (!homes || homes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <EmptyState icon="Search" title="Nothing to search yet" description="Set up your home first, then everything you file becomes searchable here." />
      </div>
    );
  }

  const homeId = id && homes.some((h) => h.id === id) ? id : homes[0].id;
  const data = await getHomeItemsView(supabase, homeId);
  const items = data?.items ?? [];

  return (
    <div>
      <MobileBand
        title="Search"
        backHref="/home"
        right={
          <RoundIconButton href="/settings" ariaLabel="Profile">
            <User className="size-4.5" />
          </RoundIconButton>
        }
      />
      <DesktopBand
        breadcrumb={`Search · ${data?.home.name ?? "Home"}`}
        title="Say it or type it — the answer comes back as a place, not a list"
        action={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">
            <Mic className="size-3.5" />
            Voice search
          </button>
        }
      />

      <MobileHeroOverlap className="pb-6">
        <SearchWorkspace items={items} totalItems={items.length} />
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        <div className="max-w-2xl">
          <SearchWorkspace items={items} totalItems={items.length} />
        </div>
      </div>
    </div>
  );
}
