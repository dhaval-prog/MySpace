"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PiggyBank, Target, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/vault", label: "Piggy", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/split", label: "Split", icon: Receipt },
];

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, TABS.findIndex((tab) => pathname.startsWith(tab.href)));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-3 mb-3 flex items-center rounded-full border border-white/80 bg-white/70 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_10px_30px_rgba(11,11,20,0.1)] backdrop-blur-xl md:hidden">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-primary/10 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `calc((100% - 8px) / ${TABS.length})`, transform: `translateX(${activeIndex * 100}%)` }}
      />
      {TABS.map((tab, i) => (
        <BottomNavLink key={tab.href} tab={tab} active={i === activeIndex} />
      ))}
    </nav>
  );
}

function BottomNavLink({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={cn(
        "relative z-10 flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {/* Remounting on `active` (via key) restarts the pop animation each time this tab becomes active, instead of only once ever. */}
      <Icon key={active ? "active" : "inactive"} className={cn("size-5", active && "nav-icon-pop")} />
      {tab.label}
    </Link>
  );
}
