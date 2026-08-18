import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView } from "@/lib/home-data";
import { Badge } from "@/components/ui/badge";
import { HomeItemsBrowser } from "@/components/home/home-items-browser";
import { AddRoomDialog } from "@/components/home/add-room-dialog";
import { AddItemDialog } from "@/components/home/add-item-dialog";
import { RenameHomeDialog } from "@/components/home/rename-home-dialog";
import { DeleteHomeDialog } from "@/components/home/delete-home-dialog";
import { EmptyState } from "@/components/shared/empty-state";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const supabase = await createClient();
  // Middleware + the (app) layout already verified this request's session —
  // see the comment in (app)/layout.tsx. Reading it locally here avoids a
  // third auth network round trip on the app's most-visited page.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");
  const { data: homes } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true });

  if (!homes || homes.length === 0) {
    redirect("/home/new");
  }

  const homeId = id && homes.some((h) => h.id === id) ? id : homes[0].id;
  const data = await getHomeItemsView(supabase, homeId);
  if (!data) redirect("/home/new");

  const { home, rooms, items, totals } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Inventory</p>
          <div className="flex items-center gap-1.5">
            <h1 className="font-heading text-4xl text-foreground md:text-5xl">{home.name}</h1>
            <RenameHomeDialog homeId={homeId} currentName={home.name} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {totals.items} item{totals.items === 1 ? "" : "s"} across {totals.rooms} space{totals.rooms === 1 ? "" : "s"}
          </p>
        </div>
        <AddItemDialog homeId={homeId} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {homes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {homes.map((h) => (
              <Link key={h.id} href={`/home?id=${h.id}`}>
                <Badge variant={h.id === homeId ? "default" : "outline"}>{h.name}</Badge>
              </Link>
            ))}
          </div>
        )}
        <AddRoomDialog homeId={homeId} />
        {homes.length > 1 && <DeleteHomeDialog homeId={homeId} homeName={home.name} roomCount={rooms.length} />}
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          icon="DoorOpen"
          title="No rooms yet"
          description="Add your first room to start mapping out this home."
          action={<AddRoomDialog homeId={homeId} />}
        />
      ) : (
        <HomeItemsBrowser rooms={rooms} items={items} />
      )}
    </div>
  );
}
