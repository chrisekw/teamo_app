
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Form as ShadcnForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Layers } from "lucide-react";

const suggestTasksSchema = z.object({
  contextText: z.string().min(20, "Please provide more context to suggest tasks from."),
  maxTasks: z.coerce.number().min(1).max(10).optional().default(5),
});
type SuggestTasksFormValues = z.infer<typeof suggestTasksSchema>;

interface SuggestTasksFieldsProps {
  form: UseFormReturn<SuggestTasksFormValues>;
  generateContentForm?: any;
}

export default function SuggestTasksFields({ form }: SuggestTasksFieldsProps) {
  return (
    <ShadcnForm {...form}>
      <FormField control={form.control} name="contextText" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Context / Input Text</FormLabel>
          <FormControl><Textarea id="contextText" placeholder="Paste meeting notes, project brief..." {...field} rows={6} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="maxTasks" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Layers className="mr-2 h-4 w-4 text-muted-foreground"/>Maximum Tasks</FormLabel>
          <FormControl><Input id="maxTasks" type="number" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </ShadcnForm>
  );
}

    