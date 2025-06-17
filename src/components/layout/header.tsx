
"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { TeamoTextLogo } from "@/components/icons";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown"; // Added import

export function Header() {
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          {isMobile && <SidebarTrigger className="mr-2" />}
          <TeamoTextLogo className="h-6 fill-foreground" />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-2">
          {isMobile && (
             <Button asChild variant="ghost" size="icon" aria-label="Office Designer">
                <Link href="/office-designer">
                     <Building2 className="h-5 w-5" />
                </Link>
            </Button>
          )}
          <NotificationDropdown /> {/* Added NotificationDropdown */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
