import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView } from "@/lib/home-data";
import { DesktopBand } from "@/components/layout/page-band";
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
  const totalItems = data?.totals.items ?? 0;

  return (
    <div>
      <DesktopBand
        breadcrumb={`Search · ${data?.home.name ?? "Home"}`}
        title="Say it or type it — the answer comes back as a place, not a list"
      />

      <div className="pb-6 md:hidden">
        <SearchWorkspace homeId={homeId} totalItems={totalItems} variant="mobile" />
      </div>

      <div className="hidden px-8 pb-8 md:block">
        <div className="max-w-2xl">
          <SearchWorkspace homeId={homeId} totalItems={totalItems} />
        </div>
      </div>
    </div>
  );
}
