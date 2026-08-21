"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Package, Target, Wallet, Receipt, PiggyBank, Users, Lock, type LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/nav/nav-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMenu } from "@/components/nav/user-menu";
import { NotificationBell } from "@/components/nav/notification-bell";
import { SignInPromptDialog } from "@/components/nav/sign-in-prompt-dialog";
import type { ExpiryNotification } from "@/lib/actions/notifications";

const ICONS: Record<string, LucideIcon> = {
  Home,
  Search,
  Package,
  Target,
  Wallet,
  Receipt,
  PiggyBank,
  Users,
};

export function Sidebar({
  name,
  email,
  householdName,
  isGuest = false,
  notifications = [],
}: {
  name: string;
  email: string;
  householdName?: string | null;
  isGuest?: boolean;
  notifications?: ExpiryNotification[];
}) {
  const pathname = usePathname();
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 shrink-0 flex-col gap-5 bg-sidebar px-4 py-5 text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Home className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">My Space</p>
          <p className="truncate text-[11px] text-sidebar-foreground/80">Everything in one place</p>
        </div>
        <NotificationBell notifications={notifications} className="size-8 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white" />
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const locked = isGuest && item.href !== "/split";

          if (locked) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setPromptOpen(true)}
                className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium text-sidebar-foreground/35 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/60"
              >
                <Icon className="size-4" />
                {item.label}
                <Lock className="ml-auto size-3.5" />
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <UserMenu
        name={name}
        email={email}
        isGuest={isGuest}
        trigger={
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-2xl bg-sidebar-accent/40 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/60"
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">{initials(name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-white">{name}</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/70">{householdName || (isGuest ? "Guest" : email)}</span>
            </span>
          </button>
        }
      />

      <SignInPromptDialog open={promptOpen} onOpenChange={setPromptOpen} />
    </aside>
  );
}
