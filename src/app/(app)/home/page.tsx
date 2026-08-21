import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView } from "@/lib/home-data";
import type { HomeItemsView } from "@/lib/home-data";
import { expiryStatus, isUrgentExpiry, expiryBadgeLabel } from "@/lib/expiry";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon } from "@/lib/constants";
import { cn, capitalize, spellSmallNumber } from "@/lib/utils";
import { listMyHouseholds } from "@/lib/actions/household";
import { getExpenseStats } from "@/lib/actions/expenses";
import { getHouseholdSummary } from "@/lib/actions/household-dashboard";
import { listNotifications } from "@/lib/actions/notifications";
import { Card } from "@/components/ui/card";
import { HomeActionsMenu } from "@/components/home/home-actions-menu";
import { NewHomeSetup } from "@/components/home/new-home-setup";
import { RoomsSearchPanel } from "@/components/home/rooms-search-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationBell } from "@/components/nav/notification-bell";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";
import { ListRow } from "@/components/layout/list-row";
import { StatChip } from "@/components/layout/stat-chip";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** The "EXPIRING SOON" rows inside the Needs Attention card — a colored
 * category icon (urgency-tinted) plus a compact day-count badge. Shared
 * between the mobile hero card and the desktop attention card so the two
 * breakpoints never drift apart. */
