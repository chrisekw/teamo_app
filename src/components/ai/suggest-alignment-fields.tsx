
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Form as ShadcnForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CheckSquare, MessageSquare } from "lucide-react";

const suggestAlignmentSchema = z.object({
  goalProgress: z.string().min(10, "Goal progress description is too short."),
  taskCompletion: z.string().min(10, "Task completion description is too short."),
  communicationPatterns: z.string().min(10, "Communication patterns description is too short."),
});
type SuggestAlignmentFormValues = z.infer<typeof suggestAlignmentSchema>;

interface SuggestAlignmentFieldsProps {
  form: UseFormReturn<SuggestAlignmentFormValues>;
  generateContentForm?: any;
}

export default function SuggestAlignmentFields({ form }: SuggestAlignmentFieldsProps) {
  return (
    <ShadcnForm {...form}>
      <FormField control={form.control} name="goalProgress" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Goal Progress</FormLabel>
          <FormControl><Textarea id="goalProgress" placeholder="Describe current goal progress..." {...field} rows={3} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="taskCompletion" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><CheckSquare className="mr-2 h-4 w-4 text-muted-foreground"/>Task Completion</FormLabel>
          <FormControl><Textarea id="taskCompletion" placeholder="Summarize task completion..." {...field} rows={3} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="communicationPatterns" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><MessageSquare className="mr-2 h-4 w-4 text-muted-foreground"/>Communication Patterns</FormLabel>
          <FormControl><Textarea id="communicationPatterns" placeholder="Describe communication patterns..." {...field} rows={3} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </ShadcnForm>
  );
}

    