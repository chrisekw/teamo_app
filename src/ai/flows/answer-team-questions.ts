
'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering team-related questions.
 *
 * - answerTeamQuestion - A function that provides answers to user questions.
 * - AnswerTeamQuestionInput - The input type for the answerTeamQuestion function.
 * - AnswerTeamQuestionOutput - The return type for the answerTeamQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerTeamQuestionInputSchema = z.object({
  question: z.string().describe('The question asked by the user.'),
  context: z
    .string()
    .optional()
    .describe(
      'Optional additional context provided by the user to help answer the question.'
    ),
});
export type AnswerTeamQuestionInput = z.infer<
  typeof AnswerTeamQuestionInputSchema
>;

const AnswerTeamQuestionOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question.'),
  confidenceScore: z
    .number()
    .optional()
    .describe(
      'An optional score (0-1) indicating the AI confidence in the answer, if applicable.'
    ),
});
export type AnswerTeamQuestionOutput = z.infer<
  typeof AnswerTeamQuestionOutputSchema
>;

export async function answerTeamQuestion(
  input: AnswerTeamQuestionInput
): Promise<AnswerTeamQuestionOutput> {
  return answerTeamQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerTeamQuestionPrompt',
  input: {schema: AnswerTeamQuestionInputSchema},
  output: {schema: AnswerTeamQuestionOutputSchema},
  prompt: `You are a helpful AI assistant for teams, knowledgeable in project management, team collaboration, and productivity.
  Please answer the following question.
  If additional context is provided, use it to refine your answer.

  Question: {{{question}}}

  {{#if context}}
  Additional Context:
  {{{context}}}
  {{/if}}

  Provide a clear and concise answer. If you can, indicate a confidence score in your answer.
  `,
});

const answerTeamQuestionFlow = ai.defineFlow(
  {
    name: 'answerTeamQuestionFlow',
    inputSchema: AnswerTeamQuestionInputSchema,
    outputSchema: AnswerTeamQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
