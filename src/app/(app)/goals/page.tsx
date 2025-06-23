
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Target, Edit3, Trash2, CheckCircle2, Loader2, CalendarIcon as CalendarLucide, Info, Percent, Hash, Edit, Users as UsersIcon } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import type { Goal, OfficeMember } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { addGoalForUser, onGoalsUpdate, updateGoalForUser, deleteGoalForUser } from "@/lib/firebase/firestore/goals";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getOfficesForUser, getMembersForOffice, type Office } from "@/lib/firebase/firestore/offices";
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
import type { Unsubscribe } from "firebase/firestore";


const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});


export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [currentGoalToEdit, setCurrentGoalToEdit] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeMembers, setIsLoadingOfficeMembers] = useState(false);


  const [goalName, setGoalName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetValue, setGoalTargetValue] = useState(100);
  const [goalCurrentValue, setGoalCurrentValue] = useState(0);
  const [goalUnit, setGoalUnit] = useState("%");
  const [goalDeadline, setGoalDeadline] = useState<Date | undefined>();
  const [goalParticipantIds, setGoalParticipantIds] = useState<string[]>([]); 

  const fetchUserOfficesAndMembers = useCallback(async () => {
    if (user) {
      const offices = await getOfficesForUser(user.uid);
      setUserOffices(offices);
      if (offices.length > 0) {
        setIsLoadingOfficeMembers(true);
        try {
          const members = await getMembersForOffice(offices[0].id); // Assuming first office
          setCurrentOfficeMembers(members);
        } catch (error) {
          console.error("Failed to fetch office members:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load office members."});
        } finally {
          setIsLoadingOfficeMembers(false);
        }
      } else {
        setCurrentOfficeMembers([]);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserOfficesAndMembers();
    }
  }, [authLoading, user, fetchUserOfficesAndMembers]);


  // Real-time goal listener
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (user && !authLoading) {
      setIsLoadingGoals(true);
      unsubscribe = onGoalsUpdate(user.uid, (userGoals) => {
        setGoals(userGoals);
        setIsLoadingGoals(false);
      });
    } else {
      setIsLoadingGoals(false);
      setGoals([]);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading]);

  const resetForm = () => {
    setGoalName("");
    setGoalDescription("");
    setGoalTargetValue(100);
    setGoalCurrentValue(0);
    setGoalUnit("%");
    setGoalDeadline(undefined);
    setGoalParticipantIds([]);
    setCurrentGoalToEdit(null);
  };

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setCurrentGoalToEdit(goal);
      setGoalName(goal.name);
      setGoalDescription(goal.description);
      setGoalTargetValue(goal.targetValue);
      setGoalCurrentValue(goal.currentValue);
      setGoalUnit(goal.unit);
      setGoalDeadline(goal.deadline);
      setGoalParticipantIds(goal.participantIds || []);
    } else {
      resetForm();
    }
    setIsGoalDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    if (!goalName.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Goal name cannot be empty." });
        return;
    }

    setIsSubmitting(true);

    const selectedParticipantNames = goalParticipantIds
      .map(id => currentOfficeMembers.find(m => m.userId === id)?.name)
      .filter(Boolean) as string[];
    const participantsDisplay = selectedParticipantNames.join(', ') || "No participants";


    const goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      name: goalName,
      description: goalDescription,
      targetValue: goalTargetValue,
      currentValue: goalCurrentValue,
      unit: goalUnit,
      deadline: goalDeadline,
      participantIds: goalParticipantIds,
      participantsDisplay: participantsDisplay,
      creatorUserId: user.uid,
    };
    const actorName = user.displayName || user.email || "User";
    const officeForGoal = userOffices.length > 0 ? userOffices[0] : undefined;


    try {
      if (currentGoalToEdit) {
        await updateGoalForUser(user.uid, currentGoalToEdit.id, goalData, actorName, officeForGoal?.id, officeForGoal?.name);
        toast({ title: "Goal Updated", description: `"${goalData.name}" has been updated.` });
      } else {
        await addGoalForUser(user.uid, goalData, actorName, officeForGoal?.id, officeForGoal?.name);
        toast({ title: "Goal Added", description: `"${goalData.name}" has been added.` });
      }
      // No manual fetch needed due to real-time listener
      setIsGoalDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save goal." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    setIsSubmitting(true); 
    try {
        await deleteGoalForUser(user.uid, goalId);
        toast({ title: "Goal Deleted", description: "The goal has been removed." });
        // No manual fetch needed
    } catch (error) {
        console.error("Failed to delete goal:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete goal." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getProgressPercentage = (current: number, target: number, unit: string) => {
    if (unit.toLowerCase().includes("lower is better")) {
        if (target === 0 && current === 0) return 100;
        if (current <= target) return 100;
        if (target === 0 && current > 0) return 0; 
        return Math.max(0, ( (target * 1.5) - current) / ( (target*1.5) - target) * 100 );
    }
    if (target === 0) return current > 0 ? 100 : 0;
    return Math.min(Math.max((current / target) * 100, 0), 100);
  };
  
  const getSelectedParticipantNamesForDialog = () => {
    if (goalParticipantIds.length === 0) return "Select Participant(s)";
    const names = goalParticipantIds
        .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
        .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0,2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Participant(s)";
  };


  if (authLoading || isLoadingGoals) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Goal Tracker</h1>
        <Button onClick={() => handleOpenDialog()} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 bg-muted/10 rounded-lg">
          <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No goals defined yet.</p>
          <p className="text-sm text-muted-foreground">Click "Add New Goal" to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = getProgressPercentage(goal.currentValue, goal.targetValue, goal.unit);
            const isLowerBetterAchieved = goal.unit.toLowerCase().includes("lower is better") && goal.currentValue <= goal.targetValue;
            const isCompletedNonLowerIsBetter = progress >= 100 && !goal.unit.toLowerCase().includes("lower is better");
            const isAchieved = isCompletedNonLowerIsBetter || isLowerBetterAchieved;

            return (
            <Card key={goal.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="font-headline flex items-center">
                    <Target className="mr-2 h-5 w-5 text-primary" />
                    {goal.name}
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(goal)} disabled={isSubmitting}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)} disabled={isSubmitting}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{goal.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-2">
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Progress</span>
                    <span>{goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit.replace("(Lower is better)","").trim()}</span>
                  </div>
                  <Progress value={progress} className="h-3" indicatorClassName={isAchieved ? "bg-green-500" : "bg-primary"} />
                </div>
                {goal.deadline && (
                  <p className="text-xs text-muted-foreground">
                    Deadline: {format(goal.deadline, "PPP")}
                  </p>
                )}
                 {goal.participantsDisplay && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Participants: {goal.participantsDisplay}
                    </p>
                )}
              </CardContent>
              <CardFooter>
                {isAchieved ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Goal Achieved!
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => handleOpenDialog(goal)} disabled={isSubmitting}>Update Progress</Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
        </div>
      )}

      <Dialog open={isGoalDialogOpen} onOpenChange={(isOpen) => {if (!isSubmitting) setIsGoalDialogOpen(isOpen); if(!isOpen) resetForm();}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentGoalToEdit ? "Edit Goal" : "Add New Goal"}</DialogTitle>
            <DialogDescription>
              {currentGoalToEdit ? "Update the details for this goal." : "Define a new goal for your team."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="goalName" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Goal Name</Label>
              <Input id="goalName" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g., Increase Sales" disabled={isSubmitting}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goalDescription" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description</Label>
              <Textarea id="goalDescription" value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="Briefly describe the goal" rows={3} disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="goalCurrentValue" className="flex items-center text-sm font-medium text-muted-foreground"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Current Value</Label>
                <Input id="goalCurrentValue" type="number" value={goalCurrentValue} onChange={(e) => setGoalCurrentValue(parseFloat(e.target.value) || 0)} disabled={isSubmitting}/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goalTargetValue" className="flex items-center text-sm font-medium text-muted-foreground"><Target className="mr-2 h-4 w-4 text-muted-foreground"/>Target Value</Label>
                <Input id="goalTargetValue" type="number" value={goalTargetValue} onChange={(e) => setGoalTargetValue(parseFloat(e.target.value) || 0)} disabled={isSubmitting}/>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goalUnit" className="flex items-center text-sm font-medium text-muted-foreground"><Percent className="mr-2 h-4 w-4 text-muted-foreground"/>Unit</Label>
              <Input id="goalUnit" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} placeholder="e.g., %, USD, Tasks, Bugs (Lower is better)" disabled={isSubmitting}/>
              <p className="text-xs text-muted-foreground">Add '(Lower is better)' to the unit if applicable, e.g., 'Bugs (Lower is better)'.</p>
            </div>
            <div className="space-y-1.5">
                <Label className="flex items-center text-sm font-medium text-muted-foreground">Set Current Value ({goalCurrentValue} {goalUnit.replace("(Lower is better)","").trim()})</Label>
                <Slider
                    value={[goalCurrentValue]}
                    max={goalTargetValue > 0 ? goalTargetValue * (goalUnit.toLowerCase().includes("lower is better") ? 2 : 1.2) : 100}
                    min={0}
                    step={goalTargetValue > 1000 ? 100 : (goalTargetValue > 100 ? 10 : 1)}
                    onValueChange={(value) => setGoalCurrentValue(value[0])}
                    disabled={isSubmitting}
                />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goalDeadline" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarLucide className="mr-2 h-4 w-4 text-muted-foreground"/>Deadline (Optional)</Label>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="goalDeadline"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !goalDeadline && "text-muted-foreground")}
                    disabled={isSubmitting}
                  >
                    <CalendarLucide className="mr-2 h-4 w-4" />
                    {goalDeadline ? format(goalDeadline, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <DynamicCalendar mode="single" selected={goalDeadline} onSelect={setGoalDeadline} initialFocus disabled={isSubmitting}/>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goalParticipantIds" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Participants (Optional)</Label>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="outline" id="goalParticipantIds" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || isLoadingOfficeMembers}>
                      {isLoadingOfficeMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {getSelectedParticipantNamesForDialog()}
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(var(--radix-dialog-content-width)-2rem)] sm:w-[calc(var(--radix-dialog-content-width)-3rem)] max-w-md">
                  <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentOfficeMembers.length > 0 && (
                      <DropdownMenuCheckboxItem
                      checked={goalParticipantIds.length === currentOfficeMembers.length && currentOfficeMembers.length > 0}
                      onCheckedChange={(checked) => {
                          if (checked) {
                          setGoalParticipantIds(currentOfficeMembers.map(m => m.userId));
                          } else {
                          setGoalParticipantIds([]);
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
                      <div className="p-2 text-sm text-muted-foreground text-center">No other members in your primary office.</div>
                  ) : (
                      <div className="max-h-48 overflow-y-auto">
                      {currentOfficeMembers.map((member) => (
                      <DropdownMenuCheckboxItem
                          key={member.userId}
                          checked={goalParticipantIds.includes(member.userId)}
                          onCheckedChange={(checked) => {
                          setGoalParticipantIds((prev) =>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveGoal} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentGoalToEdit ? "Save Changes" : "Add Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
