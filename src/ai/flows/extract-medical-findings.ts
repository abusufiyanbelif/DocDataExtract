'use server';
/**
 * @fileOverview AI flow to extract medical findings from a report image.
 *
 * - extractMedicalFindings - Function to extract medical details.
 * - ExtractMedicalFindingsInput - Input type for extractMedicalFindings.
 * - ExtractMedicalFindingsOutput - Output type for extractMedicalFindings.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const ExtractMedicalFindingsInputSchema = z.object({
  reportDataUri: z
    .string()
    .describe(
      "The medical report image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
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
  model: googleAI.model('gemini-pro-vision'),
  input: {schema: ExtractMedicalFindingsInputSchema},
  output: {schema: ExtractMedicalFindingsOutputSchema},
  prompt: `You are an expert medical analyst tasked with extracting key information from medical reports.

  Analyze the provided medical report and extract the diagnosis and key findings. Present the findings as a structured list, where each item in the list has a 'finding' and its associated 'details'.

  Medical Report Image: {{media url=reportDataUri}}

  Ensure that the diagnosis and findings are accurate and comprehensive.

  Output the diagnosis and structured findings.
`,
});

const extractMedicalFindingsFlow = ai.defineFlow(
  {
    name: 'extractMedicalFindingsFlow',
    inputSchema: ExtractMedicalFindingsInputSchema,
    outputSchema: ExtractMedicalFindingsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
