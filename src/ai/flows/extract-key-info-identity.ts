'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting key information from an Aadhaar card.
 *
 * The flow takes an image of an Aadhaar card as input and uses an AI model to extract information
 * such as name, date of birth, gender, Aadhaar number, and address.
 *
 * @exports `extractKeyInfoFromAadhaar` - The main function to call to start the flow.
 * @exports `ExtractKeyInfoFromAadhaarInput` - The input type for the flow.
 * @exports `ExtractKeyInfoFromAadhaarOutput` - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractKeyInfoFromAadhaarInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of an Aadhaar card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type ExtractKeyInfoFromAadhaarInput = z.infer<
  typeof ExtractKeyInfoFromAadhaarInputSchema
>;

const ExtractKeyInfoFromAadhaarOutputSchema = z.object({
  name: z.string().describe('The full name of the person as it appears on the card.'),
  dob: z.string().describe("The person's Date of Birth in DD/MM/YYYY format."),
  gender: z.string().describe("The person's gender (e.g., MALE, FEMALE)."),
  aadhaarNumber: z.string().describe("The 12-digit unique Aadhaar number, often formatted with spaces."),
  address: z.string().describe('The full residential address, including pin code.'),
});
export type ExtractKeyInfoFromAadhaarOutput = z.infer<
  typeof ExtractKeyInfoFromAadhaarOutputSchema
>;

export async function extractKeyInfoFromAadhaar(
  input: ExtractKeyInfoFromAadhaarInput
): Promise<ExtractKeyInfoFromAadhaarOutput> {
  return extractKeyInfoFromAadhaarFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractKeyInfoFromAadhaarPrompt',
  input: {schema: ExtractKeyInfoFromAadhaarInputSchema},
  output: {schema: ExtractKeyInfoFromAadhaarOutputSchema},
  prompt: `You are an expert in extracting information from Indian identity documents. Analyze the provided image of an Aadhaar card and extract the following details:

- The person's full name.
- Their Date of Birth (dob).
- Their gender.
- The 12-digit Aadhaar number.
- The full residential address printed on the card.

Return the information in the structured format requested.

Image: {{media url=photoDataUri}}
  `,
});

const extractKeyInfoFromAadhaarFlow = ai.defineFlow(
  {
    name: 'extractKeyInfoFromAadhaarFlow',
    inputSchema: ExtractKeyInfoFromAadhaarInputSchema,
    outputSchema: ExtractKeyInfoFromAadhaarOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
