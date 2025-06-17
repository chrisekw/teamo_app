
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircleMore, CalendarDays, ClipboardCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types"; // Assuming NavItem might be useful, or define a simpler type

const bottomNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { title: "Chat", href: "/chat", icon: MessageCircleMore },
  { title: "Meetings", href: "/meetings", icon: CalendarDays },
  { title: "Tasks", href: "/tasks", icon: ClipboardCheck },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border shadow-lg md:hidden z-50">
      <div className="flex justify-around items-center h-full">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"); // More robust active check
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-full p-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-6 w-6 mb-0.5", isActive ? "fill-primary/20" : "")} strokeWidth={isActive ? 2.5 : 2}/>
                <span className={cn("text-xs", isActive ? "font-medium" : "font-normal")}>
                  {item.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
