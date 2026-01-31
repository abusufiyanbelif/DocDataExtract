
'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting key information from Aadhaar card text.
 *
 * The flow takes raw text from an Aadhaar card as input and uses an AI model to extract information
 * such as name, date of birth, gender, Aadhaar number, and address.
 *
 * @exports `extractKeyInfoFromAadhaarText` - The main function to call to start the flow.
 * @exports `ExtractKeyInfoFromAadhaarInput` - The input type for the flow.
 * @exports `ExtractKeyInfoFromAadhaarOutput` - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractKeyInfoFromAadhaarInputSchema = z.object({
  text: z
    .string()
    .describe(
      'The raw text from an Aadhaar card from which to extract data.'
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

export async function extractKeyInfoFromAadhaarText(
  input: ExtractKeyInfoFromAadhaarInput
): Promise<ExtractKeyInfoFromAadhaarOutput> {
  return extractKeyInfoFromAadhaarTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractKeyInfoFromAadhaarPrompt',
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert in extracting information from Indian identity documents. Analyze the provided text from an Aadhaar card and extract the following details.

Return ONLY a single, valid JSON object with the extracted information. Do not include any text, markdown, or formatting before or after the JSON object.

The JSON object should have the following keys:
- "name" (string): The person's full name.
- "dob" (string): Their Date of Birth (dob).
- "gender" (string): Their gender.
- "aadhaarNumber" (string): The 12-digit Aadhaar number.
- "address" (string): The full residential address printed on the card.

Here is the text from the card:
---
{{{text}}}
---
  `,
});

const extractKeyInfoFromAadhaarTextFlow = ai.defineFlow(
  {
    name: 'extractKeyInfoFromAadhaarTextFlow',
    inputSchema: ExtractKeyInfoFromAadhaarInputSchema,
    outputSchema: ExtractKeyInfoFromAadhaarOutputSchema,
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
        return ExtractKeyInfoFromAadhaarOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
