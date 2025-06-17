
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from 'next/dynamic';

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Sparkles, MessageSquare, CheckSquare, AlertTriangleIcon, ListChecks, HelpCircle, FileText, Send, Bot } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const DynamicScrollArea = dynamic(() => import('@/components/ui/scroll-area').then(mod => mod.ScrollArea), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />
});


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

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

type AiFunctionKey = 'summarize' | 'alignment' | 'tasks' | 'content' | 'question';


export default function AiAssistantPage() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  const [openDialog, setOpenDialog] = useState<AiFunctionKey | null>(null);

  const [summarizeResult, setSummarizeResult] = useState<SummarizeTeamCommunicationOutput | null>(null);
  const [suggestAlignmentResult, setSuggestAlignmentResult] = useState<SuggestTeamAlignmentActionsOutput | null>(null);
  const [suggestTasksResult, setSuggestTasksResult] = useState<SuggestActionableTasksOutput | null>(null);
  const [generateContentResult, setGenerateContentResult] = useState<GenerateTeamContentOutput | null>(null);
  const [answerQuestionResultDialog, setAnswerQuestionResultDialog] = useState<AnswerTeamQuestionOutput | null>(null);


  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggestingAlignment, setIsSuggestingAlignment] = useState(false);
  const [isSuggestingTasks, setIsSuggestingTasks] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isAnsweringQuestionDialog, setIsAnsweringQuestionDialog] = useState(false);


  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiChatProcessing, setIsAiChatProcessing] = useState(false);


  useEffect(() => {
    setIsMounted(true);
    setChatMessages([
        {id: 'initial-ai', text: "Hello! I'm your AI Assistant. How can I help you today? You can ask me a question or use one of the quick actions above.", sender: 'ai', timestamp: new Date()}
    ])
  }, []);


  const summarizeForm = useForm<SummarizeFormValues>({ resolver: zodResolver(summarizeSchema), defaultValues: { teamChatLog: "", goal: "" } });
  const suggestAlignmentForm = useForm<SuggestAlignmentFormValues>({ resolver: zodResolver(suggestAlignmentSchema), defaultValues: { goalProgress: "", taskCompletion: "", communicationPatterns: "" } });
  const suggestTasksForm = useForm<SuggestTasksFormValues>({ resolver: zodResolver(suggestTasksSchema), defaultValues: { contextText: "", maxTasks: 5 } });
  const answerQuestionFormDialog = useForm<AnswerQuestionFormValues>({ resolver: zodResolver(answerQuestionSchema), defaultValues: { question: "", context: "" }});
  const generateContentForm = useForm<GenerateContentFormValues>({ resolver: zodResolver(generateContentSchema), defaultValues: { topic: "", contentType: "blog post", customContentType: "", desiredLength: "medium", toneAndStyle: "professional and informative", additionalInstructions: "" } });
  const contentTypeWatch = generateContentForm.watch("contentType");


  const onSummarizeSubmit: SubmitHandler<SummarizeFormValues> = async (data) => {
    setIsSummarizing(true); setSummarizeResult(null);
    try {
      const result = await summarizeTeamCommunication(data);
      setSummarizeResult(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to summarize. Please try again." });
    } finally { setIsSummarizing(false); }
  };

  const onSuggestAlignmentSubmit: SubmitHandler<SuggestAlignmentFormValues> = async (data) => {
    setIsSuggestingAlignment(true); setSuggestAlignmentResult(null);
    try {
      const result = await suggestTeamAlignmentActions(data);
      setSuggestAlignmentResult(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to suggest actions. Please try again." });
    } finally { setIsSuggestingAlignment(false); }
  };

  const onSuggestTasksSubmit: SubmitHandler<SuggestTasksFormValues> = async (data) => {
    setIsSuggestingTasks(true); setSuggestTasksResult(null);
    try {
      const result = await suggestActionableTasks(data);
      setSuggestTasksResult(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to suggest tasks. Please try again." });
    } finally { setIsSuggestingTasks(false); }
  };
  
  const onAnswerQuestionDialogSubmit: SubmitHandler<AnswerQuestionFormValues> = async (data) => {
    setIsAnsweringQuestionDialog(true); setAnswerQuestionResultDialog(null);
    try {
      const result = await answerTeamQuestion(data);
      setAnswerQuestionResultDialog(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to answer question. Please try again."});
    } finally { setIsAnsweringQuestionDialog(false); }
  };

  const onGenerateContentSubmit: SubmitHandler<GenerateContentFormValues> = async (data) => {
    setIsGeneratingContent(true); setGenerateContentResult(null);
    try {
      const result = await generateTeamContent(data);
      setGenerateContentResult(result);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate content. Please try again." });
    } finally { setIsGeneratingContent(false); }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), text: chatInput, sender: 'user', timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsAiChatProcessing(true);
    try {
      const aiResponse = await answerTeamQuestion({ question: chatInput });
      const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: aiResponse.answer, sender: 'ai', timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: "Sorry, I encountered an error. Please try again.", sender: 'ai', timestamp: new Date() };
      setChatMessages(prev => [...prev, errorMessage]);
      toast({ variant: "destructive", title: "Error", description: "Failed to get AI response." });
    } finally {
      setIsAiChatProcessing(false);
    }
  };

  const quickActions = [
    { key: 'summarize' as AiFunctionKey, title: "Summarize Communication", description: "Analyze chat logs for key points.", icon: MessageSquare, form: summarizeForm, submitHandler: onSummarizeSubmit, result: summarizeResult, isLoading: isSummarizing, fields: (
        <>
          <FormField control={summarizeForm.control} name="teamChatLog" render={({ field }) => (<FormItem><FormLabel>Team Chat Log</FormLabel><FormControl><Textarea placeholder="Paste team chat log here..." {...field} rows={6} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={summarizeForm.control} name="goal" render={({ field }) => (<FormItem><FormLabel>Relevant Team Goal</FormLabel><FormControl><Input placeholder="e.g., Launch V2..." {...field} /></FormControl><FormMessage /></FormItem>)} />
        </>
      ), renderResult: summarizeResult && (
        <div className="space-y-3 pt-4">
          <Alert><MessageSquare className="h-4 w-4" /><AlertTitle>Overall Summary</AlertTitle><AlertDescription>{summarizeResult.summary}</AlertDescription></Alert>
          <Alert><CheckSquare className="h-4 w-4" /><AlertTitle>Key Decisions</AlertTitle><AlertDescription>{summarizeResult.keyDecisions}</AlertDescription></Alert>
          <Alert variant="destructive"><AlertTriangleIcon className="h-4 w-4" /><AlertTitle>Identified Roadblocks</AlertTitle><AlertDescription>{summarizeResult.roadblocks}</AlertDescription></Alert>
        </div>
      )
    },
    { key: 'alignment' as AiFunctionKey, title: "Suggest Alignment Actions", description: "Get suggestions to improve team alignment.", icon: Sparkles, form: suggestAlignmentForm, submitHandler: onSuggestAlignmentSubmit, result: suggestAlignmentResult, isLoading: isSuggestingAlignment, fields: (
        <>
          <FormField control={suggestAlignmentForm.control} name="goalProgress" render={({ field }) => (<FormItem><FormLabel>Goal Progress</FormLabel><FormControl><Textarea placeholder="Describe current goal progress..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={suggestAlignmentForm.control} name="taskCompletion" render={({ field }) => (<FormItem><FormLabel>Task Completion</FormLabel><FormControl><Textarea placeholder="Summarize task completion..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={suggestAlignmentForm.control} name="communicationPatterns" render={({ field }) => (<FormItem><FormLabel>Communication Patterns</FormLabel><FormControl><Textarea placeholder="Describe communication patterns..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
        </>
      ), renderResult: suggestAlignmentResult && (
        <div className="space-y-3 pt-4">
          <Alert><Sparkles className="h-4 w-4" /><AlertTitle>Rationale</AlertTitle><AlertDescription>{suggestAlignmentResult.rationale}</AlertDescription></Alert>
          <Card><CardContent className="pt-4"><h4 className="font-semibold mb-2">Suggested Actions:</h4><ul className="list-disc pl-5 space-y-1 text-sm">{suggestAlignmentResult.suggestedActions.map((action, i) => <li key={i}>{action}</li>)}</ul></CardContent></Card>
        </div>
      )
    },
    { key: 'tasks' as AiFunctionKey, title: "Suggest Actionable Tasks", description: "Extract tasks from notes or discussions.", icon: ListChecks, form: suggestTasksForm, submitHandler: onSuggestTasksSubmit, result: suggestTasksResult, isLoading: isSuggestingTasks, fields: (
        <>
          <FormField control={suggestTasksForm.control} name="contextText" render={({ field }) => (<FormItem><FormLabel>Context / Input Text</FormLabel><FormControl><Textarea placeholder="Paste meeting notes, project brief..." {...field} rows={6} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={suggestTasksForm.control} name="maxTasks" render={({ field }) => (<FormItem><FormLabel>Maximum Tasks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </>
      ), renderResult: suggestTasksResult && (
        <div className="space-y-3 pt-4">
          {suggestTasksResult.summary && <Alert><Sparkles className="h-4 w-4" /><AlertTitle>Summary</AlertTitle><AlertDescription>{suggestTasksResult.summary}</AlertDescription></Alert>}
          <h4 className="font-semibold">Suggested Tasks:</h4>
          {suggestTasksResult.suggestedTasks.length > 0 ? <ul className="space-y-2">{suggestTasksResult.suggestedTasks.map((task, i) => (<li key={i} className="p-3 border rounded-md text-sm"><p className="font-semibold">{task.taskName} <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}>{task.priority}</Badge></p><p className="text-muted-foreground">{task.description}</p>{task.potentialAssignee && <p className="text-xs text-muted-foreground mt-1">Assignee: {task.potentialAssignee}</p>}</li>))}</ul> : <p className="text-sm text-muted-foreground">No tasks suggested.</p>}
        </div>
      )
    },
     { key: 'question' as AiFunctionKey, title: "Answer Team Questions", description: "Ask about productivity, practices, etc.", icon: HelpCircle, form: answerQuestionFormDialog, submitHandler: onAnswerQuestionDialogSubmit, result: answerQuestionResultDialog, isLoading: isAnsweringQuestionDialog, fields: (
        <>
          <FormField control={answerQuestionFormDialog.control} name="question" render={({ field }) => (<FormItem><FormLabel>Your Question</FormLabel><FormControl><Textarea placeholder="e.g., Effective strategies for remote teams?" {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={answerQuestionFormDialog.control} name="context" render={({ field }) => (<FormItem><FormLabel>Optional Context</FormLabel><FormControl><Textarea placeholder="Provide background info..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
        </>
      ), renderResult: answerQuestionResultDialog && (
        <div className="space-y-3 pt-4">
          <Alert><HelpCircle className="h-4 w-4" /><AlertTitle>AI's Answer</AlertTitle><AlertDescription className="whitespace-pre-wrap">{answerQuestionResultDialog.answer}</AlertDescription>{answerQuestionResultDialog.confidenceScore && <p className="text-xs text-muted-foreground mt-2">Confidence: {(answerQuestionResultDialog.confidenceScore * 100).toFixed(0)}%</p>}</Alert>
        </div>
      )
    },
    { key: 'content' as AiFunctionKey, title: "Generate Team Content", description: "Create blog posts, emails, agendas.", icon: FileText, form: generateContentForm, submitHandler: onGenerateContentSubmit, result: generateContentResult, isLoading: isGeneratingContent, fields: (
        <>
          <FormField control={generateContentForm.control} name="topic" render={({ field }) => (<FormItem><FormLabel>Topic / Subject</FormLabel><FormControl><Input placeholder="e.g., New product feature announcement" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={generateContentForm.control} name="contentType" render={({ field }) => (<FormItem><FormLabel>Content Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="blog post">Blog Post</SelectItem><SelectItem value="email draft">Email Draft</SelectItem><SelectItem value="social media update">Social Media Update</SelectItem><SelectItem value="meeting agenda">Meeting Agenda</SelectItem><SelectItem value="presentation outline">Presentation Outline</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          {contentTypeWatch === 'custom' && <FormField control={generateContentForm.control} name="customContentType" render={({ field }) => (<FormItem><FormLabel>Custom Content Type</FormLabel><FormControl><Input placeholder="Specify type" {...field} /></FormControl><FormMessage /></FormItem>)} />}
          <FormField control={generateContentForm.control} name="desiredLength" render={({ field }) => (<FormItem><FormLabel>Desired Length</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="short">Short</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="long">Long</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={generateContentForm.control} name="toneAndStyle" render={({ field }) => (<FormItem><FormLabel>Tone and Style</FormLabel><FormControl><Input placeholder="e.g., Professional and informative" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={generateContentForm.control} name="additionalInstructions" render={({ field }) => (<FormItem><FormLabel>Additional Instructions</FormLabel><FormControl><Textarea placeholder="Key points to include..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
        </>
      ), renderResult: generateContentResult && (
        <div className="space-y-3 pt-4">
            <Alert><FileText className="h-4 w-4" /><AlertTitle>Generated Content (Type: {generateContentResult.contentTypeUsed})</AlertTitle><AlertDescription className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{generateContentResult.generatedContent}</AlertDescription></Alert>
        </div>
      )
    },
  ];

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <Sparkles className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-bold">AI Assistant</h1>
      </div>
      <p className="mb-8 text-muted-foreground text-sm sm:text-base">
        Your intelligent partner. Use quick actions for specific tasks or chat directly with the AI for general queries.
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-headline font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {quickActions.map((action) => (
            <Dialog key={action.key} open={openDialog === action.key} onOpenChange={(isOpen) => setOpenDialog(isOpen ? action.key : null)}>
              <DialogTrigger asChild>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col">
                  <CardHeader className="flex-row items-start gap-4 space-y-0">
                     <div className="p-2 bg-primary/10 rounded-full"> <action.icon className="h-6 w-6 text-primary" /></div>
                     <div className="flex-1">
                        <CardTitle className="font-headline text-base sm:text-lg">{action.title}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">{action.description}</CardDescription>
                     </div>
                  </CardHeader>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] md:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="font-headline flex items-center"><action.icon className="mr-2 h-5 w-5 text-primary" />{action.title}</DialogTitle>
                  <DialogDescription>{action.description}</DialogDescription>
                </DialogHeader>
                <Form {...action.form as any}>
                  <form onSubmit={(action.form as any).handleSubmit(action.submitHandler)}>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                      {action.fields}
                    </div>
                    {action.isLoading && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                    {action.result && action.renderResult}
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
                      <Button type="submit" disabled={action.isLoading}>
                        {action.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </section>
      
      <Separator className="my-6 md:my-8"/>

      <section className="flex-1 flex flex-col min-h-0">
          <h2 className="text-2xl font-headline font-semibold mb-4">Chat with your AI Assistant</h2>
          <Card className="flex-1 flex flex-col shadow-lg min-h-0">
            <CardContent className="flex-1 p-0 overflow-hidden">
                <DynamicScrollArea className="h-full p-4">
                <div className="space-y-4">
                    {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex items-end space-x-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
                        </Avatar>
                        )}
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 rounded-lg shadow ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        </div>
                        {msg.sender === 'user' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                    {isAiChatProcessing && (
                        <div className="flex items-end space-x-2">
                            <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-5 w-5 text-primary"/></AvatarFallback></Avatar>
                            <div className="max-w-xs px-3 py-2 rounded-lg shadow bg-muted">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        </div>
                    )}
                </div>
                </DynamicScrollArea>
            </CardContent>
            <div className="border-t p-2 sm:p-4 bg-background">
                <div className="flex items-center space-x-2">
                <Input
                    type="text"
                    placeholder="Ask the AI anything..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAiChatProcessing && handleChatSubmit()}
                    disabled={isAiChatProcessing}
                    className="flex-1"
                />
                <Button onClick={handleChatSubmit} disabled={isAiChatProcessing || !chatInput.trim()}>
                    {isAiChatProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                </div>
            </div>
          </Card>
      </section>
    </div>
  );
}


    