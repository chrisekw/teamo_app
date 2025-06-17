import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Briefcase, MessageCircle, Users, Zap } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-headline font-bold mb-8">Welcome to Your Teamo Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline">Team Activity Overview</CardTitle>
            <CardDescription>Recent updates and task progress.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {/* Placeholder for a chart or activity feed */}
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
              <Activity className="h-12 w-12 text-muted-foreground" />
              <p className="ml-4 text-muted-foreground">Activity Chart Coming Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Zap className="mr-2 h-4 w-4" /> Start a New Meeting
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Briefcase className="mr-2 h-4 w-4" /> Create a New Task
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" /> Open Team Chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline">Your Virtual Office</CardTitle>
            <CardDescription>A glimpse into your customized workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 w-full rounded-md overflow-hidden bg-muted/50">
              <Image 
                src="https://placehold.co/800x400.png" 
                alt="Virtual Office Space" 
                layout="fill" 
                objectFit="cover"
                data-ai-hint="virtual office" 
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Button size="lg" variant="secondary">Enter Office View</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
