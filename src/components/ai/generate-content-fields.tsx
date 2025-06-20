
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Form as ShadcnForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, FileText, Edit, Layers, Sparkles, Brain } from "lucide-react";

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

interface GenerateContentFieldsProps {
  form: UseFormReturn<GenerateContentFormValues>;
  generateContentForm: UseFormReturn<GenerateContentFormValues>; // Passed for watching contentType
}

export default function GenerateContentFields({ form, generateContentForm }: GenerateContentFieldsProps) {
  const contentTypeWatch = generateContentForm.watch("contentType");

  return (
    <ShadcnForm {...form}>
      <FormField control={form.control} name="topic" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Type className="mr-2 h-4 w-4 text-muted-foreground"/>Topic / Subject</FormLabel>
          <FormControl><Input id="topic" placeholder="e.g., New product feature announcement" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="contentType" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><FileText className="mr-2 h-4 w-4 text-muted-foreground"/>Content Type</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger id="contentType"><SelectValue /></SelectTrigger></FormControl>
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
      )} />
      {contentTypeWatch === 'custom' && (
        <FormField control={form.control} name="customContentType" render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Custom Content Type</FormLabel>
            <FormControl><Input id="customContentType" placeholder="Specify type" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}
      <FormField control={form.control} name="desiredLength" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Layers className="mr-2 h-4 w-4 text-muted-foreground"/>Desired Length</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger id="desiredLength"><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="long">Long</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="toneAndStyle" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Sparkles className="mr-2 h-4 w-4 text-muted-foreground"/>Tone and Style</FormLabel>
          <FormControl><Input id="toneAndStyle" placeholder="e.g., Professional and informative" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="additionalInstructions" render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Brain className="mr-2 h-4 w-4 text-muted-foreground"/>Additional Instructions</FormLabel>
          <FormControl><Textarea id="additionalInstructions" placeholder="Key points to include..." {...field} rows={3} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </ShadcnForm>
  );
}

    