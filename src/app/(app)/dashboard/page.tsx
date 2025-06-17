
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Briefcase, MessageCircle, Users, Zap, ArrowUpRight, CalendarPlus, ListChecks, UserPlus, Target, TrendingUp } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartConfig } from "@/components/ui/chart";


interface ActivityItem {
  id: string;
  type: "meeting" | "task" | "member" | "goal";
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ElementType;
  author?: string;
}

const initialActivityFeed: ActivityItem[] = [
  { id: "1", type: "meeting", title: "Project Alpha Kick-off Scheduled", description: "Meeting set for tomorrow at 10:00 AM.", timestamp: new Date(Date.now() - 3600000 * 2), icon: CalendarPlus, author: "Alice" },
  { id: "2", type: "task", title: "New Task Assigned: 'Develop API'", description: "Assigned to Bob, due in 5 days.", timestamp: new Date(Date.now() - 3600000 * 3), icon: ListChecks, author: "Alice" },
  { id: "3", type: "member", title: "Eve Joined the Team!", description: "Welcome Eve to the Design department.", timestamp: new Date(Date.now() - 3600000 * 5), icon: UserPlus, author: "System" },
  { id: "4", type: "goal", title: "Goal Updated: 'Q3 Revenue'", description: "Progress increased to 65%.", timestamp: new Date(Date.now() - 3600000 * 8), icon: Target, author: "Charlie" },
  { id: "5", type: "task", title: "Task Completed: 'Test Payment Gateway'", description: "Completed by David ahead of schedule.", timestamp: new Date(Date.now() - 3600000 * 12), icon: ListChecks, author: "David" },
];

const initialProgressData = [
  { month: "Jan", progress: 20, target: 15 },
  { month: "Feb", progress: 35, target: 30 },
  { month: "Mar", progress: 50, target: 45 },
  { month: "Apr", progress: 60, target: 60 },
  { month: "May", progress: 75, target: 75 },
  { month: "Jun", progress: 85, target: 90 },
];

const chartConfig = {
  progress: {
    label: "Team Progress",
    color: "hsl(var(--primary))",
  },
  target: {
    label: "Target Progress",
    color: "hsl(var(--muted-foreground))",
  }
} satisfies ChartConfig;

const DynamicProgressChart = dynamic(
  () => import('@/components/dashboard/progress-chart').then((mod) => mod.ProgressChart),
  { 
    ssr: false, 
    loading: () => <Skeleton className="h-[250px] w-full" /> 
  }
);


export default function DashboardPage() {
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [progressData, setProgressData] = useState<typeof initialProgressData>([]);
  
  useEffect(() => {
    // Simulate data fetching
    setActivityFeed(initialActivityFeed);
    setProgressData(initialProgressData);
  }, []);


  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center mb-8">
         <TrendingUp className="h-8 w-8 mr-3 text-primary" />
         <h1 className="text-3xl font-headline font-bold">Team Dashboard</h1>
      </div>
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 since last week</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members Online</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8 / 15</div>
            <p className="text-xs text-muted-foreground">Current / Total</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27</div>
            <p className="text-xs text-muted-foreground">In 3 active chats</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed and Progress Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Activity className="mr-2 h-5 w-5" />Recent Team Activity</CardTitle>
            <CardDescription>Latest updates from across your team and projects.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0">
            <ScrollArea className="h-96 px-6">
              <div className="space-y-6">
                {activityFeed.map((item, index) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <Badge variant="outline" className="p-2 mt-1">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                       <p className="text-xs text-muted-foreground/80 mt-0.5">
                        {item.author && `By ${item.author} • `}{formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                 {activityFeed.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-10">No recent activity.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
           <CardFooter className="pt-6 border-t">
                <Button variant="ghost" size="sm" className="w-full">View All Activity <ArrowUpRight className="ml-1 h-4 w-4"/></Button>
           </CardFooter>
        </Card>

        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><TrendingUp className="mr-2 h-5 w-5"/>Progress Overview</CardTitle>
            <CardDescription>Team's cumulative progress over the past months.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
             <DynamicProgressChart data={progressData} config={chartConfig} />
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions and Virtual Office */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Zap className="mr-2 h-4 w-4" /> Start a New Meeting
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Briefcase className="mr-2 h-4 w-4" /> Create a New Project
            </Button>
             <Button variant="outline" className="w-full justify-start">
              <ListChecks className="mr-2 h-4 w-4" /> Add a New Task
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" /> Open Team Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline">Your Virtual Office</CardTitle>
            <CardDescription>A glimpse into your customized workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-72 w-full rounded-md overflow-hidden bg-muted/50">
              <Image 
                src="https://placehold.co/800x450.png" 
                alt="Virtual Office Space" 
                layout="fill" 
                objectFit="cover"
                data-ai-hint="modern office team" 
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Button size="lg" variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors">Enter Office View</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
