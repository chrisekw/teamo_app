
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Form as ShadcnForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle as MessageCircleIcon, Briefcase } from "lucide-react";

const summarizeSchema = z.object({
  teamChatLog: z.string().min(50, "Chat log should be substantial for meaningful summary."),
  goal: z.string().min(5, "Goal description is too short."),
});
type SummarizeFormValues = z.infer<typeof summarizeSchema>;

interface SummarizeFieldsProps {
  form: UseFormReturn<SummarizeFormValues>;
  generateContentForm?: any; // Not used here, but keeps signature consistent if needed elsewhere
}

export default function SummarizeFields({ form }: SummarizeFieldsProps) {
  return (
    <ShadcnForm {...form}>
      <FormField control={form.control} name="teamChatLog" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><MessageCircleIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Team Chat Log</FormLabel>
          <FormControl><Textarea id="teamChatLog" placeholder="Paste team chat log here..." {...field} rows={6} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="goal" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground"/>Relevant Team Goal</FormLabel>
          <FormControl><Input id="goal" placeholder="e.g., Launch V2..." {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </ShadcnForm>
  );
}

    