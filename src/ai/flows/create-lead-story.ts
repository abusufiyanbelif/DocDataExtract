'use server';
/**
 * @fileOverview AI flow to create a lead story abstract from multiple medical reports.
 *
 * - createLeadStory - Function to create a diagnostic story from medical images.
 * - CreateLeadStoryInput - Input type for createLeadStory.
 * - CreateLeadStoryOutput - Output type for createLeadStory.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateLeadStoryInputSchema = z.object({
  reportDataUris: z
    .array(z.string())
    .describe(
      "A list of medical report images as data URIs that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type CreateLeadStoryInput = z.infer<typeof CreateLeadStoryInputSchema>;

const CreateLeadStoryOutputSchema = z.object({
  story: z.string().describe('A lead story abstract for disease diagnostic based on the provided medical reports, or a summary of the documents if they are not medical in nature.'),
  isCorrectType: z.boolean().describe('A flag indicating if the uploaded documents appear to be of the correct type (medical).'),
});

export type CreateLeadStoryOutput = z.infer<typeof CreateLeadStoryOutputSchema>;

export async function createLeadStory(
  input: CreateLeadStoryInput
): Promise<CreateLeadStoryOutput> {
  return createLeadStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createLeadStoryPrompt',
  model: 'googleai/gemini-pro',
  prompt: `You are an expert analyst. Your primary goal is to create a lead story abstract for a disease diagnostic by synthesizing findings from medical reports. First, determine if the documents appear to be medical reports. Set the 'isCorrectType' flag to true if they are, and false otherwise.

If the provided documents are not medical reports, create a concise summary or a coherent narrative based on the information available in them. Do not state that you cannot perform the medical analysis. Instead, adapt to the content provided.

Analyze the following documents and generate the most relevant story or summary.

Return ONLY a single, valid JSON object with the following keys:
- "story" (string): The generated story or summary.
- "isCorrectType" (boolean): True if the documents appear to be medical reports, false otherwise.

Documents:
  {{#each reportDataUris}}
  Document: {{media url=this}}
  {{/each}}
`,
});

const createLeadStoryFlow = ai.defineFlow(
  {
    name: 'createLeadStoryFlow',
    inputSchema: CreateLeadStoryInputSchema,
    outputSchema: CreateLeadStoryOutputSchema,
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
        return CreateLeadStoryOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
