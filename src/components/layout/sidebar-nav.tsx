
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Building2,
  MessageCircleMore,
  CalendarDays,
  ClipboardCheck,
  TrendingUp,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronRight,
  Palette, // Example new icon
  Users, // Example new icon
  FileText, // Example new icon
} from "lucide-react";

import type { NavItem } from "@/types";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";


const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutGrid, // Keeping original icon
  },
  {
    title: "Office Designer",
    href: "/office-designer",
    icon: Building2, // Keeping original icon
  },
  {
    title: "Team Chat",
    href: "/chat",
    icon: MessageCircleMore, // Keeping original icon
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: CalendarDays, // Keeping original icon
  },
  {
    title: "Task Management",
    href: "/tasks",
    icon: ClipboardCheck, // Keeping original icon
  },
  {
    title: "Goal Tracker",
    href: "/goals",
    icon: TrendingUp, // Keeping original icon
  },
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles, // Keeping original icon
  },
  {
    title: "Settings",
    href: "/settings", // Updated href
    icon: Settings, // Keeping original icon for settings
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sidebarState === "collapsed") {
      setOpenSubmenus({});
    }
  }, [sidebarState]);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };


  return (
    <ScrollArea className="flex-1 px-2">
      <SidebarMenu className="space-y-1">
        {navItems.map((item) =>
          item.children && item.children.length > 0 ? (
            <SidebarMenuItem key={item.title}>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center text-sidebar-item-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-item-active-background data-[active=true]:text-sidebar-item-active-foreground"
                onClick={() => toggleSubmenu(item.title)}
                aria-expanded={openSubmenus[item.title]}
                data-active={item.children?.some(child => pathname === child.href)}
              >
                <item.icon className="shrink-0 h-5 w-5" />
                <span className="truncate ml-3 group-data-[collapsible=icon]:hidden">{item.title}</span>
                {openSubmenus[item.title] ? <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" /> : <ChevronRight className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />}
              </Button>
              {sidebarState === "expanded" && openSubmenus[item.title] && (
                <SidebarMenuSub>
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={child.title}>
                      <Link href={child.href}>
                        <SidebarMenuSubButton
                          isActive={pathname === child.href}
                          className="w-full text-sidebar-item-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-item-active-background data-[active=true]:text-sidebar-item-active-foreground"
                        >
                            {child.icon && <child.icon className="shrink-0 h-4 w-4" />}
                            <span>{child.title}</span>
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem key={item.title}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{
                    children: item.title,
                    className: "group-data-[collapsible=icon]:block hidden",
                  }}
                  className="w-full h-10 px-3 justify-start text-sidebar-item-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-item-active-background data-[active=true]:text-sidebar-item-active-foreground group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                >
                    <item.icon className="shrink-0 h-5 w-5" />
                    <span className="truncate ml-3 group-data-[collapsible=icon]:hidden">{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </ScrollArea>
  );
}
