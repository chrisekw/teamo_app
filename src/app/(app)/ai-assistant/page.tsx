
"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { summarizeTeamCommunication, SummarizeTeamCommunicationInput, SummarizeTeamCommunicationOutput } from "@/ai/flows/summarize-team-communication";
import { suggestTeamAlignmentActions, SuggestTeamAlignmentActionsInput, SuggestTeamAlignmentActionsOutput } from "@/ai/flows/suggest-team-alignment-actions";
import { suggestActionableTasks, SuggestActionableTasksInput, SuggestActionableTasksOutput } from "@/ai/flows/suggest-actionable-tasks";
import { answerTeamQuestion, AnswerTeamQuestionInput, AnswerTeamQuestionOutput } from "@/ai/flows/answer-team-questions";
import { generateTeamContent, GenerateTeamContentInput, GenerateTeamContentOutput } from "@/ai/flows/generate-team-content";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, MessageSquare, CheckSquare, AlertTriangle, ListChecks, HelpCircle, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const summarizeSchema = z.object({
  teamChatLog: z.string().min(50, "Chat log should be substantial for meaningful summary."),
  goal: z.string().min(5, "Goal description is too short."),
});
type SummarizeFormValues = z.infer<typeof summarizeSchema>;

const suggestAlignmentSchema = z.object({
  goalProgress: z.string().min(10, "Goal progress description is too short."),
  taskCompletion: z.string().min(10, "Task completion description is too short."),
  communicationPatterns: z.string().min(10, "Communication patterns description is too short."),
});
type SuggestAlignmentFormValues = z.infer<typeof suggestAlignmentSchema>;

const suggestTasksSchema = z.object({
  contextText: z.string().min(20, "Please provide more context to suggest tasks from."),
  maxTasks: z.coerce.number().min(1).max(10).optional().default(5),
});
type SuggestTasksFormValues = z.infer<typeof suggestTasksSchema>;

const answerQuestionSchema = z.object({
  question: z.string().min(10, "Question seems too short. Please elaborate."),
  context: z.string().optional(),
});
type AnswerQuestionFormValues = z.infer<typeof answerQuestionSchema>;

const generateContentSchema = z.object({
  topic: z.string().min(5, "Topic is too short."),
  contentType: z.enum(['blog post', 'email draft', 'social media update', 'meeting agenda', 'presentation outline', 'custom']),
  customContentType: z.string().optional(),
  desiredLength: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  toneAndStyle: z.string().optional().default('professional and informative'),
  additionalInstructions: z.string().optional(),
}).refine(data => !(data.contentType === 'custom' && !data.customContentType), {
  message: "Custom content type must be specified if 'Custom' is selected.",
  path: ["customContentType"],
});
type GenerateContentFormValues = z.infer<typeof generateContentSchema>;


