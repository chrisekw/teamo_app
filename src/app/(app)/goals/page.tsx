
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Target, Edit3, Trash2, CheckCircle2, Loader2, Award, Briefcase } from "lucide-react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Goal, Office, OfficeMember } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { addGoalToOffice, onGoalsUpdate, updateGoalInOffice, deleteGoalFromOffice } from "@/lib/firebase/firestore/goals";
import dynamic from 'next/dynamic';
import { onUserOfficesUpdate } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Unsubscribe } from "firebase/firestore";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as z from 'zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from "@/components/ui/label";

const GoalForm = dynamic(() => import('@/components/goals/goal-form'), {
  ssr: false,
  loading: () => <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});

const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name cannot be empty."),
  description: z.string().optional(),
  targetValue: z.coerce.number().min(0, "Target value must be positive."),
  currentValue: z.coerce.number().min(0, "Current value must be positive."),
  unit: z.string().min(1, "Unit is required."),
  deadline: z.date().optional(),
  participantIds: z.array(z.string()).optional(),
});
export type GoalFormValues = z.infer<typeof goalFormSchema>;

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [currentGoalToEdit, setCurrentGoalToEdit] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeData, setIsLoadingOfficeData] = useState(true);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      participantIds: [],
    },
  });

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingOfficeData(true);
      const unsubscribe = onUserOfficesUpdate(user.uid, (offices) => {
        setUserOffices(offices);
        if (offices.length > 0 && (!activeOffice || !offices.find(o => o.id === activeOffice.id))) {
          const officeIdFromUrl = searchParams.get('officeId');
          const officeFromUrl = offices.find(o => o.id === officeIdFromUrl);
          setActiveOffice(officeFromUrl || offices[0]);
        } else if (offices.length === 0) {
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
  }, [user, authLoading, searchParams, activeOffice]);

  useEffect(() => {
    if (activeOffice && searchParams.get('officeId') !== activeOffice.id) {
        router.replace(`${pathname}?officeId=${activeOffice.id}`, { scroll: false });
    }
  }, [activeOffice, searchParams, router, pathname]);

  useEffect(() => {
    let unsubMembers: Unsubscribe | null = null;
    if (activeOffice) {
        unsubMembers = onUserOfficesUpdate(activeOffice.id, (offices) => {
            const office = offices.find(o => o.id === activeOffice.id);
            // This is a placeholder, you would likely fetch members specifically
            // For now, we assume members can be derived or this needs a specific member fetch call
        });
    } else {
        setCurrentOfficeMembers([]);
    }
    return () => {
        if (unsubMembers) unsubMembers();
    };
  }, [activeOffice]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (user && activeOffice && !authLoading) {
      setIsLoadingGoals(true);
      unsubscribe = onGoalsUpdate(activeOffice.id, user.uid, (userGoals) => {
        setAllGoals(userGoals);
        setIsLoadingGoals(false);
      });
    } else {
      setIsLoadingGoals(false);
      setAllGoals([]);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, activeOffice, authLoading]);

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
  
  useEffect(() => {
    const active: Goal[] = [];
    const completed: Goal[] = [];
    allGoals.forEach(goal => {
      const isLowerBetterAchieved = goal.unit.toLowerCase().includes("lower is better") && goal.currentValue <= goal.targetValue;
      const progress = getProgressPercentage(goal.currentValue, goal.targetValue, goal.unit);
      const isCompletedNonLowerIsBetter = progress >= 100 && !goal.unit.toLowerCase().includes("lower is better");
      if (isCompletedNonLowerIsBetter || isLowerBetterAchieved) {
        completed.push(goal);
      } else {
        active.push(goal);
      }
    });
    setActiveGoals(active);
    setCompletedGoals(completed);
  }, [allGoals]);

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setCurrentGoalToEdit(goal);
      form.reset({
        name: goal.name,
        description: goal.description,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        unit: goal.unit,
        deadline: goal.deadline,
        participantIds: goal.participantIds || [],
      });
    } else {
      setCurrentGoalToEdit(null);
      form.reset();
    }
    setIsGoalDialogOpen(true);
  };

  const onSaveGoal: SubmitHandler<GoalFormValues> = async (data) => {
    if (!user || !activeOffice) {
      toast({ variant: "destructive", title: "Error", description: "You must select an office." });
      return;
    }
    setIsSubmitting(true);
    const selectedParticipantNames = (data.participantIds || [])
      .map(id => currentOfficeMembers.find(m => m.userId === id)?.name)
      .filter(Boolean) as string[];
    const participantsDisplay = selectedParticipantNames.join(', ') || "No participants";

    const goalData = {
      ...data,
      participantsDisplay: participantsDisplay,
    };
    const actorName = user.displayName || user.email || "User";

    try {
      if (currentGoalToEdit) {
        await updateGoalInOffice(activeOffice.id, currentGoalToEdit.id, goalData, user.uid, actorName, activeOffice.name);
        toast({ title: "Goal Updated", description: `"${goalData.name}" has been updated.` });
      } else {
        await addGoalToOffice(activeOffice.id, user.uid, goalData, actorName, activeOffice.name);
        toast({ title: "Goal Added", description: `"${goalData.name}" has been added.` });
      }
      setIsGoalDialogOpen(false);
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save goal." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !activeOffice) return;
    setIsSubmitting(true); 
    try {
        await deleteGoalFromOffice(activeOffice.id, goalId, user.uid, user.displayName || "User");
        toast({ title: "Goal Deleted", description: "The goal has been removed." });
    } catch (error) {
        console.error("Failed to delete goal:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete goal." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOfficeChange = (officeId: string) => {
    if (officeId && officeId !== activeOffice?.id) {
        const newActiveOffice = userOffices.find(o => o.id === officeId);
        if (newActiveOffice) {
          setActiveOffice(newActiveOffice);
          router.push(`${pathname}?officeId=${officeId}`);
        }
    }
  };
  
  const renderGoalCard = (goal: Goal) => {
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
  };

  if (authLoading || isLoadingOfficeData) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Goal Tracker</h1>
        <Button onClick={() => handleOpenDialog()} disabled={isSubmitting || !activeOffice}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
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

      {isLoadingGoals && <div className="text-center py-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}

      {!isLoadingGoals && !activeOffice && (
         <Card className="shadow-lg">
             <CardContent className="text-center py-10 text-muted-foreground">
                 <Briefcase className="mx-auto h-12 w-12 mb-3 text-gray-400" />
                 Please create or select an office to manage goals.
                 <Button asChild variant="link" className="block mx-auto mt-2">
                     <Link href="/office-designer">Go to Office Designer</Link>
                 </Button>
             </CardContent>
         </Card>
       )}

      {!isLoadingGoals && activeOffice && allGoals.length === 0 ? (
        <div className="text-center py-12 bg-muted/10 rounded-lg">
          <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No goals defined for {activeOffice.name}.</p>
          <p className="text-sm text-muted-foreground">Click "Add New Goal" to get started.</p>
        </div>
      ) : (
        !isLoadingGoals && activeOffice && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-headline font-semibold mb-4">Active Goals ({activeGoals.length})</h2>
              {activeGoals.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeGoals.map(renderGoalCard)}
                 </div>
              ) : (
                <p className="text-muted-foreground">No active goals. Well done!</p>
              )}
            </div>

            {completedGoals.length > 0 && (
                 <Accordion type="single" collapsible className="w-full" defaultValue="achieved-goals">
                    <AccordionItem value="achieved-goals" className="border-none">
                        <AccordionTrigger className="hover:no-underline border-b">
                             <h2 className="text-2xl font-headline font-semibold flex items-center">
                                <Award className="mr-2 h-6 w-6 text-yellow-500" />
                                Achieved Goals ({completedGoals.length})
                            </h2>
                        </AccordionTrigger>
                        <AccordionContent className="pt-6">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {completedGoals.map(renderGoalCard)}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
          </div>
        )
      )}

      <Dialog open={isGoalDialogOpen} onOpenChange={(isOpen) => {if (!isSubmitting) setIsGoalDialogOpen(isOpen);}}>
        <DialogContent className="sm:max-w-md">
           <DialogHeader>
              <DialogTitle className="font-headline">{currentGoalToEdit ? "Edit Goal" : "Add New Goal"}</DialogTitle>
              <DialogDescription>
                {currentGoalToEdit ? "Update the details for this goal." : `Define a new goal for ${activeOffice?.name || 'your team'}.`}
              </DialogDescription>
            </DialogHeader>
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <GoalForm
                form={form}
                onSubmit={onSaveGoal}
                isSubmitting={isSubmitting}
                currentOfficeMembers={currentOfficeMembers}
                onCancel={() => setIsGoalDialogOpen(false)}
                initialData={currentGoalToEdit}
              />
            </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
}
