"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, CalendarClock, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsRead, markNotificationRead, type ExpiryNotification } from "@/lib/actions/notifications";

const GROUP_FOR_KIND: Record<ExpiryNotification["kind"], "Today" | "Tomorrow" | "This Week"> = {
  expired: "Today",
  "1day": "Tomorrow",
  "7day": "This Week",
};

const KIND_STYLE: Record<ExpiryNotification["kind"], { icon: typeof AlertTriangle; tone: string }> = {
  expired: { icon: AlertTriangle, tone: "bg-blush-tint text-destructive" },
  "1day": { icon: Clock, tone: "bg-accent text-accent-foreground" },
  "7day": { icon: CalendarClock, tone: "bg-muted text-muted-foreground" },
};

function messageFor(n: ExpiryNotification): string {
  if (n.kind === "expired") return `${n.itemName} expired today`;
  if (n.kind === "1day") return `${n.itemName} expires tomorrow`;
  return `${n.itemName} expires soon`;
}

/**
 * Reads-back into src/app/api/notifications/cron/expiry-scan's output —
 * every row here was created by that cron job, deduped at the DB level (see
 * item_expiry_notifications' unique(item_id, kind) constraint), so this
 * component only ever needs to render, mark-read, and link through to the
 * item. Same DropdownMenu primitives and trigger-button shape as UserMenu,
 * so it reads as one native header, not a bolted-on feature.
 */
export function NotificationBell({ notifications, className }: { notifications: ExpiryNotification[]; className?: string }) {
  const [, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.readAt);

  const groups: { title: "Today" | "Tomorrow" | "This Week"; items: ExpiryNotification[] }[] = (["Today", "Tomorrow", "This Week"] as const)
    .map((title) => ({ title, items: notifications.filter((n) => GROUP_FOR_KIND[n.kind] === title) }))
    .filter((g) => g.items.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={unread.length > 0 ? `Notifications, ${unread.length} unread` : "Notifications"}
            className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-black/5", className)}
          >
            <Bell className="size-4.5" />
            {unread.length > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Menu.GroupLabel requires a Menu.Group ancestor to register its label id (see UserMenu) — wrapped the same way here. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          </DropdownMenuGroup>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  markAllNotificationsRead();
                })
              }
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="mx-0" />

        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up — nothing new yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto py-1">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-3 pt-2 pb-1 font-mono text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{group.title}</p>
                {group.items.map((n) => {
                  const { icon: Icon, tone } = KIND_STYLE[n.kind];
                  return (
                    <DropdownMenuItem
                      key={n.id}
                      className="h-auto items-start gap-2.5 px-3 py-2"
                      onClick={() => {
                        if (!n.readAt)
                          startTransition(() => {
                            markNotificationRead(n.id);
                          });
                      }}
                      render={<Link href={`/items/${n.itemId}`} />}
                    >
                      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", tone)}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[13px]", n.readAt ? "font-normal text-foreground/80" : "font-medium text-foreground")}>
                          {messageFor(n)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {n.roomName} → {n.furnitureName}
                        </span>
                      </span>
                      {!n.readAt && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="mx-0" />
        <Link href="/alerts" className="block px-3 py-2.5 text-center text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
