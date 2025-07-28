
"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { TeamoTextLogo } from "@/components/icons";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { Plus, Play, Apple, Sparkles, Loader2, ChevronDown } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "@/components/layout/bottom-nav";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import SplashScreen from "@/components/layout/SplashScreen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [aiFabMode, setAiFabMode] = useState<'expanded' | 'collapsed'>('collapsed');
  const [showAppContent, setShowAppContent] = useState(false); 

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSplashScreenFinished = () => {
    if (!authLoading && user) {
      setShowAppContent(true);
    }
  };
  
  useEffect(() => {
    if (!authLoading && user && !showAppContent) {
        setShowAppContent(true);
    }
  }, [authLoading, user, showAppContent]);


  if (authLoading || !showAppContent) {
    return <SplashScreen onFinished={handleSplashScreenFinished} />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {!isMobile && (
        <Sidebar
          variant="sidebar"
          collapsible="icon"
          className="border-r-0 bg-sidebar text-sidebar-foreground group-data-[collapsible=icon]:border-r-0"
        >
          <SidebarHeader className="h-auto items-center border-b border-sidebar-border p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-3 space-y-4">
            <div className="flex items-center justify-center w-full h-8 group-data-[collapsible=icon]:h-7">
              <TeamoTextLogo className="h-full w-auto group-data-[collapsible=icon]:hidden" />
            </div>
            <Button variant="default" className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 group-data-[collapsible=icon]:hidden">
              <Plus className="mr-2 h-5 w-5" /> Create New
            </Button>
            <Button variant="default" size="icon" className="w-10 h-10 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 group-data-[collapsible=icon]:flex hidden">
              <Plus className="h-5 w-5" />
            </Button>
          </SidebarHeader>

          <SidebarContent className="p-0">
            <SidebarNav />
          </SidebarContent>

          <SidebarFooter className="mt-auto border-t-0 p-3 group-data-[collapsible=icon]:hidden">
            <Card className="bg-gradient-to-br from-[hsl(var(--mobile-app-card-bg-start))] to-[hsl(var(--mobile-app-card-bg-end))] p-4 rounded-lg shadow-md text-center border-none">
              <CardContent className="p-0">
                <div className="relative h-24 w-full mb-3">
                  <Image
                    src="https://placehold.co/200x100.png"
                    alt="Mobile app promotion"
                    layout="fill"
                    objectFit="contain"
                    data-ai-hint="mobile app promo"
                  />
                </div>
                <p className="text-sm font-medium text-sidebar-foreground mb-3">Get mobile app</p>
                <div className="flex justify-center space-x-3">
                  <Button variant="secondary" size="icon" className="bg-white/80 hover:bg-white text-gray-700 rounded-full">
                    <Play className="h-5 w-5" />
                  </Button>
                  <Button variant="secondary" size="icon" className="bg-white/80 hover:bg-white text-gray-700 rounded-full">
                    <Apple className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SidebarFooter>
        </Sidebar>
      )}
      <div className="flex flex-col flex-1 min-h-screen">
        <Header />
        <main className={`flex-1 overflow-y-auto ${isMobile ? 'pb-16' : ''}`}>
          <SidebarInset>
            {children}
          </SidebarInset>
        </main>
        {isMobile && (
          <>
            <BottomNav />
            {aiFabMode === 'expanded' ? (
              <div className="fixed bottom-24 right-6 z-50 flex items-end space-x-1"> {/* Adjusted position */}
                <Link
                  href="/ai-assistant"
                  className={cn(
                    "bg-primary text-primary-foreground rounded-full shadow-lg",
                    "w-14 h-14 flex items-center justify-center",
                    "hover:bg-primary/90 transition-colors"
                  )}
                  aria-label="AI Assistant"
                >
                  <Sparkles className="h-7 w-7" />
                </Link>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full w-8 h-8 p-0 shadow-md"
                  onClick={() => setAiFabMode('collapsed')}
                  aria-label="Collapse AI Assistant Button"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            ) : ( // Collapsed mode
              <Button
                className={cn(
                  "fixed bottom-24 right-6 z-50 p-0", // Adjusted position
                  "bg-secondary text-secondary-foreground rounded-full shadow-lg",
                  "w-10 h-10 flex items-center justify-center",
                  "hover:bg-secondary/80 transition-colors"
                )}
                onClick={() => setAiFabMode('expanded')}
                aria-label="Expand AI Assistant Button"
              >
                <Sparkles className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
      </div>
    </SidebarProvider>
  );
}

    