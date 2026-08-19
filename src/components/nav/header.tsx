import Link from "next/link";
import { UserMenu } from "@/components/nav/user-menu";
import { NotificationBell } from "@/components/nav/notification-bell";

export function Header({ name, email, isGuest = false }: { name: string; email: string; isGuest?: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card px-4 py-3 md:gap-3 md:py-4 md:pr-6">
      <Link href={isGuest ? "/split" : "/home"} className="flex items-center gap-2 font-semibold md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="My Space" className="size-8 shrink-0" />
      </Link>

      <div className="flex-1" />

      <NotificationBell />

      {/* Mobile-only landing spot for the current page's options menu (Home/Goals/Split),
          portaled in from the page itself — see HeaderActionsPortal. */}
      <div id="header-page-actions" className="flex items-center md:hidden" />

      <UserMenu name={name} email={email} isGuest={isGuest} />
    </header>
  );
}
