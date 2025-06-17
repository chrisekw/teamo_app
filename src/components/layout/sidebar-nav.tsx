
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, // Was LayoutDashboard
  Building, // Was Building2
  MessageSquare, // Was MessageCircleMore
  Calendar, // Was CalendarDays
  ClipboardList, // Was ClipboardCheck
  TrendingUp, // Was TrendingUp (same, good fit)
  Sparkles, // Was BrainCircuit
  Settings, // Added here
  ChevronDown,
  ChevronRight,
  Play,
  Apple,
  Plus,
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
    title: "Dashboard", // OCR: Overview, but Dashboard is our existing page
    href: "/dashboard",
    icon: LayoutGrid, // Similar to Overview icon in image
  },
  {
    title: "Office Designer", // OCR: Patients - mapping to our concept
    href: "/office-designer",
    icon: Building, // Similar to people/group icon
  },
  {
    title: "Team Chat", // OCR: Map - mapping to our concept
    href: "/chat",
    icon: MessageSquare, // MapPin
  },
  {
    title: "Meetings", // OCR: Departments - mapping to our concept
    href: "/meetings",
    icon: Calendar, // Home / Building
  },
  {
    title: "Task Management", // OCR: Doctors - mapping to our concept
    href: "/tasks",
    icon: ClipboardList, // Stethoscope / UserSquare
  },
  {
    title: "Goal Tracker", // OCR: History - mapping to our concept
    href: "/goals",
    icon: TrendingUp, // History / List
  },
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
  },
  {
    title: "Settings",
    href: "#", // Placeholder link for settings
    icon: Settings,
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
                          asChild
                          size="sm"
                          isActive={pathname === child.href}
                          className="w-full text-sidebar-item-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-item-active-background data-[active=true]:text-sidebar-item-active-foreground"
                        >
                          <>
                            {child.icon && <child.icon className="shrink-0 h-4 w-4" />}
                            <span>{child.title}</span>
                          </>
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
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{
                    children: item.title,
                    className: "group-data-[collapsible=icon]:block hidden",
                  }}
                  className="w-full h-10 px-3 justify-start text-sidebar-item-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-item-active-background data-[active=true]:text-sidebar-item-active-foreground group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                >
                  <>
                    <item.icon className="shrink-0 h-5 w-5" />
                    <span className="truncate ml-3 group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </ScrollArea>
  );
}
```