// Summarize key discussion points and decisions from team chats.

'use server';

/**
 * @fileOverview Summarizes key discussion points and decisions from team chats.
 *
 * - summarizeTeamCommunication - A function that handles the summarization of team communication.
 * - SummarizeTeamCommunicationInput - The input type for the summarizeTeamCommunication function.
 * - SummarizeTeamCommunicationOutput - The return type for the summarizeTeamCommunication function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTeamCommunicationInputSchema = z.object({
  teamChatLog: z
    .string()
    .describe('A log of team chat messages, including timestamps and participants.'),
  goal: z.string().describe('The team goal that the chat log pertains to.'),
});
export type SummarizeTeamCommunicationInput = z.infer<
  typeof SummarizeTeamCommunicationInputSchema
>;

const SummarizeTeamCommunicationOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the key discussion points, decisions, and action items from the team chat.'
    ),
  keyDecisions: z
    .string()
    .describe('A list of the key decisions made during the team chat.'),
  roadblocks: z
    .string()
    .describe(
      'Any potential roadblocks or issues identified during the team chat.'
    ),
});
export type SummarizeTeamCommunicationOutput = z.infer<
  typeof SummarizeTeamCommunicationOutputSchema
>;

export async function summarizeTeamCommunication(
  input: SummarizeTeamCommunicationInput
): Promise<SummarizeTeamCommunicationOutput> {
  return summarizeTeamCommunicationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTeamCommunicationPrompt',
  input: {schema: SummarizeTeamCommunicationInputSchema},
  output: {schema: SummarizeTeamCommunicationOutputSchema},
  prompt: `You are an AI assistant helping managers understand team progress.

  Summarize the following team chat log, focusing on key discussion points, decisions made, and any potential roadblocks that were identified.  The chat log pertains to the following team goal: {{{goal}}}.

  Chat Log:
  {{teamChatLog}}

  Provide a concise summary, a list of key decisions, and a list of roadblocks. Output should be formatted as requested by the schema description.
  `,
});

const summarizeTeamCommunicationFlow = ai.defineFlow(
  {
    name: 'summarizeTeamCommunicationFlow',
    inputSchema: SummarizeTeamCommunicationInputSchema,
    outputSchema: SummarizeTeamCommunicationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
