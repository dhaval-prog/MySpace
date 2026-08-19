"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Settings, Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignInPromptDialog } from "@/components/nav/sign-in-prompt-dialog";
import { signOut } from "@/lib/actions/auth";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email, isGuest = false }: { name: string; email: string; isGuest?: boolean }) {
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none">
          <Avatar className="size-9 border">
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initials(name || email)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Menu.GroupLabel (DropdownMenuLabel) requires a Menu.Group ancestor to register its
              label id — used bare, Base UI throws error #31 the instant the menu opens. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="font-medium">{name}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{isGuest ? "Guest" : email}</div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {isGuest ? (
            <DropdownMenuItem onClick={() => setPromptOpen(true)}>
              <Settings className="size-4" />
              Settings
              <Lock className="ml-auto size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignInPromptDialog open={promptOpen} onOpenChange={setPromptOpen} />
    </>
  );
}
