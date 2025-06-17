
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating team-related content.
 *
 * - generateTeamContent - A function that generates content based on a prompt and type.
 * - GenerateTeamContentInput - The input type for the generateTeamContent function.
 * - GenerateTeamContentOutput - The return type for the generateTeamContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTeamContentInputSchema = z.object({
  topic: z.string().describe('The main topic or subject for the content.'),
  contentType: z
    .enum(['blog post', 'email draft', 'social media update', 'meeting agenda', 'presentation outline', 'custom'])
    .describe('The type of content to generate.'),
  customContentType: z.string().optional().describe('Specify if contentType is "custom".'),
  desiredLength: z
    .enum(['short', 'medium', 'long'])
    .optional()
    .default('medium')
    .describe('The desired length of the content.'),
  toneAndStyle: z
    .string()
    .optional()
    .default('professional and informative')
    .describe('The desired tone and style for the content (e.g., formal, casual, witty).'),
  additionalInstructions: z
    .string()
    .optional()
    .describe('Any other specific instructions or key points to include.'),
});
export type GenerateTeamContentInput = z.infer<
  typeof GenerateTeamContentInputSchema
>;

const GenerateTeamContentOutputSchema = z.object({
  generatedContent: z.string().describe('The AI-generated content.'),
  contentTypeUsed: z.string().describe('The actual content type that was generated.'),
});
export type GenerateTeamContentOutput = z.infer<
  typeof GenerateTeamContentOutputSchema
>;

export async function generateTeamContent(
  input: GenerateTeamContentInput
): Promise<GenerateTeamContentOutput> {
  return generateTeamContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTeamContentPrompt',
  input: {schema: GenerateTeamContentInputSchema},
  output: {schema: GenerateTeamContentOutputSchema},
  prompt: `You are an AI assistant skilled in content creation for teams.
  Generate content based on the following specifications:

  Topic: {{{topic}}}
  Content Type: {{#if (eq contentType "custom")}}{{{customContentType}}}{{else}}{{{contentType}}}{{/if}}
  Desired Length: {{{desiredLength}}}
  Tone and Style: {{{toneAndStyle}}}
  {{#if additionalInstructions}}
  Additional Instructions: {{{additionalInstructions}}}
  {{/if}}

  Produce well-structured and relevant content.
  Confirm the contentTypeUsed in your output.
  `,
});

const generateTeamContentFlow = ai.defineFlow(
  {
    name: 'generateTeamContentFlow',
    inputSchema: GenerateTeamContentInputSchema,
    outputSchema: GenerateTeamContentOutputSchema,
  },
  async input => {
    const {output} = await prompt({
        ...input,
        contentTypeUsed: input.contentType === 'custom' && input.customContentType ? input.customContentType : input.contentType,
    });
    // Ensure contentTypeUsed is set in the final output, as the prompt might not directly set it if it's part of the input schema for the prompt itself.
    return {
        ...output!,
        contentTypeUsed: input.contentType === 'custom' && input.customContentType ? input.customContentType : input.contentType,
     };
  }
);