function ExpiringSoonList({ items }: { items: HomeItemsView["items"] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Expiring soon</p>
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((item) => {
          const status = expiryStatus(item.expiry_date);
          const urgent = status.level === "expired" || isUrgentExpiry(item.expiry_date);
          const ItemIcon = getIcon(categoryIcon(item.category));
          return (
            <ListRow
              key={item.id}
              href={`/items/${item.id}`}
              icon={<ItemIcon className="size-4.5" />}
              iconClassName={cn("rounded-full", urgent ? "bg-blush-tint text-destructive" : "bg-accent text-accent-foreground")}
              title={item.name}
              subtitle={`${item.roomName} → ${item.furnitureName}`}
              trailing={
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase",
                    urgent ? "bg-blush-tint text-destructive" : "bg-positive/10 text-positive"
                  )}
                >
                  {expiryBadgeLabel(item.expiry_date)}
                </span>
              }
            />
          );
        })}
      </div>
    </div>
  );
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
  const [stats, householdSummary, notifications] = await Promise.all([
    primaryHousehold ? getExpenseStats(primaryHousehold.household.id) : Promise.resolve(null),
    primaryHousehold ? getHouseholdSummary(primaryHousehold.household.id) : Promise.resolve(null),
    listNotifications(),
  ]);

  const statuses = items.map((item) => expiryStatus(item.expiry_date));
  const expiredItems = items.filter((_, i) => statuses[i].level === "expired");
  const soonItems = items.filter((_, i) => statuses[i].level === "soon");
  const fineCount = totals.items - expiredItems.length - soonItems.length;
  const needsLookCount = expiredItems.length + soonItems.length;
  const inGoodOrderPct = totals.items > 0 ? Math.round((fineCount / totals.items) * 100) : 100;
  const attention = [...expiredItems, ...soonItems].slice(0, 3);
  const mostUsedRoom = rooms.length > 0 ? rooms.reduce((a, b) => (b.itemCount > a.itemCount ? b : a)) : null;
  const mostUsedRoomId = mostUsedRoom?.id ?? null;
  const mostUsedPct = mostUsedRoom && totals.items > 0 ? Math.round((mostUsedRoom.itemCount / totals.items) * 100) : 0;

  // Prose sentences spell out small counts ("four rooms", "one expired") and
  // keep larger totals as numerals, matching the My Home reference copy.
  const attentionSentence = capitalize(
    `${expiredItems.length > 0 ? `${spellSmallNumber(expiredItems.length)} expired, ` : ""}${spellSmallNumber(soonItems.length)} expiring inside the week`
  );
  const headlineWords =
    needsLookCount > 0 ? `${capitalize(spellSmallNumber(needsLookCount))} thing${needsLookCount === 1 ? "" : "s"} want a look` : null;

  return (
    <div>
      <MobileBand
        title="My Home"
        right={<NotificationBell notifications={notifications} className="bg-white/70 hover:bg-white/90" />}
        stats={[
          { label: "Items filed", value: totals.items },
          { label: "Needs a look", value: needsLookCount, tone: needsLookCount > 0 ? "destructive" : "default" },
        ]}
      />
      <DesktopBand
        breadcrumb={`My Home · ${home.name}`}
        title={`${totals.items} items, ${spellSmallNumber(totals.rooms)} room${totals.rooms === 1 ? "" : "s"}`}
        subtitle={`${attentionSentence}${stats ? ` · ${inr(stats.totalThisMonth)} spent this month` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <HomeActionsMenu homeId={homeId} homeName={home.name} roomCount={rooms.length} />
            <Link href={`/items/new?homeId=${homeId}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">
              + Add Item
            </Link>
          </div>
        }
      />

      {homes.length > 1 && (
        <div className="mt-3 hidden px-8 md:block">
          <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
            {homes.map((h) => (
              <Link
                key={h.id}
                href={`/home?id=${h.id}`}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  h.id === homeId ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {h.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between px-5 md:hidden">
        {homes.length > 1 ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
            {homes.map((h) => (
              <Link
                key={h.id}
                href={`/home?id=${h.id}`}
                className={cn(
                  "rounded-full px-3.5 py-1 text-sm font-medium transition-colors",
                  h.id === homeId ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {h.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{home.name}</p>
        )}
        <p className="shrink-0 text-sm text-muted-foreground">
          {totals.rooms} room{totals.rooms === 1 ? "" : "s"}
        </p>
      </div>

      <MobileHeroOverlap className="mt-3 space-y-4 pb-6">
        <Card className="p-5">
          <p className="font-heading text-xl leading-tight text-foreground">
            {headlineWords ? `${headlineWords} today.` : "Everything looks in order."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{attentionSentence}.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatChip label="Expired" value={expiredItems.length} tone="destructive" />
            <StatChip label="Soon" value={soonItems.length} />
            <StatChip label="Fine" value={fineCount} />
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${inGoodOrderPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground uppercase">{inGoodOrderPct}% of the {home.name.toLowerCase()} is in good order</p>

          <ExpiringSoonList items={attention} />
        </Card>

        <RoomsSearchPanel
          homeId={homeId}
          totalItems={totals.items}
          rooms={rooms}
          mostUsedRoomId={mostUsedRoomId}
          mostUsedPct={mostUsedPct}
          variant="mobile"
        />

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

      <div className="hidden gap-6 px-8 pb-8 md:mt-6 md:grid md:grid-cols-[3fr_7fr]">
        <div className="space-y-4">
          <RoomsSearchPanel
            homeId={homeId}
            totalItems={totals.items}
            rooms={rooms}
            mostUsedRoomId={mostUsedRoomId}
            mostUsedPct={mostUsedPct}
            variant="desktop"
          />

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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Needs attention</p>
            <Link href="/items" className="text-sm font-medium text-primary">
              Today
            </Link>
          </div>
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <p className="font-heading text-2xl leading-tight text-foreground">{headlineWords ?? "All in order"}</p>
              {stats && <p className="font-heading text-2xl text-foreground">{inr(stats.totalThisMonth)}</p>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{attentionSentence}</p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <StatChip label="Expired" value={expiredItems.length} tone="destructive" />
              <StatChip label="Soon" value={soonItems.length} />
              <StatChip label="Fine" value={fineCount} />
              <StatChip label="Spent" value={stats ? inr(stats.totalThisMonth) : "—"} />
            </div>

            <ExpiringSoonList items={attention} />

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
    </div>
  );
}
