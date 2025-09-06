'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting key information from identity documents.
 *
 * The flow takes an image of an identity document as input and uses an AI model to extract information
 * such as name, address, and ID number.
 *
 * @exports `extractKeyInfoFromIdentityDocument` - The main function to call to start the flow.
 * @exports `ExtractKeyInfoFromIdentityDocumentInput` - The input type for the flow.
 * @exports `ExtractKeyInfoFromIdentityDocumentOutput` - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractKeyInfoFromIdentityDocumentInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of an identity document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type ExtractKeyInfoFromIdentityDocumentInput = z.infer<
  typeof ExtractKeyInfoFromIdentityDocumentInputSchema
>;

const ExtractKeyInfoFromIdentityDocumentOutputSchema = z.object({
  name: z.string().describe('The full name of the person.'),
  address: z.string().describe('The full address of the person.'),
  idNumber: z.string().describe('The unique identification number.'),
});
export type ExtractKeyInfoFromIdentityDocumentOutput = z.infer<
  typeof ExtractKeyInfoFromIdentityDocumentOutputSchema
>;

export async function extractKeyInfoFromIdentityDocument(
  input: ExtractKeyInfoFromIdentityDocumentInput
): Promise<ExtractKeyInfoFromIdentityDocumentOutput> {
  return extractKeyInfoFromIdentityDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractKeyInfoFromIdentityDocumentPrompt',
  input: {schema: ExtractKeyInfoFromIdentityDocumentInputSchema},
  output: {schema: ExtractKeyInfoFromIdentityDocumentOutputSchema},
  prompt: `You are an expert in extracting information from identity documents.

  Analyze the image and extract the following information:
  - The full name of the person
  - The full address of the person
  - The unique identification number

  Image: {{media url=photoDataUri}}
  `,
});

const extractKeyInfoFromIdentityDocumentFlow = ai.defineFlow(
  {
    name: 'extractKeyInfoFromIdentityDocumentFlow',
    inputSchema: ExtractKeyInfoFromIdentityDocumentInputSchema,
    outputSchema: ExtractKeyInfoFromIdentityDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
