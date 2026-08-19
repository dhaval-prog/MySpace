"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PiggyBank, Target, Wallet, Receipt, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInPromptDialog } from "@/components/nav/sign-in-prompt-dialog";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/vault", label: "Piggy", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/split", label: "Split", icon: Receipt },
];

export function BottomNav({ isGuest = false }: { isGuest?: boolean }) {
  const pathname = usePathname();
  const activeIndex = Math.max(0, TABS.findIndex((tab) => pathname.startsWith(tab.href)));
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-3 mb-3 flex items-center rounded-full border border-white/80 bg-white/70 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_10px_30px_rgba(11,11,20,0.1)] backdrop-blur-xl md:hidden">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 rounded-full bg-primary/10 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `calc((100% - 8px) / ${TABS.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {TABS.map((tab, i) => {
          const locked = isGuest && tab.href !== "/split";
          return locked ? (
            <BottomNavLockedTab key={tab.href} tab={tab} onTap={() => setPromptOpen(true)} />
          ) : (
            <BottomNavLink key={tab.href} tab={tab} active={i === activeIndex} />
          );
        })}
      </nav>

      <SignInPromptDialog open={promptOpen} onOpenChange={setPromptOpen} />
    </>
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

function BottomNavLockedTab({ tab, onTap }: { tab: { href: string; label: string; icon: typeof Home }; onTap: () => void }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onTap}
      className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground/40"
    >
      <span className="relative">
        <Icon className="size-5" />
        <Lock className="absolute -top-1 -right-1.5 size-2.5" />
      </span>
      {tab.label}
    </button>
  );
}
