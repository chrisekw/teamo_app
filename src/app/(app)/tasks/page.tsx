
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, ListChecks, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Task } from "@/types";
import { mockTasks as initialMockTasks, statusColors, addTask } from "@/lib/data/tasks-data"; // Import from shared data

export default function TasksPage() {
  // Use a state to force re-render when mockTasks array is mutated by other pages or actions.
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);

  // Form state for new task dialog
  const [newTaskName, setNewTaskName] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(new Date());
  const [newStatus, setNewStatus] = useState<Task["status"]>("To Do");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("Medium");
  const [newDescription, setNewDescription] = useState("");
  const [newProgress, setNewProgress] = useState(0);

  useEffect(() => {
    // This effect can be used to listen to events that might indicate mockTasks changed,
    // or simply rely on navigation to re-render the component.
    // For now, renderTrigger handles local changes.
  }, [renderTrigger]);


  const resetCreateForm = () => {
    setNewTaskName("");
    setNewAssignedTo("");
    setNewDueDate(new Date());
    setNewStatus("To Do");
    setNewPriority("Medium");
    setNewDescription("");
    setNewProgress(0);
  };

  const handleCreateTask = () => {
    const taskData = {
      name: newTaskName,
      assignedTo: newAssignedTo,
      dueDate: newDueDate || new Date(),
      status: newStatus,
      priority: newPriority,
      description: newDescription,
      progress: newProgress,
    };
    addTask(taskData);
    setIsCreateTaskDialogOpen(false);
    resetCreateForm();
    setRenderTrigger(val => val + 1); // Force re-render to show the new task
  };
  
  // Sort tasks: To Do, In Progress, Blocked, Done. Then by due date.
  const sortedTasks = [...initialMockTasks].sort((a, b) => {
    const statusOrder: Record<Task["status"], number> = {
      "To Do": 1,
      "In Progress": 2,
      "Blocked": 3,
      "Done": 4,
    };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.dueDate.getTime() - b.dueDate.getTime();
  });


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
            <Link href={`/tasks/${task.id}`} key={task.id} legacyBehavior>
              <a className="block hover:shadow-xl transition-shadow duration-300 rounded-lg">
                <Card className="flex flex-col h-full shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-headline text-lg">{task.name}</CardTitle>
                    <CardDescription>Due: {format(task.dueDate, "PPP")}</CardDescription>
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
              </a>
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
              <Input id="newTaskName" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="e.g., Design new logo" />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="newDescription">Description (Optional)</Label>
              <Textarea id="newDescription" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detailed description of the task" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="newAssignedTo">Assigned To</Label>
                  <Input id="newAssignedTo" value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)} placeholder="e.g., John Doe" />
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
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newDueDate ? format(newDueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newDueDate}
                          onSelect={setNewDueDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                 </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="newStatus">Status</Label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Task["status"])}>
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
                    <Select value={newPriority} onValueChange={(value) => setNewPriority(value as Task["priority"])}>
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
                <Input id="newProgress" type="range" min="0" max="100" value={newProgress} onChange={(e) => setNewProgress(parseInt(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
