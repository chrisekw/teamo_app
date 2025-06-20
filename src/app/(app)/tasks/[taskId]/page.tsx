
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ArrowLeft, Save, Trash2, ListChecks, Loader2, Edit, Info, User, Clock, BarChart, AlertTriangle, Star, Briefcase } from "lucide-react";
import type { Task } from "@/types";
import { getTaskByIdForUser, updateTaskForUser, deleteTaskForUser, statusColors } from "@/lib/firebase/firestore/tasks";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getOfficesForUser, type Office } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";

const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});


export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const taskId = params.taskId as string;

  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userOffices, setUserOffices] = useState<Office[]>([]);

  // Form states
  const [taskName, setTaskName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<Task["status"]>("To Do");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [department, setDepartment] = useState(""); // New state for department
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchUserOfficesForActivityLog = useCallback(async () => {
    if (user) {
      const offices = await getOfficesForUser(user.uid);
      setUserOffices(offices);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) { 
      fetchUserOfficesForActivityLog();
    }
  }, [authLoading, user, fetchUserOfficesForActivityLog]);

  const fetchTask = useCallback(async () => {
    if (user && taskId) {
      setIsLoading(true);
      try {
        const taskData = await getTaskByIdForUser(user.uid, taskId);
        if (taskData) {
          setCurrentTask(taskData);
          setTaskName(taskData.name);
          setAssignedTo(taskData.assignedTo);
          setDueDate(taskData.dueDate);
          setStatus(taskData.status);
          setPriority(taskData.priority);
          setDescription(taskData.description || "");
          setProgress(taskData.progress);
          setDepartment(taskData.department || ""); // Set department
        } else {
           toast({ variant: "destructive", title: "Not Found", description: "Task not found or you don't have access." });
           router.push("/tasks"); 
        }
      } catch (error) {
        console.error("Failed to fetch task:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch task details." });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, taskId, toast, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTask();
    }
  }, [authLoading, user, fetchTask]);

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentTask || !user) return;

    setIsSubmitting(true);
    const updatedTaskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>> = {
      name: taskName,
      assignedTo,
      dueDate: dueDate, // Send undefined if not set
      status,
      priority,
      description,
      progress,
      department: department || undefined, // Send undefined if empty
    };
    const actorName = user.displayName || user.email || "User";
    const officeIdForLog = userOffices.length > 0 ? userOffices[0].id : undefined;
    const officeNameForLog = userOffices.length > 0 ? userOffices[0].name : undefined;


    try {
      await updateTaskForUser(user.uid, currentTask.id, updatedTaskData, actorName, officeIdForLog, officeNameForLog);
      toast({ title: "Task Updated", description: "Your changes have been saved." });
      router.push("/tasks");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update task." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTask || !user) return;
    setIsSubmitting(true);
    try {
      await deleteTaskForUser(user.uid, currentTask.id);
      toast({ title: "Task Deleted", description: `"${currentTask.name}" has been removed.` });
      router.push("/tasks");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
      setIsSubmitting(false);
    }
    setIsDeleteDialogOpen(false);
  };

  if (authLoading || isLoading) { 
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  if (!currentTask && !isLoading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Task Not Found</h2>
        <p className="text-muted-foreground mb-6">The task you are looking for does not exist or may have been deleted.</p>
        <Button asChild>
          <Link href="/tasks"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tasks</Link>
        </Button>
      </div>
    );
  }
  
  if (!currentTask) return null;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/tasks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl">
        <form onSubmit={handleSaveChanges}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl sm:text-3xl">Edit Task: {currentTask.name}</CardTitle>
            <CardDescription>Modify the details of this task below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 sm:pr-3">
            <div className="space-y-1.5">
              <Label htmlFor="taskName" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Task Name</Label>
              <Input id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of the task" rows={4} disabled={isSubmitting}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="assignedTo" className="flex items-center text-sm font-medium text-muted-foreground"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Assigned To</Label>
                <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isSubmitting}/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDate"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <DynamicCalendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="flex items-center text-sm font-medium text-muted-foreground"><BarChart className="mr-2 h-4 w-4 text-muted-foreground"/>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Task["status"])} disabled={isSubmitting}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority" className="flex items-center text-sm font-medium text-muted-foreground"><AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground"/>Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Task["priority"])} disabled={isSubmitting}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="department" className="flex items-center text-sm font-medium text-muted-foreground"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground"/>Department (Optional)</Label>
                <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Engineering" disabled={isSubmitting}/>
              </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="progress" className="flex items-center text-sm font-medium text-muted-foreground"><Star className="mr-2 h-4 w-4 text-muted-foreground"/>Progress</Label>
                <Badge className={cn(statusColors[status], "text-white")}>{progress}%</Badge>
              </div>
              <Input 
                id="progress" 
                type="range" 
                min="0" 
                max="100" 
                value={progress} 
                onChange={(e) => setProgress(parseInt(e.target.value))} 
                className="cursor-pointer"
                disabled={isSubmitting}
              />
               <Progress value={progress} className="h-2 mt-1" indicatorClassName={progress === 100 ? "bg-green-500" : status === "Blocked" ? "bg-red-500" : "bg-primary"}/>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="w-full sm:w-auto mb-2 sm:mb-0" disabled={isSubmitting}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task "{currentTask.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    