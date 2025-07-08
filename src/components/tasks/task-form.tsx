
"use client";

import { useForm, Controller, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CalendarDays, Users as UsersIcon, Info, Percent, Hash, Edit as EditIcon } from "lucide-react";
import type { Task, OfficeMember } from '@/types';
import type { TaskFormValues } from '@/app/(app)/tasks/page';

const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});

interface TaskFormProps {
  form: UseFormReturn<TaskFormValues>;
  onSubmit: SubmitHandler<TaskFormValues>;
  isSubmitting: boolean;
  currentOfficeMembers: OfficeMember[];
  onCancel: () => void;
  initialData?: Task | null;
}

export default function TaskForm({ form, onSubmit, isSubmitting, currentOfficeMembers, onCancel }: TaskFormProps) {
  const { register, control, handleSubmit, watch, setValue } = form;

  const progress = watch('progress');
  const assigneeIds = watch('assigneeIds') || [];

  const getSelectedAssigneeNamesForDialog = () => {
    if (assigneeIds.length === 0) return "Select Assignee(s)";
    const names = assigneeIds
        .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
        .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Assignee(s)";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="flex items-center text-sm font-medium text-muted-foreground"><EditIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Task Name</Label>
          <Input id="name" {...register('name')} placeholder="Enter task name" disabled={isSubmitting}/>
          {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</Label>
          <Textarea id="description" {...register('description')} placeholder="Provide task details" rows={3} disabled={isSubmitting}/>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assigneeIds" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Assign To (Optional)</Label>
           <Controller
            name="assigneeIds"
            control={control}
            render={({ field }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" id="assigneeIds" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || currentOfficeMembers.length === 0}>
                      {getSelectedAssigneeNamesForDialog()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(var(--radix-popover-content-width)-1rem)]">
                    <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <div className="max-h-48 overflow-y-auto">
                      {currentOfficeMembers.map((member) => (
                        <DropdownMenuCheckboxItem
                          key={member.userId}
                          checked={field.value?.includes(member.userId)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...(field.value || []), member.userId]
                              : (field.value || []).filter((id) => id !== member.userId);
                            field.onChange(newValue);
                          }}
                        >
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2"><AvatarImage src={member.avatarUrl || ''} alt={member.name} /><AvatarFallback>{member.name.substring(0,1)}</AvatarFallback></Avatar>
                            {member.name}
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
           />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dueDate" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Due Date (Optional)</Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="dueDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <DynamicCalendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmitting}/>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status" className="flex items-center text-sm font-medium text-muted-foreground"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Status</Label>
            <Controller
                name="status"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="To Do">To Do</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="Blocked">Blocked</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="priority" className="flex items-center text-sm font-medium text-muted-foreground"><Percent className="mr-2 h-4 w-4 text-muted-foreground"/>Priority</Label>
                <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="progress" className="flex items-center text-sm font-medium text-muted-foreground"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Progress ({progress}%)</Label>
                <Controller
                    name="progress"
                    control={control}
                    render={({ field }) => (
                        <Slider id="progress" value={[field.value]} onValueChange={(value) => field.onChange(value[0])} max={100} step={5} disabled={isSubmitting}/>
                    )}
                />
            </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Task
        </Button>
      </DialogFooter>
    </form>
  );
}
