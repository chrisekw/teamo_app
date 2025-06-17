
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, // Changed from LayoutGrid
  Building2,       // Changed from DraftingCompass
  MessageCircleMore, // Changed from MessagesSquare
  CalendarDays,    // Changed from Video
  ClipboardCheck,  // Changed from ListChecks
  TrendingUp,      // Changed from Target
  BrainCircuit,    // Changed from Sparkles
  ChevronDown,
  ChevronRight,
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
    icon: LayoutDashboard,
  },
  {
    title: "Office Designer",
    href: "/office-designer",
    icon: Building2,
  },
  {
    title: "Team Chat",
    href: "/chat",
    icon: MessageCircleMore,
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: CalendarDays,
  },
  {
    title: "Task Management",
    href: "/tasks",
    icon: ClipboardCheck,
  },
  {
    title: "Goal Tracker",
    href: "/goals",
    icon: TrendingUp,
  },
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: BrainCircuit,
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
    <ScrollArea className="flex-1">
      <SidebarMenu>
        {navItems.map((item) =>
          item.children && item.children.length > 0 ? (
            <SidebarMenuItem key={item.title}>
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
                onClick={() => toggleSubmenu(item.title)}
                aria-expanded={openSubmenus[item.title]}
              >
                <item.icon className="shrink-0"/>
                <span className="truncate ml-2 group-data-[collapsible=icon]:hidden">{item.title}</span>
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
                          className="w-full"
                        >
                          <>
                            {child.icon && <child.icon className="shrink-0"/>}
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
                  className="w-full"
                >
                  <>
                    <item.icon className="shrink-0" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
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
