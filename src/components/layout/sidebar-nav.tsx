"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  DraftingCompass,
  MessagesSquare,
  Video,
  ListChecks,
  Target,
  Sparkles,
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
    icon: LayoutGrid,
  },
  {
    title: "Office Designer",
    href: "/office-designer",
    icon: DraftingCompass,
  },
  {
    title: "Team Chat",
    href: "/chat",
    icon: MessagesSquare,
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: Video,
  },
  {
    title: "Task Management",
    href: "/tasks",
    icon: ListChecks,
  },
  {
    title: "Goal Tracker",
    href: "/goals",
    icon: Target,
  },
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
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
                      <Link href={child.href} legacyBehavior passHref>
                        <SidebarMenuSubButton
                          asChild
                          size="sm"
                          isActive={pathname === child.href}
                          className="w-full"
                        >
                          <a>
                            {child.icon && <child.icon className="shrink-0"/>}
                            <span>{child.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem key={item.title}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{
                    children: item.title,
                    className: "group-data-[collapsible=icon]:block hidden",
                  }}
                  className="w-full"
                >
                  <a>
                    <item.icon className="shrink-0" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </ScrollArea>
  );
}
