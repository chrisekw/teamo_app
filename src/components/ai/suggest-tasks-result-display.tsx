
import type { SuggestActionableTasksOutput } from "@/ai/flows/suggest-actionable-tasks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface SuggestTasksResultDisplayProps {
  result: SuggestActionableTasksOutput;
}

export default function SuggestTasksResultDisplay({ result }: SuggestTasksResultDisplayProps) {
  return (
    <div className="space-y-3 pt-4">
      {result.summary && <Alert><Sparkles className="h-4 w-4" /><AlertTitle>Summary</AlertTitle><AlertDescription>{result.summary}</AlertDescription></Alert>}
      <h4 className="font-semibold">Suggested Tasks:</h4>
      {result.suggestedTasks.length > 0 ? (
        <ul className="space-y-2">
          {result.suggestedTasks.map((task, i) => (
            <li key={i} className="p-3 border rounded-md text-sm">
              <p className="font-semibold">{task.taskName} <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}>{task.priority}</Badge></p>
              <p className="text-muted-foreground">{task.description}</p>
              {task.potentialAssignee && <p className="text-xs text-muted-foreground mt-1">Assignee: {task.potentialAssignee}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No tasks suggested.</p>
      )}
    </div>
  );
}

    