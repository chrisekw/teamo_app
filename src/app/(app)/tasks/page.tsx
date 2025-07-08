
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Edit3, Trash2, Loader2, CalendarDays, MoreHorizontal, Briefcase, Users as UsersIcon } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, OfficeMember, Office } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import dynamic from 'next/dynamic';
import { addTaskToOffice, onTasksUpdate, updateTaskInOffice, deleteTaskFromOffice } from "@/lib/firebase/firestore/tasks";
import { onUserOfficesUpdate, onMembersUpdate } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Unsubscribe } from "firebase/firestore";
import * as z from 'zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TaskForm = dynamic(() => import('@/components/tasks/task-form'), {
  ssr: false,
  loading: () => <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name cannot be empty."),
  description: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.date().optional(),
  status: z.enum(["To Do", "In Progress", "Done", "Blocked"]),
  priority: z.enum(["Low", "Medium", "High"]),
  progress: z.number().min(0).max(100),
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;

const statusColors: Record<Task["status"], string> = {
  "To Do": "border-gray-500",
  "In Progress": "border-blue-500",
  "Done": "border-green-500",
  "Blocked": "border-red-500",
};

const priorityBorderClass: Record<Task["priority"], string> = {
  "High": "border-destructive",
  "Medium": "border-yellow-500",
  "Low": "border-muted",
};

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [currentTaskToEdit, setCurrentTaskToEdit] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeData, setIsLoadingOfficeData] = useState(true);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      assigneeIds: [],
      status: "To Do",
      priority: "Medium",
      progress: 0,
    }
  });

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingOfficeData(true);
      const unsubscribe = onUserOfficesUpdate(user.uid, (offices) => {
        setUserOffices(offices);
        if (offices.length > 0) {
          const officeIdFromUrl = searchParams.get('officeId');
          const officeFromUrl = offices.find(o => o.id === officeIdFromUrl);
          setActiveOffice(officeFromUrl || offices[0]);
        } else {
          setActiveOffice(null);
        }
        setIsLoadingOfficeData(false);
      });
      return () => unsubscribe();
    } else if (!user && !authLoading) {
      setUserOffices([]);
      setActiveOffice(null);
      setIsLoadingOfficeData(false);
    }
  }, [user, authLoading, searchParams]);

  useEffect(() => {
    if (activeOffice && searchParams.get('officeId') !== activeOffice.id) {
        router.replace(`${pathname}?officeId=${activeOffice.id}`, { scroll: false });
    }
  }, [activeOffice, searchParams, router, pathname]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (activeOffice) {
      unsubscribe = onMembersUpdate(activeOffice.id, setCurrentOfficeMembers);
    } else {
      setCurrentOfficeMembers([]);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeOffice]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (user && activeOffice) {
      setIsLoadingTasks(true);
      unsubscribe = onTasksUpdate(activeOffice.id, user.uid, (userTasks) => {
        setTasks(userTasks);
        setIsLoadingTasks(false);
      });
    } else {
      setTasks([]);
      setIsLoadingTasks(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, activeOffice]);

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setCurrentTaskToEdit(task);
      form.reset({
        name: task.name,
        description: task.description || "",
        assigneeIds: task.assigneeIds || [],
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority,
        progress: task.progress,
      });
    } else {
      setCurrentTaskToEdit(null);
      form.reset();
    }
    setIsTaskDialogOpen(true);
  };

  const onSaveTask: SubmitHandler<TaskFormValues> = async (data) => {
    if (!user || !activeOffice) {
      toast({ variant: "destructive", title: "Error", description: "User or active office not found." });
      return;
    }
    setIsSubmitting(true);
    const selectedAssigneeDetails = (data.assigneeIds || [])
      .map(id => currentOfficeMembers.find(m => m.userId === id))
      .filter(Boolean) as OfficeMember[];
    const assigneesDisplay = selectedAssigneeDetails.map(m => m.name).join(', ') || "Unassigned";

    const taskData = { ...data, assigneesDisplay };
    const actorName = user.displayName || user.email || "User";

    try {
      if (currentTaskToEdit) {
        await updateTaskInOffice(activeOffice.id, currentTaskToEdit.id, taskData, user.uid, actorName, activeOffice.name);
        toast({ title: "Task Updated", description: `"${taskData.name}" has been updated.` });
      } else {
        await addTaskToOffice(activeOffice.id, user.uid, taskData, actorName, activeOffice.name);
        toast({ title: "Task Added", description: `"${taskData.name}" has been added.` });
      }
      setIsTaskDialogOpen(false);
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
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfficeChange = (officeId: string) => {
    if (officeId && officeId !== activeOffice?.id) {
        const newActiveOffice = userOffices.find(o => o.id === officeId);
        if (newActiveOffice) {
            setActiveOffice(newActiveOffice);
        }
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">
          Task Management
        </h1>
        <Button onClick={() => handleOpenDialog()} disabled={isSubmitting || !activeOffice}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
        </Button>
      </div>

       <div className="mb-6">
          <Label htmlFor="office-switcher" className="text-sm font-medium text-muted-foreground">Active Office</Label>
          <Select value={activeOffice?.id || ''} onValueChange={handleOfficeChange} disabled={userOffices.length <= 1}>
              <SelectTrigger id="office-switcher" className="w-full sm:w-[280px] mt-1">
                  <SelectValue placeholder="Select an office" />
              </SelectTrigger>
              <SelectContent>
                  {userOffices.map(office => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
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
                tasksByStatus[status].map((task) => {
                  const priorityBorder = priorityBorderClass[task.priority];
                  return (
                    <Card
                      key={task.id}
                      className={cn("shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border-l-4", priorityBorder)}
                      onClick={() => handleOpenDialog(task)}
                    >
                      <CardHeader className="flex flex-row justify-between items-start p-4 pb-2">
                        <div className="flex-1 space-y-1" >
                          <CardTitle className="text-base font-semibold leading-tight">{task.name}</CardTitle>
                          {task.description && (
                            <CardDescription className="text-sm line-clamp-2 pt-0.5">
                              {task.description}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(task); }} disabled={isSubmitting}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="mb-4">
                          <div className="flex justify-between text-xs font-medium mb-1 text-muted-foreground">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-2" indicatorClassName={task.progress === 100 ? "bg-green-500" : "bg-primary"} />
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          {task.dueDate ? (
                            <div className="flex items-center">
                              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                              <span>{format(task.dueDate, "MMM d")}</span>
                            </div>
                          ) : (
                            <div /> // Placeholder for alignment
                          )}

                          {task.assigneeIds && task.assigneeIds.length > 0 && (
                            <div className="flex -space-x-2">
                              {task.assigneeIds.slice(0, 3).map(assigneeId => { // Limit to 3 avatars
                                const member = currentOfficeMembers.find(m => m.userId === assigneeId);
                                return member ? (
                                  <Avatar key={member.userId} className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                    <AvatarFallback className="text-xs">{member.name.substring(0, 1)}</AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                              {task.assigneeIds.length > 3 && (
                                 <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback className="text-xs">+{task.assigneeIds.length - 3}</AvatarFallback>
                                 </Avatar>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isTaskDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsTaskDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentTaskToEdit ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {currentTaskToEdit ? "Update the details for this task." : "Define a new task for your team."}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TaskForm 
              form={form}
              onSubmit={onSaveTask}
              isSubmitting={isSubmitting}
              currentOfficeMembers={currentOfficeMembers}
              onCancel={() => setIsTaskDialogOpen(false)}
              initialData={currentTaskToEdit}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
}
