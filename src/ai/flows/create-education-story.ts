'use server';
/**
 * @fileOverview AI flow to create an academic summary from multiple education-related documents.
 *
 * - createEducationStory - Function to create an academic story.
 * - CreateEducationStoryInput - Input type for createEducationStory.
 * - CreateEducationStoryOutput - Output type for createEducationStory.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateEducationStoryInputSchema = z.object({
  reportDataUris: z
    .array(z.string())
    .describe(
      "A list of educational documents (e.g., transcripts, certificates) as data URIs that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type CreateEducationStoryInput = z.infer<typeof CreateEducationStoryInputSchema>;

const CreateEducationStoryOutputSchema = z.object({
  story: z.string().describe('A summary of the student\'s academic journey and achievements based on the provided documents.'),
  isCorrectType: z.boolean().describe('A flag indicating if the uploaded documents appear to be of the correct type (educational).'),
});

export type CreateEducationStoryOutput = z.infer<typeof CreateEducationStoryOutputSchema>;

export async function createEducationStory(
  input: CreateEducationStoryInput
): Promise<CreateEducationStoryOutput> {
  return createEducationStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createEducationStoryPrompt',
  model: 'googleai/gemini-1.5-pro',
  prompt: `You are an expert academic advisor. Your goal is to create a concise summary of a student's academic journey. First, determine if the documents appear to be educational (transcripts, mark sheets, certificates, etc.).

If the documents are not educational, create a general summary of their content.

Analyze the following documents and generate a summary that highlights key achievements, academic progression, and areas of focus.

Return ONLY a single, valid JSON object with the following keys:
- "story" (string): The summary of the student's academic journey.
- "isCorrectType" (boolean): True if the documents are educational, false otherwise.

Documents:
  {{#each reportDataUris}}
  Document: {{media url=this}}
  {{/each}}
`,
});

const createEducationStoryFlow = ai.defineFlow(
  {
    name: 'createEducationStoryFlow',
    inputSchema: CreateEducationStoryInputSchema,
    outputSchema: CreateEducationStoryOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    const text = response.text.trim();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response from AI. Expected a JSON object.');
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]);
        return CreateEducationStoryOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
