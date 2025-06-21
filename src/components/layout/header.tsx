
"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown"; 
import { Logo } from "@/components/icons";

export function Header() {
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          {isMobile && (
            <SidebarTrigger className="mr-2 h-8 w-8">
              <Logo className="h-6 w-6" />
            </SidebarTrigger>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-2">
          {isMobile && (
             <Button asChild variant="ghost" size="icon" aria-label="Office Designer">
                <Link href="/office-designer">
                     <Building2 className="h-5 w-5" />
                </Link>
            </Button>
          )}
          <NotificationDropdown /> 
          <UserNav />
        </div>
      </div>
    </header>
  );
}
