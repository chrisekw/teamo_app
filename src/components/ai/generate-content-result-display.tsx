
import type { GenerateTeamContentOutput } from "@/ai/flows/generate-team-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText } from "lucide-react";

interface GenerateContentResultDisplayProps {
  result: GenerateTeamContentOutput;
}

export default function GenerateContentResultDisplay({ result }: GenerateContentResultDisplayProps) {
  return (
    <div className="space-y-3 pt-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>Generated Content (Type: {result.contentTypeUsed})</AlertTitle>
        <AlertDescription className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{result.generatedContent}</AlertDescription>
      </Alert>
    </div>
  );
}

    