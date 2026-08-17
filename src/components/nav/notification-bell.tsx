"use client";

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Notifications"
            className="hidden size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground md:flex"
          >
            <Bell className="size-4.5" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        {/* Menu.GroupLabel (DropdownMenuLabel) requires a Menu.Group ancestor to register its
            label id — used bare, Base UI throws error #31 the instant the menu opens. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>
        <p className="px-2 pb-2 text-sm text-muted-foreground">You&apos;re all caught up — nothing new yet.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
