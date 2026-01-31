'use server';
/**
 * @fileOverview AI flow to extract key details from a payment screenshot.
 *
 * - extractPaymentDetails - Function to extract amount, transaction ID, and date.
 * - ExtractPaymentDetailsInput - Input type for extractPaymentDetails.
 * - ExtractPaymentDetailsOutput - Output type for extractPaymentDetails.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
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
  model: googleAI.model('gemini-pro-vision'),
  input: {schema: ExtractPaymentDetailsInputSchema},
  prompt: `You are an expert OCR agent specializing in reading financial transaction screenshots from Indian payment apps like Google Pay and Paytm. Your task is to analyze the provided image and extract the following details precisely.

1.  **amount**: Find the main transaction amount. It may have a currency symbol like '₹'. The value should be a number. For example, if you see '₹200', the value should be \`200\`.
2.  **transactionId**: Find the unique transaction identifier. Look for labels like "UPI Transaction ID", "Transaction ID", "UTR", or "Ref No.". Extract the alphanumeric code associated with it.
3.  **date**: Find the date of the transaction. If you find a date (e.g., "Jan 31, 2026", "31-01-2026"), you MUST format it as YYYY-MM-DD.

Return the extracted information as a single, valid JSON object. Do not include any text, markdown, or formatting before or after the JSON object. The JSON object should have the following keys: "amount" (number), "transactionId" (string), "date" (string in YYYY-MM-DD format). If any of these fields are not clearly visible in the image, omit them from the JSON object. It is critical that you adhere to the data types specified.

Image: {{media url=photoDataUri}}`,
});

const extractPaymentDetailsFlow = ai.defineFlow(
  {
    name: 'extractPaymentDetailsFlow',
    inputSchema: ExtractPaymentDetailsInputSchema,
    outputSchema: ExtractPaymentDetailsOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    const text = response.text.trim();
    
    // Find the JSON part in case the model adds extra text like ```json ... ```
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response from AI. Expected a JSON object.');
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate with Zod schema before returning
        return ExtractPaymentDetailsOutputSchema.parse(parsed);
    } catch (e) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error('Failed to parse JSON response from AI.');
    }
  }
);
