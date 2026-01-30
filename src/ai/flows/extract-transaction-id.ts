'use server';
/**
 * @fileOverview AI flow to extract a transaction ID from a payment screenshot.
 *
 * - extractTransactionIdFromImage - Function to extract the transaction ID.
 * - ExtractTransactionIdInput - Input type for extractTransactionIdFromImage.
 * - ExtractTransactionIdOutput - Output type for extractTransactionIdFromImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTransactionIdInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A screenshot of a payment confirmation, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTransactionIdInput = z.infer<typeof ExtractTransactionIdInputSchema>;

const ExtractTransactionIdOutputSchema = z.object({
  transactionId: z.string().describe('The Transaction ID, UPI Transaction ID, or any other unique reference number found in the payment confirmation screenshot.'),
});
export type ExtractTransactionIdOutput = z.infer<typeof ExtractTransactionIdOutputSchema>;

export async function extractTransactionIdFromImage(
  input: ExtractTransactionIdInput
): Promise<ExtractTransactionIdOutput> {
  return extractTransactionIdFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionIdPrompt',
  input: {schema: ExtractTransactionIdInputSchema},
  output: {schema: ExtractTransactionIdOutputSchema},
  prompt: `You are an expert OCR agent specializing in reading financial transaction screenshots. Your task is to find and extract the unique transaction identifier from the provided image.

Look for labels like "Transaction ID", "UPI Transaction ID", "Ref No.", or any similar unique identifier. Extract only the ID number itself.

Image: {{media url=photoDataUri}}`,
});

const extractTransactionIdFlow = ai.defineFlow(
  {
    name: 'extractTransactionIdFlow',
    inputSchema: ExtractTransactionIdInputSchema,
    outputSchema: ExtractTransactionIdOutputSchema,
  },
  async (input) => {
    let retries = 3;
    while (retries > 0) {
      try {
        const {output} = await prompt(input);
        return output!;
      } catch (e: any) {
        if (e.message.includes('503') && retries > 1) {
          console.log(`Retrying... (${3 - retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw e;
        }
      }
      retries--;
    }
    throw new Error('Flow failed after multiple retries.');
  }
);
