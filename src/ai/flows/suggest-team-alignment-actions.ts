'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting team alignment actions.
 *
 * - suggestTeamAlignmentActions - A function that suggests actions to improve team alignment.
 * - SuggestTeamAlignmentActionsInput - The input type for the suggestTeamAlignmentActions function.
 * - SuggestTeamAlignmentActionsOutput - The return type for the suggestTeamAlignmentActions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTeamAlignmentActionsInputSchema = z.object({
  goalProgress: z
    .string()
    .describe('The current progress towards the team goals.'),
  taskCompletion: z
    .string()
    .describe('The recent task completion rates and metrics.'),
  communicationPatterns: z
    .string()
    .describe(
      'A summary of recent communication patterns within the team, including frequency and sentiment.'
    ),
});
export type SuggestTeamAlignmentActionsInput = z.infer<
  typeof SuggestTeamAlignmentActionsInputSchema
>;

const SuggestTeamAlignmentActionsOutputSchema = z.object({
  suggestedActions: z
    .array(z.string())
    .describe('A list of suggested actions to improve team alignment.'),
  rationale: z
    .string()
    .describe(
      'The rationale behind the suggested actions, explaining why they are recommended.'
    ),
});
export type SuggestTeamAlignmentActionsOutput = z.infer<
  typeof SuggestTeamAlignmentActionsOutputSchema
>;

export async function suggestTeamAlignmentActions(
  input: SuggestTeamAlignmentActionsInput
): Promise<SuggestTeamAlignmentActionsOutput> {
  return suggestTeamAlignmentActionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTeamAlignmentActionsPrompt',
  input: {schema: SuggestTeamAlignmentActionsInputSchema},
  output: {schema: SuggestTeamAlignmentActionsOutputSchema},
  prompt: `You are an AI assistant designed to help team leads improve team alignment.
  Based on the current goal progress, task completion rates, and communication patterns within the team, suggest actions to improve alignment.

  Goal Progress: {{{goalProgress}}}
  Task Completion: {{{taskCompletion}}}
  Communication Patterns: {{{communicationPatterns}}}

  Suggest concrete and actionable steps that the team lead can take.
  Provide a clear rationale for each suggested action.
  Format the output as a list of suggested actions and a rationale.
  `,
});

const suggestTeamAlignmentActionsFlow = ai.defineFlow(
  {
    name: 'suggestTeamAlignmentActionsFlow',
    inputSchema: SuggestTeamAlignmentActionsInputSchema,
    outputSchema: SuggestTeamAlignmentActionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
