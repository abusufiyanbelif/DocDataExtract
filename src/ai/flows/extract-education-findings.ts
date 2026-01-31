'use server';
/**
 * @fileOverview AI flow to extract structured data from educational document text.
 *
 * - extractEducationFindingsFromText - Function to extract educational details from text.
 * - ExtractEducationFindingsInput - Input type for extractEducationFindingsFromText.
 * - ExtractEducationFindingsOutput - Output type for extractEducationFindingsFromText.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractEducationFindingsInputSchema = z.object({
  text: z
    .string()
    .describe(
      "The raw text from an educational document from which to extract data."
    ),
});

export type ExtractEducationFindingsInput = z.infer<typeof ExtractEducationFindingsInputSchema>;

const AchievementSchema = z.object({
    achievement: z.string().describe('A specific achievement, grade, or score from the document.'),
    details: z.string().describe('Any relevant details, dates, or notes about the achievement.'),
});

const ExtractEducationFindingsOutputSchema = z.object({
  institution: z.string().describe('The name of the educational institution.'),
  degree: z.string().describe('The degree, course, or examination name.'),
  achievements: z.array(AchievementSchema).describe('A structured list of key achievements, scores, or grades.'),
});

export type ExtractEducationFindingsOutput = z.infer<typeof ExtractEducationFindingsOutputSchema>;

export async function extractEducationFindingsFromText(
  input: ExtractEducationFindingsInput
): Promise<ExtractEducationFindingsOutput> {
  return extractEducationFindingsFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractEducationFindingsPrompt',
  model: 'googleai/gemini-1.5-pro',
  prompt: `You are an expert academic registrar tasked with extracting key information from educational document text.

  Analyze the provided text and extract the institution name, degree/examination, and key achievements or grades.
  
  Return ONLY a single, valid JSON object. Do not include any text, markdown, or formatting before or after the JSON object.

  The JSON object should have the following keys:
  - "institution" (string): The name of the educational institution.
  - "degree" (string): The degree, course, or examination name.
  - "achievements" (array): A list of achievements. Each item in the array should be an object with "achievement" (string) and "details" (string) keys.

  Here is the text from the educational document:
  ---
  {{{text}}}
  ---

  Ensure that the extracted information is accurate and comprehensive.
`,
});

const extractEducationFindingsFromTextFlow = ai.defineFlow(
  {
    name: 'extractEducationFindingsFromTextFlow',
    inputSchema: ExtractEducationFindingsInputSchema,
    outputSchema: ExtractEducationFindingsOutputSchema,
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
        return ExtractEducationFindingsOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
