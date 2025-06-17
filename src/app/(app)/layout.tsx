"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Logo, TeamoTextLogo } from "@/components/icons";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, UserCircle } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r data-[collapsible=icon]:border-r-0"
      >
        <SidebarHeader className="h-14 items-center border-b p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-2">
          <TeamoTextLogo className="h-7 fill-sidebar-foreground group-data-[collapsible=icon]:hidden" />
          <Logo className="h-7 w-7 fill-sidebar-foreground group-data-[collapsible=icon]:block hidden"/>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="mt-auto border-t p-2">
          <Tooltip>
             <TooltipTrigger asChild>
              <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                <Settings className="h-4 w-4 shrink-0" />
                <span className="ml-2 group-data-[collapsible=icon]:hidden">Settings</span>
              </Button>
             </TooltipTrigger>
             <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">Settings</TooltipContent>
          </Tooltip>
           <Tooltip>
             <TooltipTrigger asChild>
              <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                <UserCircle className="h-4 w-4 shrink-0" />
                <span className="ml-2 group-data-[collapsible=icon]:hidden">Profile</span>
              </Button>
             </TooltipTrigger>
             <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">Profile</TooltipContent>
          </Tooltip>
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col flex-1 min-h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <SidebarInset>
            {children}
          </SidebarInset>
        </main>
      </div>
    </SidebarProvider>
  );
}
