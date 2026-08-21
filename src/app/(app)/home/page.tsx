import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView } from "@/lib/home-data";
import { expiryStatus } from "@/lib/expiry";
import { getIcon } from "@/lib/icon-map";
import { listMyHouseholds } from "@/lib/actions/household";
import { getExpenseStats } from "@/lib/actions/expenses";
import { getHouseholdSummary } from "@/lib/actions/household-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddRoomDialog } from "@/components/home/add-room-dialog";
import { HomeActionsMenu } from "@/components/home/home-actions-menu";
import { NewHomeSetup } from "@/components/home/new-home-setup";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { ListRow } from "@/components/layout/list-row";
import { StatChip } from "@/components/layout/stat-chip";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");
  const { data: homes } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true });

  if (!homes || homes.length === 0) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-3xl p-4 md:p-8">
          <NewHomeSetup />
        </div>
      </div>
    );
  }

  const homeId = id && homes.some((h) => h.id === id) ? id : homes[0].id;
  const data = await getHomeItemsView(supabase, homeId);
  if (!data) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-3xl p-4 md:p-8">
          <EmptyState icon="Home" title="Couldn't load this home" description="Something went wrong loading this home's data. Please try again." />
        </div>
      </div>
    );
  }

  const { home, rooms, items, totals } = data;

  const memberships = await listMyHouseholds();
  const primaryHousehold = memberships[0];
  const [stats, householdSummary] = primaryHousehold
    ? await Promise.all([getExpenseStats(primaryHousehold.household.id), getHouseholdSummary(primaryHousehold.household.id)])
    : [null, null];

  const statuses = items.map((item) => expiryStatus(item.expiry_date));
  const expiredItems = items.filter((_, i) => statuses[i].level === "expired");
  const soonItems = items.filter((_, i) => statuses[i].level === "soon");
  const fineCount = totals.items - expiredItems.length - soonItems.length;
  const needsLookCount = expiredItems.length + soonItems.length;
  const inGoodOrderPct = totals.items > 0 ? Math.round((fineCount / totals.items) * 100) : 100;
  const attention = [...expiredItems, ...soonItems].slice(0, 3);
  const mostUsedRoomId = rooms.length > 0 ? rooms.reduce((a, b) => (b.itemCount > a.itemCount ? b : a)).id : null;

  return (
    <div>
      <MobileBand
        title="My Home"
        right={
          <RoundIconButton href="/alerts" ariaLabel="Alerts">
            <Bell className="size-4.5" />
          </RoundIconButton>
        }
        stats={[
          { label: "Items filed", value: totals.items },
          { label: "Needs a look", value: needsLookCount, tone: needsLookCount > 0 ? "destructive" : "default" },
        ]}
      />
      <DesktopBand
        breadcrumb={`My Home · ${home.name}`}
        title={`${totals.items} items, ${totals.rooms} room${totals.rooms === 1 ? "" : "s"}`}
        subtitle={
          <>
            {expiredItems.length > 0 ? `${expiredItems.length} expired, ` : ""}
            {soonItems.length} expiring inside the week
            {stats ? ` · ${inr(stats.totalThisMonth)} spent this month` : ""}
          </>
        }
        action={
          <div className="flex items-center gap-2">
            <HomeActionsMenu homeId={homeId} homeName={home.name} roomCount={rooms.length} />
            <Link href="/items/new" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">
              + Add Item
            </Link>
          </div>
        }
      />

      {homes.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5 px-4 md:px-8">
          {homes.map((h) => (
            <Link key={h.id} href={`/home?id=${h.id}`}>
              <Badge variant={h.id === homeId ? "default" : "outline"}>{h.name}</Badge>
            </Link>
          ))}
        </div>
      )}

      <MobileHeroOverlap className="space-y-4 pb-6">
        <Card className="p-5">
          <p className="font-heading text-xl leading-tight text-foreground">
            {needsLookCount > 0 ? `${needsLookCount} thing${needsLookCount === 1 ? "" : "s"} want a look today.` : "Everything looks in order."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {expiredItems.length > 0 ? `${expiredItems.length} expired, ` : ""}
            {soonItems.length} expiring inside the week.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatChip label="Expired" value={expiredItems.length} tone="destructive" />
            <StatChip label="Soon" value={soonItems.length} />
            <StatChip label="Fine" value={fineCount} />
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${inGoodOrderPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground uppercase">{inGoodOrderPct}% of the {home.name.toLowerCase()} is in good order</p>
        </Card>

        {rooms.length === 0 ? (
          <EmptyState
            icon="DoorOpen"
            title="No rooms yet"
            description="Add your first room to start mapping out this home."
            action={<AddRoomDialog homeId={homeId} />}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between px-1">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Rooms {rooms.length}</p>
              <Link href="/items" className="text-sm font-medium text-primary">
                See all
              </Link>
            </div>
            <div className="mt-2 space-y-2">
              {rooms.map((r) => {
                const RoomIcon = getIcon(r.icon);
                return (
                  <ListRow
                    key={r.id}
                    href={`/home/rooms/${r.id}`}
                    icon={<RoomIcon className="size-4.5" />}
                    title={r.name}
                    subtitle={`${r.itemCount} items · ${r.placeCount} places`}
                    trailing={r.id === mostUsedRoomId ? <Badge variant="secondary">Most used</Badge> : undefined}
                  />
                );
              })}
            </div>
          </div>
        )}

        {attention.length > 0 && (
          <div>
            <p className="px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Needs attention</p>
            <div className="mt-2 space-y-2">
              {attention.map((item) => {
                const status = expiryStatus(item.expiry_date);
                return (
                  <ListRow
                    key={item.id}
                    href={`/items/${item.id}`}
                    title={item.name}
                    subtitle={`${item.roomName} → ${item.furnitureName}`}
                    trailing={<Badge variant={status.level === "expired" ? "destructive" : "outline"}>{status.label}</Badge>}
                  />
                );
              })}
            </div>
          </div>
        )}

        {householdSummary && householdSummary.activity.length > 0 && (
          <Card className="bg-secondary p-5 text-secondary-foreground">
            <p className="font-mono text-xs font-medium tracking-[0.14em] uppercase opacity-80">Household activity</p>
            <div className="mt-3 space-y-3">
              {householdSummary.activity.slice(0, 3).map((a) => (
                <div key={a.id}>
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs opacity-70">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Rooms</p>
            <Link href="/items" className="text-sm font-medium text-primary">
              Manage places
            </Link>
          </div>
          {rooms.length === 0 ? (
            <EmptyState
              icon="DoorOpen"
              title="No rooms yet"
              description="Add your first room to start mapping out this home."
              action={<AddRoomDialog homeId={homeId} />}
            />
          ) : (
            <div className="space-y-2">
              {rooms.map((r) => {
                const RoomIcon = getIcon(r.icon);
                return (
                  <ListRow
                    key={r.id}
                    href={`/home/rooms/${r.id}`}
                    icon={<RoomIcon className="size-4.5" />}
                    title={r.name}
                    subtitle={`${r.itemCount} items · ${r.placeCount} places`}
                    trailing={r.id === mostUsedRoomId ? <Badge variant="secondary">Most used</Badge> : undefined}
                  />
                );
              })}
            </div>
          )}

          {householdSummary && householdSummary.activity.length > 0 && (
            <Card className="bg-secondary p-5 text-secondary-foreground">
              <p className="font-mono text-xs font-medium tracking-[0.14em] uppercase opacity-80">Household activity</p>
              <div className="mt-3 space-y-3">
                {householdSummary.activity.slice(0, 4).map((a) => (
                  <div key={a.id}>
                    <p className="text-sm font-medium">{a.message}</p>
                    <p className="text-xs opacity-70">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <p className="font-heading text-2xl leading-tight text-foreground">
              {needsLookCount > 0 ? `${needsLookCount} thing${needsLookCount === 1 ? "" : "s"} want a look` : "All in order"}
            </p>
            {stats && <p className="font-heading text-2xl text-foreground">{inr(stats.totalThisMonth)}</p>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {expiredItems.length > 0 ? `${expiredItems.length} expired, ` : ""}
            {soonItems.length} expiring inside the week
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatChip label="Expired" value={expiredItems.length} tone="destructive" />
            <StatChip label="Soon" value={soonItems.length} />
            <StatChip label="Fine" value={fineCount} />
            <StatChip label="Spent" value={stats ? inr(stats.totalThisMonth) : "—"} />
          </div>

          {attention.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Expiring soon</p>
              <div className="mt-2 space-y-2">
                {attention.map((item) => {
                  const status = expiryStatus(item.expiry_date);
                  return (
                    <ListRow
                      key={item.id}
                      href={`/items/${item.id}`}
                      title={item.name}
                      subtitle={`${item.roomName} → ${item.furnitureName}`}
                      trailing={<Badge variant={status.level === "expired" ? "destructive" : "outline"}>{status.label}</Badge>}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase">
              <span>Order of the flat</span>
              <span>{inGoodOrderPct}% filed and in date</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-secondary" style={{ width: `${inGoodOrderPct}%` }} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
