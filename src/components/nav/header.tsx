import Link from "next/link";
import { Home, Plus } from "lucide-react";
import { HeaderSearch } from "@/components/search/header-search";
import { UserMenu } from "@/components/nav/user-menu";
import { QuickAddMenu } from "@/components/nav/quick-add-menu";
import { NotificationBell } from "@/components/nav/notification-bell";

export function Header({ name, email }: { name: string; email: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card px-4 py-3 md:gap-3 md:py-4 md:pl-20 md:pr-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Home className="size-4" />
        </span>
      </Link>

      <HeaderSearch className="max-w-md flex-1 md:mx-auto" />

      <NotificationBell />

      <QuickAddMenu
        trigger={
          <button
            aria-label="Quick add"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground md:hidden"
          >
            <Plus className="size-4.5" />
          </button>
        }
      />

      <UserMenu name={name} email={email} />
    </header>
  );
}
