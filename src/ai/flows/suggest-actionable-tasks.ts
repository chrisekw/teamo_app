
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting actionable tasks.
 *
 * - suggestActionableTasks - A function that suggests tasks based on input text.
 * - SuggestActionableTasksInput - The input type for the suggestActionableTasks function.
 * - SuggestActionableTasksOutput - The return type for the suggestActionableTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskSuggestionSchema = z.object({
  taskName: z.string().describe('A concise name for the suggested task.'),
  description: z.string().describe('A brief description of what the task entails.'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('The suggested priority for the task.'),
  potentialAssignee: z.string().optional().describe('A suggestion for who might be suitable to take on this task.'),
});

const SuggestActionableTasksInputSchema = z.object({
  contextText: z
    .string()
    .describe(
      'The input text from which to derive actionable tasks. This could be meeting notes, project descriptions, problem statements, or general team discussions.'
    ),
  maxTasks: z.number().optional().default(5).describe('Maximum number of tasks to suggest.'),
});
export type SuggestActionableTasksInput = z.infer<
  typeof SuggestActionableTasksInputSchema
>;

const SuggestActionableTasksOutputSchema = z.object({
  suggestedTasks: z
    .array(TaskSuggestionSchema)
    .describe('A list of suggested actionable tasks.'),
  summary: z
    .string()
    .optional()
    .describe(
      'A brief overall summary or rationale if tasks were derived successfully.'
    ),
});
export type SuggestActionableTasksOutput = z.infer<
  typeof SuggestActionableTasksOutputSchema
>;

export async function suggestActionableTasks(
  input: SuggestActionableTasksInput
): Promise<SuggestActionableTasksOutput> {
  return suggestActionableTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestActionableTasksPrompt',
  input: {schema: SuggestActionableTasksInputSchema},
  output: {schema: SuggestActionableTasksOutputSchema},
  prompt: `You are an AI assistant helping teams identify actionable tasks from various inputs.
  Based on the provided "Context Text", analyze it and extract up to {{maxTasks}} concrete and actionable tasks.

  Context Text:
  {{{contextText}}}

  For each task, provide:
  1. A clear task name.
  2. A brief description.
  3. A suggested priority (High, Medium, or Low).
  4. Optionally, a potential assignee if the context gives any hints.

  Provide a brief summary if relevant.
  Format the output as a list of suggested tasks and an optional summary.
  `,
});

const suggestActionableTasksFlow = ai.defineFlow(
  {
    name: 'suggestActionableTasksFlow',
    inputSchema: SuggestActionableTasksInputSchema,
    outputSchema: SuggestActionableTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
