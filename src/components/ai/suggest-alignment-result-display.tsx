
import type { SuggestTeamAlignmentActionsOutput } from "@/ai/flows/suggest-team-alignment-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";

interface SuggestAlignmentResultDisplayProps {
  result: SuggestTeamAlignmentActionsOutput;
}

export default function SuggestAlignmentResultDisplay({ result }: SuggestAlignmentResultDisplayProps) {
  return (
    <div className="space-y-3 pt-4">
      <Alert><Sparkles className="h-4 w-4" /><AlertTitle>Rationale</AlertTitle><AlertDescription>{result.rationale}</AlertDescription></Alert>
      <Card><CardContent className="pt-4"><h4 className="font-semibold mb-2">Suggested Actions:</h4><ul className="list-disc pl-5 space-y-1 text-sm">{result.suggestedActions.map((action, i) => <li key={i}>{action}</li>)}</ul></CardContent></Card>
    </div>
  );
}

    