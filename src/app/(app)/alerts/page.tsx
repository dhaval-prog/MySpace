import { redirect } from "next/navigation";
import { AlertTriangle, Clock, Wallet, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHomeItemsView } from "@/lib/home-data";
import { expiryStatus } from "@/lib/expiry";
import { listMyHouseholds } from "@/lib/actions/household";
import { listGoals } from "@/lib/actions/household-goals";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";
import { ListRow } from "@/components/layout/list-row";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  urgent: boolean;
  badge: string;
}

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const { data: homes } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true });
  const homeId = id && homes?.some((h) => h.id === id) ? id : homes?.[0]?.id;
  const data = homeId ? await getHomeItemsView(supabase, homeId) : null;

  const memberships = await listMyHouseholds();
  const primaryHousehold = memberships[0];
  const goals = primaryHousehold ? await listGoals(primaryHousehold.household.id, { status: "active" }) : [];

  const alerts: Alert[] = [];

  for (const item of data?.items ?? []) {
    const status = expiryStatus(item.expiry_date);
    if (status.level === "expired") {
      alerts.push({
        id: `item-${item.id}`,
        icon: <AlertTriangle className="size-4.5" />,
        title: `${item.name} has expired`,
        subtitle: `${item.roomName} → ${item.furnitureName}`,
        href: `/items/${item.id}`,
        urgent: true,
        badge: "Expired",
      });
    } else if (status.level === "soon") {
      alerts.push({
        id: `item-${item.id}`,
        icon: <Clock className="size-4.5" />,
        title: `${item.name} ${status.label.toLowerCase()}`,
        subtitle: `${item.roomName} → ${item.furnitureName}`,
        href: `/items/${item.id}`,
        urgent: false,
        badge: status.label,
      });
    }
  }

  for (const g of goals) {
    if (g.goal.goal_type === "spending" && g.progressPct >= 90) {
      alerts.push({
        id: `budget-${g.goal.id}`,
        icon: <Wallet className="size-4.5" />,
        title: `${g.goal.name} budget nearly used up`,
        subtitle: `${g.progressPct}% of ${g.goal.target_amount.toLocaleString("en-IN")} spent`,
        href: "/expenses",
        urgent: g.progressPct >= 100,
        badge: `${g.progressPct}%`,
      });
    } else if (g.goal.goal_type === "saving" && g.progressPct >= 50) {
      alerts.push({
        id: `goal-${g.goal.id}`,
        icon: <Target className="size-4.5" />,
        title: `${g.goal.name} crossed ${g.progressPct}%`,
        subtitle: `₹${g.currentAmount.toLocaleString("en-IN")} of ₹${g.goal.target_amount.toLocaleString("en-IN")}`,
        href: "/goals",
        urgent: false,
        badge: `${g.progressPct}%`,
      });
    }
  }

  const today = alerts.filter((a) => a.urgent);
  const thisWeek = alerts.filter((a) => !a.urgent);

  return (
    <div>
      <MobileBand
        title="Alerts"
        backHref="/home"
        stats={[
          { label: "Needs you today", value: today.length, tone: today.length > 0 ? "destructive" : "default" },
          { label: "This week", value: thisWeek.length },
        ]}
      />
      <DesktopBand
        breadcrumb="Notifications · Andheri Flat"
        title={alerts.length > 0 ? `${alerts.length} thing${alerts.length === 1 ? "" : "s"} need${alerts.length === 1 ? "s" : ""} you today` : "You're all caught up"}
        subtitle={`${alerts.length} alert${alerts.length === 1 ? "" : "s"} this week · grouped by when they matter`}
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        {alerts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">You&apos;re all caught up — nothing new yet.</p>
          </Card>
        ) : (
          <>
            {today.length > 0 && <AlertGroup title="Today" alerts={today} />}
            {thisWeek.length > 0 && <AlertGroup title="This week" alerts={thisWeek} />}
          </>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-2">
        {alerts.length === 0 ? (
          <Card className="col-span-2 p-8 text-center">
            <p className="text-sm text-muted-foreground">You&apos;re all caught up — nothing new yet.</p>
          </Card>
        ) : (
          <>
            <div className="space-y-3">{today.length > 0 && <AlertGroup title="Today" alerts={today} />}</div>
            <div className="space-y-3">{thisWeek.length > 0 && <AlertGroup title="This week" alerts={thisWeek} />}</div>
          </>
        )}
      </div>
    </div>
  );
}

function AlertGroup({ title, alerts }: { title: string; alerts: Alert[] }) {
  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{title}</p>
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">{alerts.length}</span>
      </div>
      <div className="mt-2 space-y-2">
        {alerts.map((a) => (
          <ListRow
            key={a.id}
            href={a.href}
            icon={a.icon}
            iconClassName={a.urgent ? "bg-blush-tint text-destructive" : undefined}
            title={a.title}
            subtitle={a.subtitle}
            trailing={<Badge variant={a.urgent ? "destructive" : "outline"}>{a.badge}</Badge>}
          />
        ))}
      </div>
    </div>
  );
}
