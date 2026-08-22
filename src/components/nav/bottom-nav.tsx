"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Wallet, Receipt, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInPromptDialog } from "@/components/nav/sign-in-prompt-dialog";
import { AddFurnitureDialog } from "@/components/home/add-furniture-dialog";
import { getQuickAddContext, type QuickAddContext } from "@/lib/actions/quick-add";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/items", label: "Items", icon: Package },
];

const TABS_RIGHT = [
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/split", label: "Split", icon: Receipt },
];

const QUICK_ADD_BUTTON_CLASS =
  "-mt-6 flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(211,50,67,0.35)] transition-transform active:scale-95";

export function BottomNav({ isGuest = false }: { isGuest?: boolean }) {
  const pathname = usePathname();
  const [promptOpen, setPromptOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState<QuickAddContext>({ kind: "default" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuickAdd({ kind: "default" });
    getQuickAddContext(pathname).then(setQuickAdd);
  }, [pathname]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-white px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] md:hidden">
        {TABS.map((tab) => (
          <BottomNavTab key={tab.href} tab={tab} active={pathname.startsWith(tab.href)} locked={isGuest} onLocked={() => setPromptOpen(true)} />
        ))}

        <QuickAddButton context={quickAdd} />

        {TABS_RIGHT.map((tab) => (
          <BottomNavTab key={tab.href} tab={tab} active={pathname.startsWith(tab.href)} locked={isGuest && tab.href !== "/split"} onLocked={() => setPromptOpen(true)} />
        ))}
      </nav>

      <SignInPromptDialog open={promptOpen} onOpenChange={setPromptOpen} />
    </>
  );
}

/** The nav's central "+" — what it adds depends on the page underneath it (see getQuickAddContext): a Place on a Room page, an Item on a Place page, and a Place on the item's own Room when there's nothing further to drill into. Anywhere else, it falls back to the generic Add Item flow. */
function QuickAddButton({ context }: { context: QuickAddContext }) {
  if (context.kind === "place") {
    return (
      <AddFurnitureDialog
        roomId={context.roomId}
        roomType={context.roomType}
        roomName={context.roomName}
        trigger={
          <button type="button" aria-label={`Add to ${context.roomName}`} className={QUICK_ADD_BUTTON_CLASS}>
            <Plus className="size-6" />
          </button>
        }
      />
    );
  }

  if (context.kind === "item") {
    return (
      <Link
        href={`/items/new?roomId=${context.roomId}&furnitureId=${context.furnitureId}&homeId=${context.homeId}`}
        aria-label="Add item"
        className={QUICK_ADD_BUTTON_CLASS}
      >
        <Plus className="size-6" />
      </Link>
    );
  }

  return (
    <Link href="/items/new" aria-label="Add item" className={QUICK_ADD_BUTTON_CLASS}>
      <Plus className="size-6" />
    </Link>
  );
}

function BottomNavTab({
  tab,
  active,
  locked,
  onLocked,
}: {
  tab: { href: string; label: string; icon: typeof Home };
  active: boolean;
  locked: boolean;
  onLocked: () => void;
}) {
  const Icon = tab.icon;

  if (locked) {
    return (
      <button type="button" onClick={onLocked} className="flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground/40">
        <span className="relative">
          <Icon className="size-5" />
          <Lock className="absolute -top-1 -right-1.5 size-2.5" />
        </span>
        {tab.label}
      </button>
    );
  }

  return (
    <Link
      href={tab.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon key={active ? "active" : "inactive"} className={cn("size-5", active && "nav-icon-pop")} />
      {tab.label}
    </Link>
  );
}
