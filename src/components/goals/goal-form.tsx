
"use client";

import { useForm, Controller, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import { Loader2, CalendarIcon as CalendarLucide, Info, Percent, Hash, Edit, Users as UsersIcon, Target } from "lucide-react";
import type { Goal, OfficeMember } from '@/types';
import type { GoalFormValues } from '@/app/(app)/goals/page';

const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});

interface GoalFormProps {
  form: UseFormReturn<GoalFormValues>;
  onSubmit: SubmitHandler<GoalFormValues>;
  isSubmitting: boolean;
  currentOfficeMembers: OfficeMember[];
  onCancel: () => void;
  initialData?: Goal | null;
}

export default function GoalForm({ form, onSubmit, isSubmitting, currentOfficeMembers, onCancel }: GoalFormProps) {
  const { register, control, handleSubmit, watch, setValue } = form;
  const targetValue = watch('targetValue');
  const currentValue = watch('currentValue');
  const unit = watch('unit');
  const participantIds = watch('participantIds') || [];

  const getSelectedParticipantNamesForDialog = () => {
    if (participantIds.length === 0) return "Select Participant(s)";
    const names = participantIds
        .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
        .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0,2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Participant(s)";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Goal Name</Label>
          <Input id="name" {...register('name')} placeholder="e.g., Increase Sales" disabled={isSubmitting}/>
          {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description</Label>
          <Textarea id="description" {...register('description')} placeholder="Briefly describe the goal" rows={3} disabled={isSubmitting}/>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentValue" className="flex items-center text-sm font-medium text-muted-foreground"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Current Value</Label>
            <Input id="currentValue" type="number" {...register('currentValue')} disabled={isSubmitting}/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="targetValue" className="flex items-center text-sm font-medium text-muted-foreground"><Target className="mr-2 h-4 w-4 text-muted-foreground"/>Target Value</Label>
            <Input id="targetValue" type="number" {...register('targetValue')} disabled={isSubmitting}/>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unit" className="flex items-center text-sm font-medium text-muted-foreground"><Percent className="mr-2 h-4 w-4 text-muted-foreground"/>Unit</Label>
          <Input id="unit" {...register('unit')} placeholder="e.g., %, USD, Tasks, Bugs (Lower is better)" disabled={isSubmitting}/>
          <p className="text-xs text-muted-foreground">Add '(Lower is better)' to the unit if applicable, e.g., 'Bugs (Lower is better)'.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center text-sm font-medium text-muted-foreground">Set Current Value ({currentValue} {unit.replace("(Lower is better)","").trim()})</Label>
          <Slider
              value={[currentValue]}
              max={targetValue > 0 ? targetValue * (unit.toLowerCase().includes("lower is better") ? 2 : 1.2) : 100}
              min={0}
              step={targetValue > 1000 ? 100 : (targetValue > 100 ? 10 : 1)}
              onValueChange={(value) => setValue('currentValue', value[0])}
              disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarLucide className="mr-2 h-4 w-4 text-muted-foreground"/>Deadline (Optional)</Label>
          <Controller
            control={control}
            name="deadline"
            render={({ field }) => (
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="deadline"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                    disabled={isSubmitting}
                  >
                    <CalendarLucide className="mr-2 h-4 w-4" />
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
          <Label htmlFor="participantIds" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Participants (Optional)</Label>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="outline" id="participantIds" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || currentOfficeMembers.length === 0}>
                  {currentOfficeMembers.length === 0 ? "No members in office" : getSelectedParticipantNamesForDialog()}
              </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[calc(var(--radix-popover-content-width)-1rem)]">
                <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Controller
                    control={control}
                    name="participantIds"
                    render={({ field }) => (
                        <>
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
                              <Avatar className="h-6 w-6 mr-2"><AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.substring(0,1)}`} alt={member.name} /><AvatarFallback>{member.name.substring(0,1)}</AvatarFallback></Avatar>
                              {member.name}
                              </div>
                          </DropdownMenuCheckboxItem>
                          ))}
                        </>
                    )}
                />
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
