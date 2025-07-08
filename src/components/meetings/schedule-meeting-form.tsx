
"use client";

import { useForm, Controller, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CalendarDays, Clock, Edit, Repeat, Users as UsersIcon, Video } from "lucide-react";
import type { OfficeMember } from '@/types';
import type { ScheduleMeetingValues } from '@/app/(app)/meetings/page';

const ShadCNCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});

interface ScheduleMeetingFormProps {
  form: UseFormReturn<ScheduleMeetingValues>;
  onSubmit: SubmitHandler<ScheduleMeetingValues>;
  isSubmitting: boolean;
  currentOfficeMembers: OfficeMember[];
  onCancel: () => void;
}

export default function ScheduleMeetingForm({ form, onSubmit, isSubmitting, currentOfficeMembers, onCancel }: ScheduleMeetingFormProps) {
  const { register, control, handleSubmit, watch } = form;
  const participantIds = watch('participantIds') || [];

  const getSelectedParticipantNamesForDialog = () => {
    if (participantIds.length === 0) return "Select Participants";
    const names = participantIds
        .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
        .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Participants";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Meeting Title</Label>
          <Input id="title" {...register('title')} placeholder="Enter meeting title" disabled={isSubmitting}/>
          {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</Label>
          <Textarea id="description" {...register('description')} placeholder="Enter meeting description" rows={3} disabled={isSubmitting}/>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Start Date & Time</Label>
            <div className="flex gap-2">
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="startDate" variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "MMM d, yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><ShadCNCalendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isSubmitting}/></PopoverContent>
                  </Popover>
                )}
              />
              <Input id="startTime" type="time" {...register('startTime')} className="w-auto" disabled={isSubmitting}/>
            </div>
            {form.formState.errors.startTime && <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration" className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Duration</Label>
            <Controller
                control={control}
                name="durationMinutes"
                render={({ field }) => (
                    <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                        disabled={isSubmitting}
                    >
                        <SelectTrigger id="duration"><SelectValue placeholder="Select duration" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1 hour 30 minutes</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <Label htmlFor="isRecurring" className="flex items-center text-sm font-medium text-muted-foreground"><Repeat className="mr-2 h-4 w-4 text-muted-foreground"/> Recurring Meeting </Label>
          <Controller name="isRecurring" control={control} render={({ field }) => <Switch id="isRecurring" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting}/>} />
        </div>

        <div className="space-y-1.5">
            <Label htmlFor="participants" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Participants</Label>
            <Controller
                name="participantIds"
                control={control}
                render={({ field }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" id="participants" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || currentOfficeMembers.length === 0}>
                                {getSelectedParticipantNamesForDialog()}
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
      </div>
      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Meeting
        </Button>
      </DialogFooter>
    </form>
  );
}
