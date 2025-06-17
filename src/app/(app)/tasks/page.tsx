
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Filter, Edit3, Trash2, ListChecks } from "lucide-react";
import { useState } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";

interface Task {
  id: string;
  name: string;
  assignedTo: string;
  dueDate: Date;
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: "Low" | "Medium" | "High";
  progress: number;
  description?: string;
}

const mockTasks: Task[] = [
  { id: "1", name: "Design homepage UI", assignedTo: "Alice", dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), status: "In Progress", priority: "High", progress: 60, description: "Create high-fidelity mockups for the new homepage." },
  { id: "2", name: "Develop API endpoints", assignedTo: "Bob", dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), status: "To Do", priority: "High", progress: 10, description: "Implement RESTful APIs for user authentication and data retrieval." },
  { id: "3", name: "Write user documentation", assignedTo: "Charlie", dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), status: "To Do", priority: "Medium", progress: 0, description: "Draft user guides and tutorials for the new features." },
  { id: "4", name: "Test payment gateway", assignedTo: "David", dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), status: "Done", priority: "High", progress: 100, description: "Thoroughly test the new payment integration." },
  { id: "5", name: "Setup CI/CD pipeline", assignedTo: "Eve", dueDate: new Date(new Date().setDate(new Date().getDate() + 12)), status: "Blocked", priority: "Medium", progress: 30, description: "Configure continuous integration and deployment pipeline. Blocked by server access." },
];

const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};


export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Form state for new/edit task
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
  const [taskName, setTaskName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [status, setStatus] = useState<Task["status"]>("To Do");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);


  const handleOpenDialog = (taskToEdit?: Task) => {
    if (taskToEdit) {
      setCurrentTask(taskToEdit);
      setTaskName(taskToEdit.name);
      setAssignedTo(taskToEdit.assignedTo);
      setDueDate(taskToEdit.dueDate);
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setDescription(taskToEdit.description || "");
      setProgress(taskToEdit.progress);
    } else {
      setCurrentTask({}); 
      setTaskName("");
      setAssignedTo("");
      setDueDate(new Date()); 
      setStatus("To Do");
      setPriority("Medium");
      setDescription("");
      setProgress(0);
    }
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = () => {
    const taskData = {
      name: taskName,
      assignedTo,
      dueDate: dueDate || new Date(),
      status,
      priority,
      description,
      progress
    };

    if (currentTask.id) { 
      setTasks(tasks.map(t => t.id === currentTask.id ? { ...t, ...taskData } : t));
    } else { 
      setTasks([...tasks, { ...taskData, id: Date.now().toString() }]);
    }
    setIsTaskDialogOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    // Consider adding a confirmation dialog here for better UX
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const renderDesktopView = () => (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />All Tasks</CardTitle>
        <CardDescription>Overview of all tasks assigned to your team.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{task.name}</TableCell>
                <TableCell>{task.assignedTo}</TableCell>
                <TableCell>{task.dueDate.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={cn(statusColors[task.status], "text-white")}>{task.status}</Badge>
                </TableCell>
                <TableCell>
                   <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}>
                      {task.priority}
                   </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <span>{task.progress}%</span>
                    <Progress value={task.progress} className="w-20 h-2" indicatorClassName={task.progress === 100 ? "bg-green-500" : task.status === "Blocked" ? "bg-red-500" : "bg-primary"}/>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleOpenDialog(task)}>
                      <Edit3 className="h-4 w-4"/>
                  </Button>
                   <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {tasks.length === 0 && (
           <div className="text-center py-10 text-muted-foreground">
             No tasks found. Create one to get started!
           </div>
         )}
      </CardContent>
    </Card>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <CardTitle className="text-base font-semibold leading-tight">{task.name}</CardTitle>
            <div className="flex space-x-0.5 -mr-2 -mt-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(task)}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTask(task.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {task.description && <p className="text-xs text-muted-foreground pb-2">{task.description}</p>}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Assigned To:</span>
              <span className="font-medium">{task.assignedTo}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium">{task.dueDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={cn(statusColors[task.status], "text-white text-xs px-1.5 py-0.5")}>{task.status}</Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Priority:</span>
              <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"} className="text-xs px-1.5 py-0.5">
                {task.priority}
              </Badge>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1.5" indicatorClassName={task.progress === 100 ? "bg-green-500" : task.status === "Blocked" ? "bg-red-500" : "bg-primary"}/>
            </div>
          </CardContent>
        </Card>
      ))}
      {tasks.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="text-center py-10 text-muted-foreground">
             <ListChecks className="mx-auto h-12 w-12 mb-3 text-gray-400" />
            No tasks found. Create one to get started!
          </CardContent>
        </Card>
       )}
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Task Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Task
          </Button>
        </div>
      </div>

      {isMobile ? renderMobileView() : renderDesktopView()}
      
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentTask.id ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {currentTask.id ? "Update the details of this task." : "Fill in the details for the new task."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="taskName">Task Name</Label>
              <Input id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="e.g., Design new logo" />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of the task" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="e.g., John Doe" />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                 </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as Task["status"])}>
                        <SelectTrigger id="status">
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
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(value) => setPriority(value as Task["priority"])}>
                        <SelectTrigger id="priority">
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
                <Label htmlFor="progress">Progress ({progress}%)</Label>
                <Input id="progress" type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(parseInt(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTask}>{currentTask.id ? "Save Changes" : "Create Task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


    