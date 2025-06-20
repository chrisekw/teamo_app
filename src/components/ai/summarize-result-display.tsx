
import type { SummarizeTeamCommunicationOutput } from "@/ai/flows/summarize-team-communication";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessageSquare, CheckSquare, AlertTriangleIcon } from "lucide-react";

interface SummarizeResultDisplayProps {
  result: SummarizeTeamCommunicationOutput;
}

export default function SummarizeResultDisplay({ result }: SummarizeResultDisplayProps) {
  return (
    <div className="space-y-3 pt-4">
      <Alert><MessageSquare className="h-4 w-4" /><AlertTitle>Overall Summary</AlertTitle><AlertDescription>{result.summary}</AlertDescription></Alert>
      <Alert><CheckSquare className="h-4 w-4" /><AlertTitle>Key Decisions</AlertTitle><AlertDescription>{result.keyDecisions}</AlertDescription></Alert>
      <Alert variant="destructive"><AlertTriangleIcon className="h-4 w-4" /><AlertTitle>Identified Roadblocks</AlertTitle><AlertDescription>{result.roadblocks}</AlertDescription></Alert>
    </div>
  );
}

    