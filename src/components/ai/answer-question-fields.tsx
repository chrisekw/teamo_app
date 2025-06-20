
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Form as ShadcnForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircleQuestion, Brain } from "lucide-react";

const answerQuestionSchema = z.object({ 
  question: z.string().min(10, "Question seems too short. Please elaborate."),
  context: z.string().optional(),
});
type AnswerQuestionFormValues = z.infer<typeof answerQuestionSchema>;

interface AnswerQuestionFieldsProps {
  form: UseFormReturn<AnswerQuestionFormValues>;
  generateContentForm?: any;
}

export default function AnswerQuestionFields({ form }: AnswerQuestionFieldsProps) {
  return (
    <ShadcnForm {...form}>
      <FormField control={form.control} name="question" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><MessageCircleQuestion className="mr-2 h-4 w-4 text-muted-foreground"/>Your Question</FormLabel>
          <FormControl><Textarea id="question" placeholder="e.g., Effective strategies for remote teams?" {...field} rows={3} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="context" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Brain className="mr-2 h-4 w-4 text-muted-foreground"/>Optional Context</FormLabel>
          <FormControl><Textarea id="context" placeholder="Provide background info..." {...field} rows={3} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </ShadcnForm>
  );
}

    