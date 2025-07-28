
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Briefcase, MessageCircle, Users, Zap, ArrowUpRight, CalendarPlus, ListChecks, UserPlus, Target, TrendingUp, CheckSquare, Edit3, PlusCircle, Building, Award } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState, useCallback } from "react";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartConfig } from "@/components/ui/chart";
import { useAuth } from "@/lib/firebase/auth";
import { onUserOfficesUpdate, onMembersUpdate, type Office } from "@/lib/firebase/firestore/offices";
import { onActivityLogUpdate, type ActivityLogItem } from "@/lib/firebase/firestore/activity";
import { onGoalsUpdate, type Goal } from "@/lib/firebase/firestore/goals";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import type { Unsubscribe } from "firebase/firestore";
import { onUnreadNotificationCountByTypeUpdate } from "@/lib/firebase/firestore/notifications";

const activityIconMap: Record<string, React.ElementType> = {
  "task-new": ListChecks,
  "task-status-update": Edit3,
  "task-completed": CheckSquare,
  "goal-new": Target,
  "goal-progress-update": TrendingUp,
  "goal-achieved": CheckSquare,
  "meeting-new": CalendarPlus,
  "office-created": Building,
  "member-join": UserPlus,
  "room-new": PlusCircle,
  "default": Activity,
};

const chartConfig = {
  progress: { label: "Team Progress", color: "hsl(var(--primary))" },
  target: { label: "Target Progress", color: "hsl(var(--muted-foreground))" }
} satisfies ChartConfig;

