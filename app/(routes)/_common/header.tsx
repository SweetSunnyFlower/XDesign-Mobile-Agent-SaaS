"use client"
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

const Header = () => {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="sticky top-0 right-0 left-0 z-30">
      <header className="h-16 border-b bg-background py-4">
        <div
          className="w-full max-w-6xl mx-auto
         flex items-center justify-between"
        >
          <Logo />

          <div
            className="hidden flex-1 items-center
          justify-center gap-8 md:flex"
          >
            {/* <Link href="/" className="text-foreground-muted text-sm">
              Home
            </Link> */}
            {/* <Link href="/" className="text-foreground-muted text-sm">
              Pricing
            </Link> */}
          </div>

          <div
            className="flex flex-1 items-center
           justify-end gap-3

          "
          >
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar
                    className="h-8 w-8
                  shrink-0 rounded-full"
                  >
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback className="rounded-lg">
                      {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogoutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button>Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;
