
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircleMore, CalendarDays, ClipboardCheck, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types"; 
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/firebase/auth";
import { getUnreadNotificationCountByType } from "@/lib/firebase/firestore/notifications";
import { useState, useEffect, useCallback } from "react";

const bottomNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { title: "Chat", href: "/chat", icon: MessageCircleMore },
  { title: "Meetings", href: "/meetings", icon: CalendarDays },
  { title: "Tasks", href: "/tasks", icon: ClipboardCheck },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const fetchUnreadChatCount = useCallback(async () => {
    if (user) {
      setIsLoadingCount(true);
      try {
        const count = await getUnreadNotificationCountByType(user.uid, "chat-new-message");
        setUnreadChatCount(count);
      } catch (error) {
        console.error("Failed to fetch unread chat count:", error);
        setUnreadChatCount(0); // Default to 0 on error
      } finally {
        setIsLoadingCount(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchUnreadChatCount();
      // Poll for unread chat count
      const intervalId = setInterval(fetchUnreadChatCount, 30000); // Poll every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [user, authLoading, fetchUnreadChatCount]);


  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border shadow-lg md:hidden z-50">
      <div className="flex justify-around items-center h-full">
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== "/" || pathname === "/"); // More robust active check
          const Icon = item.icon;
          const isChatIcon = item.title === "Chat";

          return (
            <Link key={item.title} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-full p-2 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-6 w-6 mb-0.5", isActive && item.href !== "/chat" ? "fill-primary/20" : "", isActive && item.href === "/chat" ? "text-primary" : "")} strokeWidth={isActive ? 2.5 : 2}/>
                <span className={cn("text-xs", isActive ? "font-medium" : "font-normal")}>
                  {item.title}
                </span>
                {isChatIcon && !isLoadingCount && unreadChatCount > 0 && (
                  <Badge variant="destructive" className="absolute top-1 right-3 sm:right-4 h-4 w-4 min-w-fit justify-center p-0.5 text-xs">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </Badge>
                )}
                {isChatIcon && isLoadingCount && <Loader2 className="absolute top-1 right-3 sm:right-4 h-3 w-3 animate-spin" />}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
