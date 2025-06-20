
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
import { Calendar as CalendarIcon, ArrowLeft, Save, Trash2, ListChecks, Loader2, Edit, Info, User, Clock, BarChart, AlertTriangle, Star, Briefcase, Users as UsersIcon } from "lucide-react";
import type { Task, OfficeMember, Office } from "@/types";
import { getTaskByIdFromOffice, updateTaskInOffice, deleteTaskFromOffice, statusColors } from "@/lib/firebase/firestore/tasks";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getMembersForOffice, getOfficeDetails } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});


export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const officeIdParam = typeof params.officeId === 'string' && params.officeId.length > 0 ? params.officeId : null;
  const taskIdParam = typeof params.taskId === 'string' && params.taskId.length > 0 ? params.taskId : null;

  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeMembers, setIsLoadingOfficeMembers] = useState(false);

  const [taskName, setTaskName] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<Task["status"]>("To Do");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchOfficeAndMembers = useCallback(async () => {
    if (user && officeIdParam) {
      setIsLoadingOfficeMembers(true);
      try {
        const officeDetails = await getOfficeDetails(officeIdParam);
        setActiveOffice(officeDetails);
        if (officeDetails) {
          const members = await getMembersForOffice(officeIdParam);
          setCurrentOfficeMembers(members); 
        } else {
          setCurrentOfficeMembers([]);
           toast({ variant: "destructive", title: "Error", description: "Could not load office details for this task."});
           router.push("/tasks");
        }
      } catch (error) {
        console.error("Failed to fetch office members:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load office members for task assignment."});
        router.push("/tasks");
      } finally {
        setIsLoadingOfficeMembers(false);
      }
    }
  }, [user, officeIdParam, toast, router]);

  useEffect(() => {
    if (!authLoading && user && officeIdParam) { 
      fetchOfficeAndMembers();
    } else if (!officeIdParam && !authLoading) {
      setIsLoading(false);
      setIsLoadingOfficeMembers(false);
    }
  }, [authLoading, user, officeIdParam, fetchOfficeAndMembers]);

  const fetchTask = useCallback(async () => {
    if (user && taskIdParam && officeIdParam) { 
      setIsLoading(true);
      try {
        const taskData = await getTaskByIdFromOffice(officeIdParam, taskIdParam); 
        if (taskData) {
          setCurrentTask(taskData);
          setTaskName(taskData.name);
          setAssigneeIds(taskData.assigneeIds || []);
          setDueDate(taskData.dueDate);
          setStatus(taskData.status);
          setPriority(taskData.priority);
          setDescription(taskData.description || "");
          setProgress(taskData.progress);
        } else {
           router.push("/tasks"); 
        }
      } catch (error) {
        console.error("Failed to fetch task:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch task details." });
        router.push("/tasks");
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, taskIdParam, officeIdParam, toast, router]);

  useEffect(() => {
    if (!authLoading && user && officeIdParam && taskIdParam && !isLoadingOfficeMembers && activeOffice) { 
      fetchTask();
    } else if ((!officeIdParam || !taskIdParam) && !authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user, fetchTask, officeIdParam, taskIdParam, isLoadingOfficeMembers, activeOffice]);

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentTask || !user || !officeIdParam || !activeOffice) return;

    setIsSubmitting(true);

    const selectedAssigneeDetails = assigneeIds
      .map(id => currentOfficeMembers.find(m => m.userId === id))
      .filter(Boolean) as OfficeMember[];
    const assigneesDisplay = selectedAssigneeDetails.map(m => m.name).join(', ') || "Unassigned";

    const updatedTaskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'>> = {
      name: taskName,
      assigneeIds: assigneeIds,
      assigneesDisplay: assigneesDisplay,
      dueDate: dueDate, 
      status,
      priority,
      description,
      progress,
    };
    const actorName = user.displayName || user.email || "User";

    try {
      await updateTaskInOffice(officeIdParam, currentTask.id, updatedTaskData, user.uid, actorName, activeOffice.name);
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
    if (!currentTask || !user || !officeIdParam) return;
    setIsSubmitting(true);
    const actorName = user.displayName || user.email || "User";
    try {
      await deleteTaskFromOffice(officeIdParam, currentTask.id, user.uid, actorName);
      toast({ title: "Task Deleted", description: `"${currentTask.name}" has been removed.` });
      router.push("/tasks");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
      setIsSubmitting(false); 
    }
    setIsDeleteDialogOpen(false);
  };
  
  const getSelectedAssigneeNames = () => {
    if (assigneeIds.length === 0) return "Select Assignee(s)";
    const names = assigneeIds
      .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
      .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0,2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Assignee(s)";
  };

  if (authLoading || (!officeIdParam || !taskIdParam && !authLoading) || isLoading || (isLoadingOfficeMembers && !currentTask && officeIdParam && taskIdParam)) { 
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  if (!currentTask && !isLoading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Task Not Found</h2>
        <p className="text-muted-foreground mb-6">The task you are looking for does not exist in this office or may have been deleted.</p>
        <Button asChild>
          <Link href="/tasks"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tasks</Link>
        </Button>
      </div>
    );
  }
  
  if (!currentTask || !officeIdParam) return null; 

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/tasks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks {activeOffice ? `in ${activeOffice.name}` : ''}
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl">
        <form onSubmit={handleSaveChanges}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl sm:text-3xl">Edit Task: {currentTask.name}</CardTitle>
            <CardDescription>Modify the details of this task below. Belongs to office: {activeOffice?.name || officeIdParam}</CardDescription>
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
                 <Label htmlFor="assigneeIds" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Assignee(s)</Label>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" id="assigneeIds" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || isLoadingOfficeMembers || currentOfficeMembers.length === 0}>
                        {isLoadingOfficeMembers && currentOfficeMembers.length === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {getSelectedAssigneeNames()}
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(var(--radix-popover-trigger-width))]">
                    <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {currentOfficeMembers.length > 0 && (
                        <DropdownMenuCheckboxItem
                        checked={assigneeIds.length === currentOfficeMembers.length && currentOfficeMembers.length > 0}
                        onCheckedChange={(checked) => {
                            if (checked) {
                            setAssigneeIds(currentOfficeMembers.map(m => m.userId));
                            } else {
                            setAssigneeIds([]);
                            }
                        }}
                        disabled={isLoadingOfficeMembers}
                        >
                        Select All ({currentOfficeMembers.length})
                        </DropdownMenuCheckboxItem>
                    )}
                    <DropdownMenuSeparator />
                    {isLoadingOfficeMembers && currentOfficeMembers.length === 0 ? (
                        <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : currentOfficeMembers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No members in this office to assign.</div>
                    ) : (
                        <div className="max-h-48 overflow-y-auto">
                        {currentOfficeMembers.map((member) => (
                        <DropdownMenuCheckboxItem
                            key={member.userId}
                            checked={assigneeIds.includes(member.userId)}
                            onCheckedChange={(checked) => {
                            setAssigneeIds((prev) =>
                                checked
                                ? [...prev, member.userId]
                                : prev.filter((id) => id !== member.userId)
                            );
                            }}
                        >
                            <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.substring(0,1)}`} alt={member.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                            </Avatar>
                            {member.name}
                            </div>
                        </DropdownMenuCheckboxItem>
                        ))}
                        </div>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>
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
                    <DynamicCalendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus disabled={isSubmitting}/>
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
                  <AlertDialogCancel disabled={isSubmitting} onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
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