const DynamicProgressChart = dynamic(
  () => import('@/components/dashboard/progress-chart').then((mod) => mod.ProgressChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> }
);

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeOfficesCount, setActiveOfficesCount] = useState(0);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityLogItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [selectedOfficeForDashboard, setSelectedOfficeForDashboard] = useState<Office | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);


  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingStats(true);
      const unsubscribeOffices = onUserOfficesUpdate(user.uid, (offices) => {
        setActiveOfficesCount(offices.length);
        if (offices.length > 0) {
          if (!selectedOfficeForDashboard || !offices.some(o => o.id === selectedOfficeForDashboard.id)) {
            setSelectedOfficeForDashboard(offices[0]);
          }
        } else {
          setSelectedOfficeForDashboard(null);
          setTeamMembersCount(0);
          setActiveGoals([]);
        }
        setIsLoadingStats(false);
      });
      return () => unsubscribeOffices();
    } else if (!user && !authLoading) {
      setActiveOfficesCount(0);
      setSelectedOfficeForDashboard(null);
      setTeamMembersCount(0);
      setActiveGoals([]);
      setIsLoadingStats(false);
    }
  }, [user, authLoading, selectedOfficeForDashboard]);

  useEffect(() => {
    let unsubs: Unsubscribe[] = [];
    if (selectedOfficeForDashboard && user) {
      setIsLoadingStats(true);
      setIsLoadingActivity(true);
      setIsLoadingGoals(true);

      const unsubMembers = onMembersUpdate(selectedOfficeForDashboard.id, (members) => {
        setTeamMembersCount(members.length);
        setIsLoadingStats(false);
      });
      unsubs.push(unsubMembers);

      const unsubGoals = onGoalsUpdate(selectedOfficeForDashboard.id, user.uid, (goals) => {
        setActiveGoals(goals.filter(g => getProgressPercentage(g.currentValue, g.targetValue, g.unit) < 100));
        setIsLoadingGoals(false);
      });
      unsubs.push(unsubGoals);

      const unsubActivity = onActivityLogUpdate(selectedOfficeForDashboard.id, (activities) => {
        setActivityFeed(activities);
        setIsLoadingActivity(false);
      }, 7);
      unsubs.push(unsubActivity);

    } else {
        setTeamMembersCount(0);
        setActiveGoals([]);
        setActivityFeed([]);
        if (!isLoadingStats) setIsLoadingStats(false);
        setIsLoadingActivity(false);
        setIsLoadingGoals(false);
    }
    return () => unsubs.forEach(unsub => unsub());
  }, [selectedOfficeForDashboard, user]);
  
  useEffect(() => {
      let unsubscribe: Unsubscribe | null = null;
      if (user && !authLoading) {
        unsubscribe = onUnreadNotificationCountByTypeUpdate(
          user.uid,
          "chat-new-message",
          setUnreadChatCount
        );
      }
      return () => {
        if (unsubscribe) unsubscribe();
      };
  }, [user, authLoading]);

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
  
  const getProgressPercentage = (current: number, target: number, unit: string) => {
    if (unit.toLowerCase().includes("lower is better")) {
        if (target === 0 && current === 0) return 100;
        if (current <= target) return 100;
        if (target === 0 && current > 0) return 0;
        return Math.max(0, ( (target * 1.5) - current) / ( (target*1.5) - target) * 100 );
    }
    if (target === 0) return current > 0 ? 100 : 0;
    return Math.min(Math.max((current / target) * 100, 0), 100);
  };

  if (authLoading) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-center sm:justify-start mb-8 text-center sm:text-left">
         <TrendingUp className="h-8 w-8 mr-3 text-primary hidden sm:block" />
         <h1 className="text-3xl font-headline font-bold">Team Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offices</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats && activeOfficesCount === 0 ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeOfficesCount}</div>}
            <p className="text-xs text-muted-foreground">Offices you are part of</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats && teamMembersCount === 0 && selectedOfficeForDashboard ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{teamMembersCount}</div>}
            <p className="text-xs text-muted-foreground">
              {selectedOfficeForDashboard ? `In "${selectedOfficeForDashboard.name}"` : "No active office selected"}
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats && activeGoals.length === 0 && selectedOfficeForDashboard ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeGoals.length}</div>}
            <p className="text-xs text-muted-foreground">
              {selectedOfficeForDashboard ? `In "${selectedOfficeForDashboard.name}"` : "No active office selected"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadChatCount}</div>
            <p className="text-xs text-muted-foreground">Across all conversations</p>
          </CardContent>
        </Card>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Target className="mr-2 h-5 w-5"/>Active Team Goals</CardTitle>
            <CardDescription>
              {selectedOfficeForDashboard ? `Current goals for "${selectedOfficeForDashboard.name}".` : "No office selected for goals."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0">
             <ScrollArea className="h-96 px-6">
                {isLoadingGoals ? (
                  <div className="space-y-4 pt-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : activeGoals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Award className="h-12 w-12 mb-2" />
                        <p>No active goals.</p>
                        <p className="text-xs">Looks like the team has achieved everything!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeGoals.map((goal) => (
                             <div key={goal.id} className="space-y-2">
                                <p className="text-sm font-medium flex justify-between">
                                    <span>{goal.name}</span>
                                    <span className="text-muted-foreground">{Math.round(getProgressPercentage(goal.currentValue, goal.targetValue, goal.unit))}%</span>
                                </p>
                                <Progress value={getProgressPercentage(goal.currentValue, goal.targetValue, goal.unit)} className="h-2" />
                                <p className="text-xs text-muted-foreground">{goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit.replace("(Lower is better)","").trim()}</p>
                            </div>
                        ))}
                    </div>
                )}
             </ScrollArea>
          </CardContent>
           <CardFooter className="pt-6 border-t">
                <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link href="/goals">View All Goals <ArrowUpRight className="ml-1 h-4 w-4"/></Link>
                </Button>
           </CardFooter>
        </Card>
        
        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Activity className="mr-2 h-5 w-5" />Recent Activity</CardTitle>
            <CardDescription>Latest team updates.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0">
            <ScrollArea className="h-96 px-6">
              {isLoadingActivity ? (
                 <div className="space-y-6 pt-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                 </div>
              ) : activityFeed.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">No recent activity.</p>
              ) : (
                <div className="space-y-6">
                  {activityFeed.map((item) => {
                    const IconComponent = activityIconMap[item.iconName] || activityIconMap["default"];
                    return (
                    <div key={item.id} className="flex items-start space-x-3">
                      <Badge variant="outline" className="p-2 mt-1">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-tight">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground/80 mt-0.5">
                          {item.actorName && `By ${item.actorName} • `}{formatTimeAgo(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/meetings"><Zap className="mr-2 h-4 w-4" /> Start/Schedule Meeting</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/office-designer"><Briefcase className="mr-2 h-4 w-4" /> Manage Offices</Link>
            </Button>
             <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/tasks"><ListChecks className="mr-2 h-4 w-4" /> View Tasks</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/chat"><MessageCircle className="mr-2 h-4 w-4" /> Open Team Chat</Link>
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
                 <Button size="lg" variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                    <Link href="/office-designer">Enter Office View</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    