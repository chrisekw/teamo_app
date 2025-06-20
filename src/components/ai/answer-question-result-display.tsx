
import type { AnswerTeamQuestionOutput } from "@/ai/flows/answer-team-questions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle } from "lucide-react";

interface AnswerQuestionResultDisplayProps {
  result: AnswerTeamQuestionOutput;
}

export default function AnswerQuestionResultDisplay({ result }: AnswerQuestionResultDisplayProps) {
  return (
    <div className="space-y-3 pt-4">
      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>AI's Answer</AlertTitle>
        <AlertDescription className="whitespace-pre-wrap">{result.answer}</AlertDescription>
        {result.confidenceScore && <p className="text-xs text-muted-foreground mt-2">Confidence: {(result.confidenceScore * 100).toFixed(0)}%</p>}
      </Alert>
    </div>
  );
}

    