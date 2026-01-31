'use server';
/**
 * @fileOverview AI flow to extract key details from a payment screenshot.
 *
 * - extractPaymentDetails - Function to extract amount, transaction ID, and date.
 * - ExtractPaymentDetailsInput - Input type for extractPaymentDetails.
 * - ExtractPaymentDetailsOutput - Output type for extractPaymentDetails.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractPaymentDetailsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A screenshot of a payment confirmation (e.g., Google Pay, Paytm), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractPaymentDetailsInput = z.infer<typeof ExtractPaymentDetailsInputSchema>;

const ExtractPaymentDetailsOutputSchema = z.object({
  amount: z.number().optional().describe('The transaction amount, as a number without currency symbols.'),
  transactionId: z.string().optional().describe('The Transaction ID, UPI Transaction ID, or any other unique reference number.'),
  date: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format.'),
});
export type ExtractPaymentDetailsOutput = z.infer<typeof ExtractPaymentDetailsOutputSchema>;

export async function extractPaymentDetails(
  input: ExtractPaymentDetailsInput
): Promise<ExtractPaymentDetailsOutput> {
  return extractPaymentDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractPaymentDetailsPrompt',
  input: {schema: ExtractPaymentDetailsInputSchema},
  output: {schema: ExtractPaymentDetailsOutputSchema},
  prompt: `You are an expert OCR agent specializing in reading financial transaction screenshots from services like Google Pay and Paytm. Your task is to find and extract the following details from the provided image:

- The transaction amount (as a number).
- The unique transaction identifier (look for "Transaction ID", "UPI Transaction ID", "Ref No.").
- The date of the transaction (format as YYYY-MM-DD).

Return only the information you can find.

Image: {{media url=photoDataUri}}`,
});

const extractPaymentDetailsFlow = ai.defineFlow(
  {
    name: 'extractPaymentDetailsFlow',
    inputSchema: ExtractPaymentDetailsInputSchema,
    outputSchema: ExtractPaymentDetailsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
