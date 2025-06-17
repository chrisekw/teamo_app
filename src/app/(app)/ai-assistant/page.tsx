
"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { summarizeTeamCommunication, SummarizeTeamCommunicationInput, SummarizeTeamCommunicationOutput } from "@/ai/flows/summarize-team-communication";
import { suggestTeamAlignmentActions, SuggestTeamAlignmentActionsInput, SuggestTeamAlignmentActionsOutput } from "@/ai/flows/suggest-team-alignment-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, MessageSquare, CheckSquare, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const summarizeSchema = z.object({
  teamChatLog: z.string().min(50, "Chat log should be substantial for meaningful summary."),
  goal: z.string().min(5, "Goal description is too short."),
});
type SummarizeFormValues = z.infer<typeof summarizeSchema>;

const suggestSchema = z.object({
  goalProgress: z.string().min(10, "Goal progress description is too short."),
  taskCompletion: z.string().min(10, "Task completion description is too short."),
  communicationPatterns: z.string().min(10, "Communication patterns description is too short."),
});
type SuggestFormValues = z.infer<typeof suggestSchema>;

export default function AiAssistantPage() {
  const { toast } = useToast();
  const [summarizeResult, setSummarizeResult] = useState<SummarizeTeamCommunicationOutput | null>(null);
  const [suggestResult, setSuggestResult] = useState<SuggestTeamAlignmentActionsOutput | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const summarizeForm = useForm<SummarizeFormValues>({
    resolver: zodResolver(summarizeSchema),
    defaultValues: { teamChatLog: "", goal: "" },
  });

  const suggestForm = useForm<SuggestFormValues>({
    resolver: zodResolver(suggestSchema),
    defaultValues: { goalProgress: "", taskCompletion: "", communicationPatterns: "" },
  });

  const onSummarizeSubmit: SubmitHandler<SummarizeFormValues> = async (data) => {
    setIsSummarizing(true);
    setSummarizeResult(null);
    try {
      const result = await summarizeTeamCommunication(data);
      setSummarizeResult(result);
    } catch (error) {
      console.error("Error summarizing communication:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to summarize communication. Please try again." });
    } finally {
      setIsSummarizing(false);
    }
  };

  const onSuggestSubmit: SubmitHandler<SuggestFormValues> = async (data) => {
    setIsSuggesting(true);
    setSuggestResult(null);
    try {
      const result = await suggestTeamAlignmentActions(data);
      setSuggestResult(result);
    } catch (error) {
      console.error("Error suggesting actions:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to suggest actions. Please try again." });
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center mb-8">
        <Sparkles className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-bold">AI Alignment Assistant</h1>
      </div>
      <p className="mb-8 text-muted-foreground">
        Leverage AI to understand your team's dynamics and get actionable insights for better alignment and productivity.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><MessageSquare className="mr-2 h-5 w-5" />Summarize Team Communication</CardTitle>
            <CardDescription>Analyze team chat logs to extract key discussion points, decisions, and roadblocks.</CardDescription>
          </CardHeader>
          <Form {...summarizeForm}>
            <form onSubmit={summarizeForm.handleSubmit(onSummarizeSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={summarizeForm.control}
                  name="teamChatLog"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Chat Log</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Paste team chat log here..." {...field} rows={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={summarizeForm.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relevant Team Goal</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Launch V2 of the product by end of Q3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSummarizing}>
                  {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Summarize
                </Button>
              </CardFooter>
            </form>
          </Form>
          {summarizeResult && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-2 font-headline">Summary Results:</h3>
              <Alert className="mb-4">
                <MessageSquare className="h-4 w-4" />
                <AlertTitle>Overall Summary</AlertTitle>
                <AlertDescription>{summarizeResult.summary}</AlertDescription>
              </Alert>
              <Alert variant="default" className="mb-4">
                 <CheckSquare className="h-4 w-4" />
                <AlertTitle>Key Decisions</AlertTitle>
                <AlertDescription>{summarizeResult.keyDecisions}</AlertDescription>
              </Alert>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Identified Roadblocks</AlertTitle>
                <AlertDescription>{summarizeResult.roadblocks}</AlertDescription>
              </Alert>
            </div>
          )}
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Sparkles className="mr-2 h-5 w-5" />Suggest Team Alignment Actions</CardTitle>
            <CardDescription>Get AI-powered suggestions to improve team alignment based on progress and communication.</CardDescription>
          </CardHeader>
          <Form {...suggestForm}>
            <form onSubmit={suggestForm.handleSubmit(onSuggestSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={suggestForm.control}
                  name="goalProgress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Progress</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe current progress towards team goals..." {...field} rows={3}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={suggestForm.control}
                  name="taskCompletion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Completion</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Summarize recent task completion rates and metrics..." {...field} rows={3}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={suggestForm.control}
                  name="communicationPatterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Patterns</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe recent communication patterns, frequency, sentiment..." {...field} rows={3}/>
                      </FormControl>
                       <FormDescription>
                        Example: "Daily stand-ups are consistent. Slack channel for Project X is active, mostly positive. Some concerns raised about unclear requirements in 1:1s."
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSuggesting}>
                  {isSuggesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Suggest Actions
                </Button>
              </CardFooter>
            </form>
          </Form>
          {suggestResult && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-2 font-headline">Suggested Actions:</h3>
              <Alert className="mb-4">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Rationale</AlertTitle>
                <AlertDescription>{suggestResult.rationale}</AlertDescription>
              </Alert>
              <ul className="list-disc pl-5 space-y-2">
                {suggestResult.suggestedActions.map((action, index) => (
                  <li key={index} className="text-sm">{action}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
