
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ArrowLeft, Save, Trash2, ListChecks } from "lucide-react";
import type { Task } from "@/types";
import { getTaskById, updateTask, deleteTask, statusColors } from "@/lib/data/tasks-data";
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const taskId = params.taskId as string;

  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [taskName, setTaskName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<Task["status"]>("To Do");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (taskId) {
      const taskData = getTaskById(taskId);
      if (taskData) {
        setCurrentTask(taskData);
        setTaskName(taskData.name);
        setAssignedTo(taskData.assignedTo);
        setDueDate(taskData.dueDate);
        setStatus(taskData.status);
        setPriority(taskData.priority);
        setDescription(taskData.description || "");
        setProgress(taskData.progress);
      }
      setIsLoading(false);
    }
  }, [taskId]);

  const handleSaveChanges = (e: FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;

    const updatedTaskData: Task = {
      ...currentTask,
      name: taskName,
      assignedTo,
      dueDate: dueDate || currentTask.dueDate, // Keep original if undefined
      status,
      priority,
      description,
      progress,
    };

    const success = updateTask(updatedTaskData);
    if (success) {
      toast({ title: "Task Updated", description: "Your changes have been saved." });
      router.push("/tasks");
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not update task." });
    }
  };

  const handleDelete = () => {
    if (!currentTask) return;
    const success = deleteTask(currentTask.id);
    if (success) {
      toast({ title: "Task Deleted", description: `"${currentTask.name}" has been removed.` });
      router.push("/tasks");
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
    }
    setIsDeleteDialogOpen(false);
  };

  if (isLoading) {
    return <div className="container mx-auto p-8 text-center">Loading task details...</div>;
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
  
  if (!currentTask) return null; // Should be covered by above, but for TS

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
          <CardContent className="grid gap-6 py-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 sm:pr-3">
            <div className="grid gap-2">
              <Label htmlFor="taskName">Task Name</Label>
              <Input id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of the task" rows={4}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Task["status"])}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Task["priority"])}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="progress">Progress</Label>
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
              />
               <Progress value={progress} className="h-2 mt-1" indicatorClassName={progress === 100 ? "bg-green-500" : status === "Blocked" ? "bg-red-500" : "bg-primary"}/>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="w-full sm:w-auto mb-2 sm:mb-0">
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
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
