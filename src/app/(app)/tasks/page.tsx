
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, ListChecks, Filter, Loader2, User, Briefcase, Edit, Info, Clock, AlertTriangle, Users as UsersIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Task, OfficeMember } from "@/types";
import { statusColors, addTaskForUser, getTasksForUser } from "@/lib/firebase/firestore/tasks";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { getOfficesForUser, getMembersForOffice, type Office } from "@/lib/firebase/firestore/offices";
import dynamic from 'next/dynamic';
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


export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeMembers, setIsLoadingOfficeMembers] = useState(false);

  const [newTaskName, setNewTaskName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("Medium");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();
  const [newAssignedTo, setNewAssignedTo] = useState<string[]>([]); // Changed to string array
  
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const fetchUserOffices = useCallback(async () => {
    if (user) {
      const offices = await getOfficesForUser(user.uid);
      setUserOffices(offices);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserOffices();
    }
  }, [authLoading, user, fetchUserOffices]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (userOffices.length > 0 && user) {
        setIsLoadingOfficeMembers(true);
        try {
          const members = await getMembersForOffice(userOffices[0].id); // Assuming first office is primary
          setCurrentOfficeMembers(members.filter(m => m.userId !== user.uid)); // Exclude current user
        } catch (error) {
          console.error("Failed to fetch office members:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load office members for selection." });
        } finally {
          setIsLoadingOfficeMembers(false);
        }
      } else {
        setCurrentOfficeMembers([]);
      }
    };
    if (user && userOffices.length > 0) {
      fetchMembers();
    }
  }, [user, userOffices, toast]);


  const fetchTasks = useCallback(async () => {
    if (user) {
      setIsLoadingTasks(true);
      try {
        const userTasks = await getTasksForUser(user.uid);
        setTasks(userTasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch tasks." });
      } finally {
        setIsLoadingTasks(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
    }
  }, [user, authLoading, fetchTasks]);


  const resetCreateForm = () => {
    setNewTaskName("");
    setNewDescription("");
    setNewPriority("Medium");
    setNewDueDate(undefined);
    setNewAssignedTo([]); // Reset to empty array
  };

  const handleCreateTask = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to create tasks." });
      return;
    }
    if (!newTaskName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Task name cannot be empty." });
      return;
    }

    setIsSubmittingTask(true);
    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      name: newTaskName,
      assignedTo: newAssignedTo.length > 0 ? newAssignedTo.join(', ') : "Unassigned",
      dueDate: newDueDate, 
      status: "To Do", 
      priority: newPriority,
      description: newDescription,
      progress: 0, 
    };
    
    const actorName = user.displayName || user.email || "User";
    const officeForTask = userOffices.length > 0 ? userOffices[0] : undefined;

    try {
      await addTaskForUser(user.uid, taskData, actorName, officeForTask?.id, officeForTask?.name);
      toast({ title: "Task Created", description: `"${taskData.name}" has been added.` });
      setIsCreateTaskDialogOpen(false);
      resetCreateForm();
      fetchTasks(); 
    } catch (error) {
      console.error("Failed to create task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not create task." });
    } finally {
        setIsSubmittingTask(false);
    }
  };
  
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder: Record<Task["status"], number> = {
      "To Do": 1,
      "In Progress": 2,
      "Blocked": 3,
      "Done": 4,
    };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity) ; 
  });

  if (authLoading || isLoadingTasks) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Task Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button onClick={() => { resetCreateForm(); setIsCreateTaskDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Task
          </Button>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
         <Card className="shadow-lg">
         <CardContent className="text-center py-10 text-muted-foreground">
            <ListChecks className="mx-auto h-12 w-12 mb-3 text-gray-400" />
           No tasks found. Create one to get started!
         </CardContent>
       </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedTasks.map((task) => (
            <Link 
              href={`/tasks/${task.id}`} 
              key={task.id} 
              className="block hover:shadow-xl transition-shadow duration-300 rounded-lg"
            >
              <Card className="flex flex-col h-full shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline text-lg">{task.name}</CardTitle>
                  <CardDescription>Due: {task.dueDate ? format(task.dueDate, "PPP") : "No due date"}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="text-sm text-muted-foreground">Assigned to: {task.assignedTo}</div>
                  <div className="flex items-center justify-between">
                      <Badge className={cn(statusColors[task.status], "text-white")}>{task.status}</Badge>
                      <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}>
                          {task.priority}
                      </Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" indicatorClassName={task.progress === 100 ? "bg-green-500" : task.status === "Blocked" ? "bg-red-500" : "bg-primary"}/>
                  </div>
                </CardContent>
                 {task.description && (
                  <CardFooter className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  </CardFooter>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
      
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={(isOpen) => { if (!isSubmittingTask) { setIsCreateTaskDialogOpen(isOpen); if (!isOpen) resetCreateForm();}}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="newTaskName" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Task Title</Label>
              <Input id="newTaskName" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Enter task title" disabled={isSubmittingTask}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newDescription" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</Label>
              <Textarea id="newDescription" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Enter task description" rows={3} disabled={isSubmittingTask}/>
            </div>
            
            <div className="space-y-1.5">
                <Label className="flex items-center text-sm font-medium text-muted-foreground"><AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground"/>Priority</Label>
                <div className="flex space-x-1 border border-input rounded-md p-0.5">
                    {(["Low", "Medium", "High"] as Task["priority"][]).map((p) => (
                        <Button
                        key={p}
                        type="button"
                        variant={newPriority === p ? "default" : "ghost"}
                        onClick={() => setNewPriority(p)}
                        className={cn("flex-1 h-9 text-sm", newPriority === p ? "shadow-sm" : "text-muted-foreground")}
                        disabled={isSubmittingTask}
                        >
                        {p}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="newDueDate" className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Due Date (Optional)</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        !newDueDate && "text-muted-foreground"
                        )}
                        disabled={isSubmittingTask}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDueDate ? format(newDueDate, "PPP") : <span>Select Due Date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <DynamicCalendar
                        mode="single"
                        selected={newDueDate}
                        onSelect={setNewDueDate}
                        initialFocus
                        disabled={isSubmittingTask}
                    />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="newAssignedTo" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Assignee(s)</Label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmittingTask || isLoadingOfficeMembers}>
                        {isLoadingOfficeMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {newAssignedTo.length === 0 && !isLoadingOfficeMembers
                        ? "Select Assignee(s)"
                        : newAssignedTo.length > 2 
                            ? `${newAssignedTo.slice(0,2).join(', ')} +${newAssignedTo.length - 2} more`
                            : newAssignedTo.join(', ')}
                        
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(var(--radix-dialog-content-width)-2rem)] sm:w-[calc(var(--radix-dialog-content-width)-3rem)] max-w-md">
                    <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {currentOfficeMembers.length > 0 && (
                        <DropdownMenuCheckboxItem
                        checked={newAssignedTo.length === currentOfficeMembers.length && currentOfficeMembers.length > 0}
                        onCheckedChange={(checked) => {
                            if (checked) {
                            setNewAssignedTo(currentOfficeMembers.map(m => m.name));
                            } else {
                            setNewAssignedTo([]);
                            }
                        }}
                        disabled={isLoadingOfficeMembers}
                        >
                        Select All ({currentOfficeMembers.length})
                        </DropdownMenuCheckboxItem>
                    )}
                    <DropdownMenuSeparator />
                    {isLoadingOfficeMembers ? (
                        <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : currentOfficeMembers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No other members in your primary office to assign.</div>
                    ) : (
                        <div className="max-h-48 overflow-y-auto">
                        {currentOfficeMembers.map((member) => (
                        <DropdownMenuCheckboxItem
                            key={member.userId}
                            checked={newAssignedTo.includes(member.name)}
                            onCheckedChange={(checked) => {
                            setNewAssignedTo((prev) =>
                                checked
                                ? [...prev, member.name]
                                : prev.filter((name) => name !== member.name)
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

          </div>
          <DialogFooter className="sm:justify-between pt-2">
            <Button variant="outline" className="w-full sm:w-auto h-10" onClick={() => setIsCreateTaskDialogOpen(false)} disabled={isSubmittingTask}>Cancel</Button>
            <Button onClick={handleCreateTask} className="w-full sm:w-auto h-10" disabled={isSubmittingTask}>
                {isSubmittingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    
