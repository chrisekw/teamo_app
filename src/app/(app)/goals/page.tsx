"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Target, Edit3, Trash2, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";


interface Goal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string; // e.g., "%", "USD", "Tasks"
  deadline?: Date;
}

const mockGoals: Goal[] = [
  { id: "1", name: "Increase Q3 Revenue", description: "Boost quarterly revenue by 20% through new marketing initiatives.", targetValue: 120000, currentValue: 75000, unit: "USD", deadline: new Date("2024-09-30") },
  { id: "2", name: "Improve Customer Satisfaction", description: "Achieve a CSAT score of 90% or higher.", targetValue: 90, currentValue: 82, unit: "%", deadline: new Date("2024-12-31") },
  { id: "3", name: "Launch New Product Feature", description: "Successfully launch the 'Advanced Analytics' module.", targetValue: 100, currentValue: 100, unit: "% Completion", deadline: new Date("2024-08-15") },
  { id: "4", name: "Reduce Churn Rate", description: "Lower monthly customer churn to below 5%.", targetValue: 5, currentValue: 7, unit: "% (Lower is better)", deadline: new Date("2024-10-31") },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Partial<Goal>>({});

  // Form state
  const [goalName, setGoalName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetValue, setGoalTargetValue] = useState(100);
  const [goalCurrentValue, setGoalCurrentValue] = useState(0);
  const [goalUnit, setGoalUnit] = useState("%");
  // const [goalDeadline, setGoalDeadline] = useState<Date | undefined>();


  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setCurrentGoal(goal);
      setGoalName(goal.name);
      setGoalDescription(goal.description);
      setGoalTargetValue(goal.targetValue);
      setGoalCurrentValue(goal.currentValue);
      setGoalUnit(goal.unit);
      // setGoalDeadline(goal.deadline);
    } else {
      setCurrentGoal({});
      setGoalName("");
      setGoalDescription("");
      setGoalTargetValue(100);
      setGoalCurrentValue(0);
      setGoalUnit("%");
      // setGoalDeadline(undefined);
    }
    setIsGoalDialogOpen(true);
  };

  const handleSaveGoal = () => {
    const progressData = {
      name: goalName,
      description: goalDescription,
      targetValue: goalTargetValue,
      currentValue: goalCurrentValue,
      unit: goalUnit,
      // deadline: goalDeadline,
    };

    if (currentGoal.id) {
      setGoals(goals.map(g => g.id === currentGoal.id ? { ...g, ...progressData } : g));
    } else {
      setGoals([...goals, { ...progressData, id: Date.now().toString() }]);
    }
    setIsGoalDialogOpen(false);
  };
  
  const getProgressPercentage = (current: number, target: number, unit: string) => {
    if (unit.toLowerCase().includes("lower is better")) {
        // For "lower is better" goals, progress is inverse or needs special handling
        // Simple example: if target is 5 and current is 7, progress is negative or 0.
        // If current is 4, progress is ( (target - current) / target ) * 100, if current < target
        // This needs more complex logic based on specific "lower is better" goal types.
        // For now, let's assume it means we want to reach 'target' from a higher value.
        if (current <= target) return 100; // Achieved or surpassed
        // A more nuanced calculation might be needed here.
        // For simplicity, if current > target, we can show how far off we are.
        // Or, if we have an initial value, e.g. reduce from X to Y.
        // For now, just show 0 if above target.
        return 0; 
    }
    if (target === 0) return current > 0 ? 100 : 0;
    return Math.min(Math.max((current / target) * 100, 0), 100);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Goal Tracker</h1>
        <Button onClick={() => handleOpenDialog()}>
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
            const isCompleted = progress >= 100 && !goal.unit.toLowerCase().includes("lower is better");
            const isLowerBetterAchieved = goal.unit.toLowerCase().includes("lower is better") && goal.currentValue <= goal.targetValue;

            return (
            <Card key={goal.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="font-headline flex items-center">
                    <Target className="mr-2 h-5 w-5 text-primary" />
                    {goal.name}
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(goal)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGoals(goals.filter(g => g.id !== goal.id))}>
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
                  <Progress value={progress} className="h-3" indicatorClassName={isCompleted || isLowerBetterAchieved ? "bg-green-500" : "bg-primary"} />
                </div>
                {goal.deadline && (
                  <p className="text-xs text-muted-foreground">
                    Deadline: {goal.deadline.toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {isCompleted || isLowerBetterAchieved ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Goal Achieved!
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => handleOpenDialog(goal)}>Update Progress</Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
        </div>
      )}

      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentGoal.id ? "Edit Goal" : "Add New Goal"}</DialogTitle>
            <DialogDescription>
              {currentGoal.id ? "Update the details for this goal." : "Define a new goal for your team."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="goalName">Goal Name</Label>
              <Input id="goalName" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g., Increase Sales" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goalDescription">Description</Label>
              <Textarea id="goalDescription" value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="Briefly describe the goal" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="goalCurrentValue">Current Value</Label>
                <Input id="goalCurrentValue" type="number" value={goalCurrentValue} onChange={(e) => setGoalCurrentValue(parseFloat(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goalTargetValue">Target Value</Label>
                <Input id="goalTargetValue" type="number" value={goalTargetValue} onChange={(e) => setGoalTargetValue(parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goalUnit">Unit</Label>
              <Input id="goalUnit" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} placeholder="e.g., %, USD, Tasks" />
            </div>
            <div className="grid gap-2">
                <Label>Set Current Value ({goalCurrentValue} {goalUnit.replace("(Lower is better)","").trim()})</Label>
                <Slider
                    value={[goalCurrentValue]}
                    max={goalTargetValue > 0 ? goalTargetValue * (goalUnit.toLowerCase().includes("lower is better") ? 2 : 1.2) : 100} // Adjust max for better slider usability
                    min={0}
                    step={goalTargetValue > 1000 ? 100 : (goalTargetValue > 100 ? 10 : 1)} // Dynamic step
                    onValueChange={(value) => setGoalCurrentValue(value[0])}
                />
            </div>
            {/* TODO: Add Deadline Picker if needed 
            <div className="grid gap-2">
              <Label htmlFor="goalDeadline">Deadline (Optional)</Label>
               <Popover> ... Calendar ... </Popover>
            </div>
            */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGoal}>{currentGoal.id ? "Save Changes" : "Add Goal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
