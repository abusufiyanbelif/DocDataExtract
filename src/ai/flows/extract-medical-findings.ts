// src/ai/flows/extract-medical-findings.ts
'use server';
/**
 * @fileOverview AI flow to extract medical findings from a report image.
 *
 * - extractMedicalFindings - Function to extract medical details.
 * - ExtractMedicalFindingsInput - Input type for extractMedicalFindings.
 * - ExtractMedicalFindingsOutput - Output type for extractMedicalFindings.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractMedicalFindingsInputSchema = z.object({
  reportDataUri: z
    .string()
    .describe(
      'The medical report image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
    ),
});

export type ExtractMedicalFindingsInput = z.infer<typeof ExtractMedicalFindingsInputSchema>;

const ExtractMedicalFindingsOutputSchema = z.object({
  diagnosis: z.string().describe('The diagnosis extracted from the report.'),
  findings: z.string().describe('Key findings and details from the medical report.'),
});

export type ExtractMedicalFindingsOutput = z.infer<typeof ExtractMedicalFindingsOutputSchema>;

export async function extractMedicalFindings(
  input: ExtractMedicalFindingsInput
): Promise<ExtractMedicalFindingsOutput> {
  return extractMedicalFindingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMedicalFindingsPrompt',
  input: {schema: ExtractMedicalFindingsInputSchema},
  output: {schema: ExtractMedicalFindingsOutputSchema},
  prompt: `You are an expert medical analyst tasked with extracting key information from medical reports.

  Analyze the provided medical report and extract the diagnosis and key findings, including any relevant details.

  Medical Report Image: {{media url=reportDataUri}}

  Ensure that the diagnosis and findings are accurate and comprehensive.

  Output the diagnosis and findings in a structured format.
`,
});

const extractMedicalFindingsFlow = ai.defineFlow(
  {
    name: 'extractMedicalFindingsFlow',
    inputSchema: ExtractMedicalFindingsInputSchema,
    outputSchema: ExtractMedicalFindingsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
