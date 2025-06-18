
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, ListChecks, Filter, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Task } from "@/types";
import { statusColors, addTaskForUser, getTasksForUser } from "@/lib/firebase/firestore/tasks";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { getOfficesForUser, type Office } from "@/lib/firebase/firestore/offices";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";


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

  const [newTaskName, setNewTaskName] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(new Date());
  const [newStatus, setNewStatus] = useState<Task["status"]>("To Do");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("Medium");
  const [newDescription, setNewDescription] = useState("");
  const [newProgress, setNewProgress] = useState(0);
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
    setNewAssignedTo("");
    setNewDueDate(new Date());
    setNewStatus("To Do");
    setNewPriority("Medium");
    setNewDescription("");
    setNewProgress(0);
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
      assignedTo: newAssignedTo || "Unassigned",
      dueDate: newDueDate || new Date(),
      status: newStatus,
      priority: newPriority,
      description: newDescription,
      progress: newProgress,
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
    return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
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
      
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Task</DialogTitle>
            <DialogDescription>Fill in the details for the new task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="newTaskName">Task Name</Label>
              <Input id="newTaskName" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="e.g., Design new logo" disabled={isSubmittingTask}/>
            </div>
             <div className="grid gap-2">
              <Label htmlFor="newDescription">Description (Optional)</Label>
              <Textarea id="newDescription" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detailed description of the task" disabled={isSubmittingTask}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="newAssignedTo">Assigned To</Label>
                  <Input id="newAssignedTo" value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)} placeholder="e.g., John Doe" disabled={isSubmittingTask}/>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="newDueDate">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newDueDate && "text-muted-foreground"
                          )}
                          disabled={isSubmittingTask}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newDueDate ? format(newDueDate, "PPP") : <span>Pick a date</span>}
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="newStatus">Status</Label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Task["status"])} disabled={isSubmittingTask}>
                        <SelectTrigger id="newStatus">
                        <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="newPriority">Priority</Label>
                    <Select value={newPriority} onValueChange={(value) => setNewPriority(value as Task["priority"])} disabled={isSubmittingTask}>
                        <SelectTrigger id="newPriority">
                        <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="newProgress">Progress ({newProgress}%)</Label>
                <Input id="newProgress" type="range" min="0" max="100" value={newProgress} onChange={(e) => setNewProgress(parseInt(e.target.value))} disabled={isSubmittingTask}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)} disabled={isSubmittingTask}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={isSubmittingTask}>
                {isSubmittingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
