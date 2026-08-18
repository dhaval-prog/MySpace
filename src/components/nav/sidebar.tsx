"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldCheck, Target, Receipt, PiggyBank, Crown, User, type LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/nav/nav-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { HouseholdRole } from "@/lib/supabase/types";

const ICONS: Record<string, LucideIcon> = {
  Home,
  ShieldCheck,
  Target,
  Receipt,
  PiggyBank,
};

const ROLE_ICON: Record<HouseholdRole, LucideIcon> = {
  owner: Crown,
  co_owner: ShieldCheck,
  member: User,
  viewer: User,
  limited_member: User,
  split_only: Receipt,
};

const ROLE_LABEL: Record<HouseholdRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  member: "Member",
  viewer: "Viewer",
  limited_member: "Member",
  split_only: "Split only",
};

export interface SidebarMember {
  userId: string;
  name: string;
  role: HouseholdRole;
}

export function Sidebar({ homeName, members = [] }: { homeName?: string; members?: SidebarMember[] }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 shrink-0 flex-col gap-5 border-r border-border bg-card px-4 py-5 shadow-sm md:flex">
      <div className="flex items-center gap-2.5 px-2">
        <img src="/logo-icon.svg" alt="" className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">My Space</p>
          <p className="truncate text-[11px] text-muted-foreground">Everything in one place</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/65 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label === "My Home" && homeName ? homeName : item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {members.length > 0 && (
        <div className="border-t border-border/70 pt-4">
          <p className="px-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Members</p>
          <ul className="mt-3 flex flex-col gap-3 px-2">
            {members.map((m) => {
              const RoleIcon = ROLE_ICON[m.role];
              return (
                <li key={m.userId} className="flex items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{m.name}</span>
                  <RoleIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={ROLE_LABEL[m.role]} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
