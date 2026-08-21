import { redirect } from "next/navigation";
import { AlertTriangle, Clock, CalendarClock, Wallet, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyHouseholds } from "@/lib/actions/household";
import { listGoals } from "@/lib/actions/household-goals";
import { listNotifications, type ExpiryNotification } from "@/lib/actions/notifications";
import { MarkAllReadButton } from "@/components/nav/mark-all-read-button";
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
  read: boolean;
}

const KIND_ICON: Record<ExpiryNotification["kind"], typeof AlertTriangle> = {
  expired: AlertTriangle,
  "1day": Clock,
  "7day": CalendarClock,
};

function expiryAlert(n: ExpiryNotification): Alert {
  const title =
    n.kind === "expired" ? `${n.itemName} expired today` : n.kind === "1day" ? `${n.itemName} expires tomorrow` : `${n.itemName} expires soon`;
  const Icon = KIND_ICON[n.kind];
  return {
    id: n.id,
    icon: <Icon className="size-4.5" />,
    title,
    subtitle: `${n.roomName} → ${n.furnitureName}`,
    href: `/items/${n.itemId}`,
    urgent: n.kind === "expired",
    badge: n.kind === "expired" ? "Expired" : n.kind === "1day" ? "Tomorrow" : "This week",
    read: !!n.readAt,
  };
}

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const [notifications, memberships] = await Promise.all([listNotifications(), listMyHouseholds()]);
  const primaryHousehold = memberships[0];
  const goals = primaryHousehold ? await listGoals(primaryHousehold.household.id, { status: "active" }) : [];

  const today: Alert[] = [];
  const tomorrow: Alert[] = [];
  const thisWeek: Alert[] = [];

  for (const n of notifications) {
    const alert = expiryAlert(n);
    if (n.kind === "expired") today.push(alert);
    else if (n.kind === "1day") tomorrow.push(alert);
    else thisWeek.push(alert);
  }

  for (const g of goals) {
    if (g.goal.goal_type === "spending" && g.progressPct >= 90) {
      thisWeek.push({
        id: `budget-${g.goal.id}`,
        icon: <Wallet className="size-4.5" />,
        title: `${g.goal.name} budget nearly used up`,
        subtitle: `${g.progressPct}% of ₹${g.goal.target_amount.toLocaleString("en-IN")} spent`,
        href: "/expenses",
        urgent: g.progressPct >= 100,
        badge: `${g.progressPct}%`,
        read: true,
      });
    } else if (g.goal.goal_type === "saving" && g.progressPct >= 50) {
      thisWeek.push({
        id: `goal-${g.goal.id}`,
        icon: <Target className="size-4.5" />,
        title: `${g.goal.name} crossed ${g.progressPct}%`,
        subtitle: `₹${g.currentAmount.toLocaleString("en-IN")} of ₹${g.goal.target_amount.toLocaleString("en-IN")}`,
        href: "/goals",
        urgent: false,
        badge: `${g.progressPct}%`,
        read: true,
      });
    }
  }

  const total = today.length + tomorrow.length + thisWeek.length;
  const unread = notifications.filter((n) => !n.readAt).length;
  const groups = [
    { title: "Today", alerts: today },
    { title: "Tomorrow", alerts: tomorrow },
    { title: "This Week", alerts: thisWeek },
  ].filter((g) => g.alerts.length > 0);

  return (
    <div>
      <MobileBand
        title="Alerts"
        backHref="/home"
        stats={[
          { label: "Needs you today", value: today.length, tone: today.length > 0 ? "destructive" : "default" },
          { label: "This week", value: tomorrow.length + thisWeek.length },
        ]}
      />
      <DesktopBand
        breadcrumb="Notifications"
        title={total > 0 ? `${total} thing${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} your attention` : "You're all caught up"}
        subtitle={`${total} alert${total === 1 ? "" : "s"} · grouped by when they matter`}
        action={unread > 0 ? <MarkAllReadButton /> : undefined}
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        {unread > 0 && (
          <div className="flex justify-end">
            <MarkAllReadButton />
          </div>
        )}
        {groups.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">You&apos;re all caught up — nothing new yet.</p>
          </Card>
        ) : (
          groups.map((g) => <AlertGroup key={g.title} title={g.title} alerts={g.alerts} />)
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-3">
        {groups.length === 0 ? (
          <Card className="col-span-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">You&apos;re all caught up — nothing new yet.</p>
          </Card>
        ) : (
          groups.map((g) => (
            <div key={g.title} className="space-y-3">
              <AlertGroup title={g.title} alerts={g.alerts} />
            </div>
          ))
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
            title={<span className={a.read ? "font-normal text-foreground/75" : undefined}>{a.title}</span>}
            subtitle={a.subtitle}
            trailing={<Badge variant={a.urgent ? "destructive" : "outline"}>{a.badge}</Badge>}
          />
        ))}
      </div>
    </div>
  );
}
