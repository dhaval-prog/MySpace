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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-3 mb-3 flex items-center justify-around rounded-full border border-white/80 bg-white/70 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_10px_30px_rgba(11,11,20,0.1)] backdrop-blur-xl md:hidden">
      {TABS.map((tab) => (
        <BottomNavLink key={tab.href} tab={tab} active={pathname.startsWith(tab.href)} />
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
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      {tab.label}
    </Link>
  );
}
