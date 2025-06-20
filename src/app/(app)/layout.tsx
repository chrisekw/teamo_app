
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
import { TeamoTextLogo } from "@/components/icons"; // Keep TeamoTextLogo for non-splash usage
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { Plus, Play, Apple, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "@/components/layout/bottom-nav";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import SplashScreen from "@/components/layout/SplashScreen"; // Import the new SplashScreen

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [aiFabMode, setAiFabMode] = useState<'expanded' | 'collapsed'>('collapsed');
  const [showAppContent, setShowAppContent] = useState(false); // Controls visibility of main app vs splash

  useEffect(() => {
    if (!authLoading && !user) {
      // Auth state resolved, no user, redirect to login
      // This might happen after splash screen finishes, so ensure no content is shown.
      router.push('/login');
    }
    // If authLoading is true, or if user exists, we let the splash screen logic handle showAppContent
  }, [user, authLoading, router]);

  const handleSplashScreenFinished = () => {
    // Only show app content if authentication is also complete and user exists
    if (!authLoading && user) {
      setShowAppContent(true);
    } else if (!authLoading && !user) {
      // This case implies auth finished, no user, redirect should already be in progress or have happened.
      // Splash finished but there's no user to show the app to.
    }
    // If auth is still loading when splash animation finishes, we wait.
    // The main `if (authLoading || !showAppContent)` will keep showing splash.
  };
  
  // This effect ensures that if auth completes *while* splash is showing,
  // and there's no user, we transition out of splash logic correctly.
  // And if user *is* present when auth completes, `handleSplashScreenFinished` will eventually show content.
  useEffect(() => {
    if (!authLoading && user && showAppContent) {
        // Auth is done, user exists, splash has called onFinished
        // This is the final state to show the app.
    } else if (!authLoading && !user) {
        // If auth is done, no user, ensure we are not trying to show app content
        // and rely on the redirect. If splash was visible, it might call handleSplashScreenFinished,
        // but the outer condition `(authLoading || !showAppContent)` should eventually become false
        // and hit the `if (!user)` check below.
    }
  }, [authLoading, user, showAppContent]);


  // Show SplashScreen if:
  // 1. Authentication is still loading OR
  // 2. Authentication is done, but the splash screen animation hasn't called `onFinished` yet (showAppContent is false)
  if (authLoading || !showAppContent) {
    // If authLoading is false here, it means user is authenticated (otherwise redirect would occur)
    // but splash animation is not yet complete.
    return <SplashScreen onFinished={handleSplashScreenFinished} />;
  }

  // If we reach here, auth loading is false, AND splash screen has finished.
  // Now, double-check if user is actually present. (Should be, due to logic above)
  if (!user) {
    // This state implies auth is done, splash is done, but no user.
    // Should have been redirected. Show a loader as a fallback during this transition.
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // All checks passed: Auth is done, user exists, splash screen has finished. Render the app.
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
