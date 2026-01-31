
'use server';
/**
 * @fileOverview AI flow to extract medical findings from report text.
 *
 * - extractMedicalFindings - Function to extract medical details.
 * - ExtractMedicalFindingsInput - Input type for extractMedicalFindings.
 * - ExtractMedicalFindingsOutput - Output type for extractMedicalFindings.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractMedicalFindingsInputSchema = z.object({
  text: z
    .string()
    .describe(
      "The raw text from a medical report from which to extract data."
    ),
});

export type ExtractMedicalFindingsInput = z.infer<typeof ExtractMedicalFindingsInputSchema>;

const FindingSchema = z.object({
    finding: z.string().describe('A specific observation or finding from the report.'),
    details: z.string().describe('Any relevant details, measurements, or notes about the finding.'),
});

const ExtractMedicalFindingsOutputSchema = z.object({
  diagnosis: z.string().describe('The main diagnosis or impression from the report.'),
  findings: z.array(FindingSchema).describe('A structured list of key findings from the medical report.'),
});

export type ExtractMedicalFindingsOutput = z.infer<typeof ExtractMedicalFindingsOutputSchema>;

export async function extractMedicalFindings(
  input: ExtractMedicalFindingsInput
): Promise<ExtractMedicalFindingsOutput> {
  return extractMedicalFindingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMedicalFindingsPrompt',
  model: 'gemini-1.5-flash',
  prompt: `You are an expert medical analyst tasked with extracting key information from medical report text.

  Analyze the provided text and extract the diagnosis and key findings.
  
  Return ONLY a single, valid JSON object. Do not include any text, markdown, or formatting before or after the JSON object.

  The JSON object should have the following keys:
  - "diagnosis" (string): The main diagnosis or impression from the report.
  - "findings" (array): A list of findings. Each item in the array should be an object with "finding" (string) and "details" (string) keys.

  Here is the text from the medical report:
  ---
  {{{text}}}
  ---

  Ensure that the diagnosis and findings are accurate and comprehensive.
`,
});

const extractMedicalFindingsFlow = ai.defineFlow(
  {
    name: 'extractMedicalFindingsFlow',
    inputSchema: ExtractMedicalFindingsInputSchema,
    outputSchema: ExtractMedicalFindingsOutputSchema,
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
        return ExtractMedicalFindingsOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
