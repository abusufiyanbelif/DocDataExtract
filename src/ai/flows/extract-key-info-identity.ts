'use server';
/**
 * @fileOverview This file defines Genkit flows for extracting key information from an Aadhaar card.
 *
 * It includes flows for extracting from both an image and from raw text.
 *
 * @exports `extractKeyInfoFromAadhaar` - The main function to call for image-based extraction.
 * @exports `extractKeyInfoFromAadhaarText` - The function to call for text-based extraction.
 * @exports `ExtractKeyInfoFromAadhaarInput` - The input type for the image flow.
 * @exports `ExtractKeyInfoFromAadhaarOutput` - The shared output type for both flows.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractKeyInfoFromAadhaarInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an Aadhaar card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
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
  model: 'googleai/gemini-pro',
  prompt: `You are an expert in extracting information from Indian identity documents. Analyze the provided image of an Aadhaar card and extract the following details.

Return ONLY a single, valid JSON object with the extracted information. Do not include any text, markdown, or formatting before or after the JSON object.

The JSON object should have the following keys:
- "name" (string): The person's full name.
- "dob" (string): Their Date of Birth (dob).
- "gender" (string): Their gender.
- "aadhaarNumber" (string): The 12-digit Aadhaar number.
- "address" (string): The full residential address printed on the card.

Here is the image of the card:
---
Image: {{media url=photoDataUri}}
---
  `,
});

const extractKeyInfoFromAadhaarFlow = ai.defineFlow(
  {
    name: 'extractKeyInfoFromAadhaarFlow',
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


// --- Text-based extraction ---

const ExtractKeyInfoFromAadhaarTextInputSchema = z.object({
  text: z.string().describe("Raw text from an Aadhaar card."),
});
export type ExtractKeyInfoFromAadhaarTextInput = z.infer<typeof ExtractKeyInfoFromAadhaarTextInputSchema>;

export async function extractKeyInfoFromAadhaarText(
  input: ExtractKeyInfoFromAadhaarTextInput
): Promise<ExtractKeyInfoFromAadhaarOutput> {
  return extractKeyInfoFromAadhaarTextFlow(input);
}

const textPrompt = ai.definePrompt({
  name: 'extractKeyInfoFromAadhaarTextPrompt',
  model: 'googleai/gemini-pro',
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
    inputSchema: ExtractKeyInfoFromAadhaarTextInputSchema,
    outputSchema: ExtractKeyInfoFromAadhaarOutputSchema,
  },
  async (input) => {
    const response = await textPrompt(input);
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