export default function AiAssistantPage() {
  const { toast } = useToast();
  const [summarizeResult, setSummarizeResult] = useState<SummarizeTeamCommunicationOutput | null>(null);
  const [suggestAlignmentResult, setSuggestAlignmentResult] = useState<SuggestTeamAlignmentActionsOutput | null>(null);
  const [suggestTasksResult, setSuggestTasksResult] = useState<SuggestActionableTasksOutput | null>(null);
  const [answerQuestionResult, setAnswerQuestionResult] = useState<AnswerTeamQuestionOutput | null>(null);
  const [generateContentResult, setGenerateContentResult] = useState<GenerateTeamContentOutput | null>(null);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggestingAlignment, setIsSuggestingAlignment] = useState(false);
  const [isSuggestingTasks, setIsSuggestingTasks] = useState(false);
  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const summarizeForm = useForm<SummarizeFormValues>({
    resolver: zodResolver(summarizeSchema),
    defaultValues: { teamChatLog: "", goal: "" },
  });

  const suggestAlignmentForm = useForm<SuggestAlignmentFormValues>({
    resolver: zodResolver(suggestAlignmentSchema),
    defaultValues: { goalProgress: "", taskCompletion: "", communicationPatterns: "" },
  });

  const suggestTasksForm = useForm<SuggestTasksFormValues>({
    resolver: zodResolver(suggestTasksSchema),
    defaultValues: { contextText: "", maxTasks: 5 },
  });

  const answerQuestionForm = useForm<AnswerQuestionFormValues>({
    resolver: zodResolver(answerQuestionSchema),
    defaultValues: { question: "", context: "" },
  });
  
  const generateContentForm = useForm<GenerateContentFormValues>({
    resolver: zodResolver(generateContentSchema),
    defaultValues: { 
      topic: "", 
      contentType: "blog post", 
      customContentType: "",
      desiredLength: "medium",
      toneAndStyle: "professional and informative",
      additionalInstructions: "",
    },
  });
  const contentTypeWatch = generateContentForm.watch("contentType");


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

  const onSuggestAlignmentSubmit: SubmitHandler<SuggestAlignmentFormValues> = async (data) => {
    setIsSuggestingAlignment(true);
    setSuggestAlignmentResult(null);
    try {
      const result = await suggestTeamAlignmentActions(data);
      setSuggestAlignmentResult(result);
    } catch (error) {
      console.error("Error suggesting alignment actions:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to suggest alignment actions. Please try again." });
    } finally {
      setIsSuggestingAlignment(false);
    }
  };

  const onSuggestTasksSubmit: SubmitHandler<SuggestTasksFormValues> = async (data) => {
    setIsSuggestingTasks(true);
    setSuggestTasksResult(null);
    try {
      const result = await suggestActionableTasks(data);
      setSuggestTasksResult(result);
    } catch (error) {
      console.error("Error suggesting tasks:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to suggest tasks. Please try again." });
    } finally {
      setIsSuggestingTasks(false);
    }
  };

  const onAnswerQuestionSubmit: SubmitHandler<AnswerQuestionFormValues> = async (data) => {
    setIsAnsweringQuestion(true);
    setAnswerQuestionResult(null);
    try {
      const result = await answerTeamQuestion(data);
      setAnswerQuestionResult(result);
    } catch (error) {
      console.error("Error answering question:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to answer question. Please try again." });
    } finally {
      setIsAnsweringQuestion(false);
    }
  };
  
  const onGenerateContentSubmit: SubmitHandler<GenerateContentFormValues> = async (data) => {
    setIsGeneratingContent(true);
    setGenerateContentResult(null);
    try {
      const result = await generateTeamContent(data);
      setGenerateContentResult(result);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate content. Please try again." });
    } finally {
      setIsGeneratingContent(false);
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center mb-8">
        <Sparkles className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-bold">AI Alignment Assistant</h1>
      </div>
      <p className="mb-8 text-muted-foreground">
        Your intelligent partner to summarize communications, suggest actions and tasks, answer questions, and generate content to keep your team aligned and productive.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Summarize Team Communication Card */}
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

        {/* Suggest Team Alignment Actions Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Sparkles className="mr-2 h-5 w-5" />Suggest Team Alignment Actions</CardTitle>
            <CardDescription>Get AI-powered suggestions to improve team alignment based on progress and communication.</CardDescription>
          </CardHeader>
          <Form {...suggestAlignmentForm}>
            <form onSubmit={suggestAlignmentForm.handleSubmit(onSuggestAlignmentSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={suggestAlignmentForm.control}
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
                  control={suggestAlignmentForm.control}
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
                  control={suggestAlignmentForm.control}
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
                <Button type="submit" disabled={isSuggestingAlignment}>
                  {isSuggestingAlignment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Suggest Actions
                </Button>
              </CardFooter>
            </form>
          </Form>
          {suggestAlignmentResult && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-2 font-headline">Suggested Actions:</h3>
              <Alert className="mb-4">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Rationale</AlertTitle>
                <AlertDescription>{suggestAlignmentResult.rationale}</AlertDescription>
              </Alert>
              <ul className="list-disc pl-5 space-y-2">
                {suggestAlignmentResult.suggestedActions.map((action, index) => (
                  <li key={index} className="text-sm">{action}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Suggest Actionable Tasks Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><ListChecks className="mr-2 h-5 w-5" />Suggest Actionable Tasks</CardTitle>
            <CardDescription>Extract concrete tasks from meeting notes, project descriptions, or discussions.</CardDescription>
          </CardHeader>
          <Form {...suggestTasksForm}>
            <form onSubmit={suggestTasksForm.handleSubmit(onSuggestTasksSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={suggestTasksForm.control}
                  name="contextText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context / Input Text</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Paste meeting notes, project brief, or discussion summary here..." {...field} rows={6} />
                      </FormControl>
                      <FormDescription>The AI will analyze this text to suggest tasks.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={suggestTasksForm.control}
                  name="maxTasks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Tasks</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSuggestingTasks}>
                  {isSuggestingTasks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Suggest Tasks
                </Button>
              </CardFooter>
            </form>
          </Form>
          {suggestTasksResult && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-2 font-headline">Suggested Tasks:</h3>
              {suggestTasksResult.summary && (
                <Alert className="mb-4">
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Summary</AlertTitle>
                  <AlertDescription>{suggestTasksResult.summary}</AlertDescription>
                </Alert>
              )}
              {suggestTasksResult.suggestedTasks.length > 0 ? (
                <ul className="space-y-3">
                  {suggestTasksResult.suggestedTasks.map((task, index) => (
                    <li key={index} className="p-3 border rounded-md bg-muted/50">
                      <p className="font-semibold">{task.taskName} <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}>{task.priority}</Badge></p>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      {task.potentialAssignee && <p className="text-xs text-muted-foreground mt-1">Assignee: {task.potentialAssignee}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No specific tasks were identified from the input.</p>
              )}
            </div>
          )}
        </Card>

        {/* Answer Team Questions Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><HelpCircle className="mr-2 h-5 w-5" />Answer Team Questions</CardTitle>
            <CardDescription>Ask questions about team productivity, project management, or best practices.</CardDescription>
          </CardHeader>
          <Form {...answerQuestionForm}>
            <form onSubmit={answerQuestionForm.handleSubmit(onAnswerQuestionSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={answerQuestionForm.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Question</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., What are effective strategies for remote team engagement?" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={answerQuestionForm.control}
                  name="context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optional Context</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Provide any relevant background information..." {...field} rows={3} />
                      </FormControl>
                      <FormDescription>Adding context can help the AI provide a more tailored answer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isAnsweringQuestion}>
                  {isAnsweringQuestion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Answer
                </Button>
              </CardFooter>
            </form>
          </Form>
          {answerQuestionResult && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-2 font-headline">AI's Answer:</h3>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Answer</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{answerQuestionResult.answer}</AlertDescription>
                {answerQuestionResult.confidenceScore && (
                  <p className="text-xs text-muted-foreground mt-2">Confidence: {(answerQuestionResult.confidenceScore * 100).toFixed(0)}%</p>
                )}
              </Alert>
            </div>
          )}
        </Card>
        
        {/* Generate Team Content Card */}
        <Card className="shadow-lg md:col-span-2"> {/* Making this card span 2 columns on md+ screens */}
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><FileText className="mr-2 h-5 w-5" />Generate Team Content</CardTitle>
            <CardDescription>Create various types of content like blog posts, email drafts, or social media updates.</CardDescription>
          </CardHeader>
          <Form {...generateContentForm}>
            <form onSubmit={generateContentForm.handleSubmit(onGenerateContentSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={generateContentForm.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic / Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Announcing our new product feature" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={generateContentForm.control}
                    name="contentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select content type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="blog post">Blog Post</SelectItem>
                            <SelectItem value="email draft">Email Draft</SelectItem>
                            <SelectItem value="social media update">Social Media Update</SelectItem>
                            <SelectItem value="meeting agenda">Meeting Agenda</SelectItem>
                            <SelectItem value="presentation outline">Presentation Outline</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   {contentTypeWatch === 'custom' && (
                    <FormField
                      control={generateContentForm.control}
                      name="customContentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Content Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify type, e.g., 'Project Proposal'" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={generateContentForm.control}
                      name="desiredLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desired Length</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select length" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="short">Short</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="long">Long</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={generateContentForm.control}
                      name="toneAndStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tone and Style</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Casual and engaging" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                <FormField
                  control={generateContentForm.control}
                  name="additionalInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Include a call to action, mention key benefits..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isGeneratingContent}>
                  {isGeneratingContent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Content
                </Button>
              </CardFooter>
            </form>
          </Form>
          {generateContentResult && (
            <div className="p-6 border-t">
              <h3 className="text-lg font-semibold mb-2 font-headline">Generated Content:</h3>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Content (Type: {generateContentResult.contentTypeUsed})</AlertTitle>
                <AlertDescription className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {generateContentResult.generatedContent}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
