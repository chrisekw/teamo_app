
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Edit3, Trash2, Loader2, CalendarDays, ChevronDown, Briefcase, Users as UsersIcon, Info, Percent, Hash, Edit as EditIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, OfficeMember, Office } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import dynamic from 'next/dynamic';
import { addTaskToOffice, getTasksVisibleToUserInOffice, updateTaskInOffice, deleteTaskFromOffice } from "@/lib/firebase/firestore/tasks";
import { getOfficesForUser, getMembersForOffice } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});

const statusColors: Record<Task["status"], string> = {
  "To Do": "border-gray-500",
  "In Progress": "border-blue-500",
  "Done": "border-green-500",
  "Blocked": "border-red-500",
};

const priorityColors: Record<Task["priority"], string> = {
  "Low": "bg-gray-400",
  "Medium": "bg-yellow-500",
  "High": "bg-red-500",
}

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [currentTaskToEdit, setCurrentTaskToEdit] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeData, setIsLoadingOfficeData] = useState(true);

  // Form state
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([]);
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>();
  const [taskStatus, setTaskStatus] = useState<Task["status"]>("To Do");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("Medium");
  const [taskProgress, setTaskProgress] = useState(0);


  const fetchOfficeData = useCallback(async () => {
    if (user) {
      setIsLoadingOfficeData(true);
      try {
        const offices = await getOfficesForUser(user.uid);
        setUserOffices(offices);
        if (offices.length > 0) {
          const currentActiveOffice = offices[0]; // Default to first office
          setActiveOffice(currentActiveOffice);
          const members = await getMembersForOffice(currentActiveOffice.id);
          setCurrentOfficeMembers(members);
        } else {
          setActiveOffice(null);
          setCurrentOfficeMembers([]);
        }
      } catch (error) {
        console.error("Failed to fetch office data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load office data." });
      } finally {
        setIsLoadingOfficeData(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchOfficeData();
    }
  }, [authLoading, user, fetchOfficeData]);

  const fetchTasks = useCallback(async () => {
    if (user && activeOffice) {
      setIsLoadingTasks(true);
      try {
        const userTasks = await getTasksVisibleToUserInOffice(activeOffice.id, user.uid);
        setTasks(userTasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch tasks." });
      } finally {
        setIsLoadingTasks(false);
      }
    } else {
      setTasks([]);
      setIsLoadingTasks(false);
    }
  }, [user, activeOffice, toast]);

  useEffect(() => {
    if (!authLoading && user && activeOffice) {
      fetchTasks();
    } else if (!activeOffice && !isLoadingOfficeData) { // if no active office and office data loading done
        setTasks([]);
        setIsLoadingTasks(false);
    }
  }, [authLoading, user, activeOffice, fetchTasks, isLoadingOfficeData]);

  const resetForm = () => {
    setTaskName("");
    setTaskDescription("");
    setTaskAssigneeIds([]);
    setTaskDueDate(undefined);
    setTaskStatus("To Do");
    setTaskPriority("Medium");
    setTaskProgress(0);
    setCurrentTaskToEdit(null);
  };

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setCurrentTaskToEdit(task);
      setTaskName(task.name);
      setTaskDescription(task.description || "");
      setTaskAssigneeIds(task.assigneeIds || []);
      setTaskDueDate(task.dueDate);
      setTaskStatus(task.status);
      setTaskPriority(task.priority);
      setTaskProgress(task.progress);
    } else {
      resetForm();
    }
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!user || !activeOffice) {
      toast({ variant: "destructive", title: "Error", description: "User or active office not found." });
      return;
    }
    if (!taskName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Task name cannot be empty." });
      return;
    }

    setIsSubmitting(true);

    const selectedAssigneeDetails = taskAssigneeIds
      .map(id => currentOfficeMembers.find(m => m.userId === id))
      .filter(Boolean) as OfficeMember[];
    
    const assigneesDisplay = selectedAssigneeDetails.map(m => m.name).join(', ') || "Unassigned";

    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'> = {
      name: taskName,
      description: taskDescription || undefined,
      assigneeIds: taskAssigneeIds,
      assigneesDisplay: assigneesDisplay,
      dueDate: taskDueDate,
      status: taskStatus,
      priority: taskPriority,
      progress: taskProgress,
    };
    const actorName = user.displayName || user.email || "User";

    try {
      if (currentTaskToEdit) {
        await updateTaskInOffice(activeOffice.id, currentTaskToEdit.id, taskData, user.uid, actorName, activeOffice.name);
        toast({ title: "Task Updated", description: `"${taskData.name}" has been updated.` });
      } else {
        await addTaskToOffice(activeOffice.id, user.uid, taskData, actorName, activeOffice.name);
        toast({ title: "Task Added", description: `"${taskData.name}" has been added.` });
      }
      fetchTasks();
      setIsTaskDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save task." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user || !activeOffice) return;
    setIsSubmitting(true);
    try {
      await deleteTaskFromOffice(activeOffice.id, taskId, user.uid, user.displayName || "User");
      toast({ title: "Task Deleted", description: "The task has been removed." });
      fetchTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedAssigneeNamesForDialog = () => {
    if (taskAssigneeIds.length === 0) return "Select Assignee(s)";
    const names = taskAssigneeIds
        .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
        .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0,2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Assignee(s)";
  };

  const taskStatuses: Task["status"][] = ["To Do", "In Progress", "Done", "Blocked"];
  const tasksByStatus = taskStatuses.reduce((acc, status) => {
    acc[status] = tasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<Task["status"], Task[]>);

  if (authLoading || isLoadingOfficeData) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">
          Task Management {activeOffice ? `for ${activeOffice.name}` : ''}
        </h1>
        <Button onClick={() => handleOpenDialog()} disabled={isSubmitting || !activeOffice}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
        </Button>
      </div>

      {!activeOffice && !isLoadingOfficeData && (
        <Card className="shadow-lg">
          <CardContent className="text-center py-10 text-muted-foreground">
            <Briefcase className="mx-auto h-12 w-12 mb-3 text-gray-400" />
            Please create or select an office to manage tasks.
            <Button asChild variant="link" className="block mx-auto mt-2">
              <Link href="/office-designer">Go to Office Designer</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {activeOffice && isLoadingTasks && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {taskStatuses.map(status => (
            <div key={status}>
              <h2 className="text-xl font-semibold mb-3 capitalize">{status}</h2>
              <Skeleton className="h-40 w-full rounded-md" />
            </div>
          ))}
        </div>
      )}
      
      {activeOffice && !isLoadingTasks && tasks.length === 0 && (
         <div className="text-center py-12 bg-muted/10 rounded-lg">
          <Edit3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No tasks found for {activeOffice.name}.</p>
          <p className="text-sm text-muted-foreground">Click "Create New Task" to get started.</p>
        </div>
      )}

      {activeOffice && !isLoadingTasks && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {taskStatuses.map((status) => (
            <div key={status} className="space-y-4">
              <h2 className={`text-xl font-semibold mb-3 capitalize p-2 rounded-md border-l-4 ${statusColors[status]}`}>
                {status} ({tasksByStatus[status].length})
              </h2>
              {tasksByStatus[status].length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No tasks in this status.</p>
              ) : (
                tasksByStatus[status].map((task) => (
                  <Card key={task.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="font-headline text-base leading-tight hover:text-primary transition-colors">
                           <Link href={`/tasks/${activeOffice.id}/${task.id}`}>{task.name}</Link>
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(task)} disabled={isSubmitting}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isSubmitting}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                       <CardDescription className="text-xs pt-1">
                          Priority: <Badge variant="outline" className="px-1.5 py-0.5"><div className={`h-2 w-2 rounded-full mr-1 ${priorityColors[task.priority]}`}></div>{task.priority}</Badge>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0 pb-3">
                      {task.assigneesDisplay && (
                        <div className="flex items-center space-x-1 mb-2">
                           <UsersIcon className="h-3 w-3 text-muted-foreground" />
                           <span className="text-xs text-muted-foreground truncate">{task.assigneesDisplay}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          Due: {format(task.dueDate, "MMM d, yyyy")}
                        </p>
                      )}
                      {task.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 text-muted-foreground">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" indicatorClassName={task.progress === 100 ? "bg-green-500" : "bg-primary"}/>
                      </div>
                    </CardContent>
                     <CardFooter className="pt-0 pb-3">
                       <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleOpenDialog(task)} disabled={isSubmitting}>Update Status/Progress</Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isTaskDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsTaskDialogOpen(isOpen); if(!isOpen) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentTaskToEdit ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {currentTaskToEdit ? "Update the details for this task." : "Define a new task for your team."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="taskName" className="flex items-center text-sm font-medium text-muted-foreground"><EditIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Task Name</Label>
              <Input id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Enter task name" disabled={isSubmitting}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDescription" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</Label>
              <Textarea id="taskDescription" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Provide task details" rows={3} disabled={isSubmitting}/>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taskAssigneeIds" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Assign To (Optional)</Label>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="outline" id="taskAssigneeIds" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || isLoadingOfficeData || currentOfficeMembers.length === 0}>
                      {isLoadingOfficeData && currentOfficeMembers.length === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {getSelectedAssigneeNamesForDialog()}
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(var(--radix-dialog-content-width)-2rem)] sm:w-[calc(var(--radix-dialog-content-width)-3rem)] max-w-md">
                  <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentOfficeMembers.length > 0 && (
                      <DropdownMenuCheckboxItem
                      checked={taskAssigneeIds.length === currentOfficeMembers.length && currentOfficeMembers.length > 0}
                      onCheckedChange={(checked) => {
                          if (checked) {
                          setTaskAssigneeIds(currentOfficeMembers.map(m => m.userId));
                          } else {
                          setTaskAssigneeIds([]);
                          }
                      }}
                      disabled={isLoadingOfficeData}
                      >
                      Select All ({currentOfficeMembers.length})
                      </DropdownMenuCheckboxItem>
                  )}
                  <DropdownMenuSeparator />
                  {isLoadingOfficeData && currentOfficeMembers.length === 0 ? (
                      <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : currentOfficeMembers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No members in this office to assign.</div>
                  ) : (
                      <div className="max-h-48 overflow-y-auto">
                      {currentOfficeMembers.map((member) => (
                      <DropdownMenuCheckboxItem
                          key={member.userId}
                          checked={taskAssigneeIds.includes(member.userId)}
                          onCheckedChange={(checked) => {
                          setTaskAssigneeIds((prev) =>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="taskDueDate" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="taskDueDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !taskDueDate && "text-muted-foreground")} disabled={isSubmitting}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {taskDueDate ? format(taskDueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <DynamicCalendar mode="single" selected={taskDueDate} onSelect={setTaskDueDate} initialFocus disabled={isSubmitting}/>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taskStatus" className="flex items-center text-sm font-medium text-muted-foreground"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Status</Label>
                <Select value={taskStatus} onValueChange={(value) => setTaskStatus(value as Task["status"])} disabled={isSubmitting}>
                  <SelectTrigger id="taskStatus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="taskPriority" className="flex items-center text-sm font-medium text-muted-foreground"><Percent className="mr-2 h-4 w-4 text-muted-foreground"/>Priority</Label>
                    <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as Task["priority"])} disabled={isSubmitting}>
                    <SelectTrigger id="taskPriority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="taskProgress" className="flex items-center text-sm font-medium text-muted-foreground"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Progress ({taskProgress}%)</Label>
                    <Slider id="taskProgress" value={[taskProgress]} onValueChange={(value) => setTaskProgress(value[0])} max={100} step={5} disabled={isSubmitting}/>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentTaskToEdit ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
