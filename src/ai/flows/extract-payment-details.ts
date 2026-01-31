'use server';
/**
 * @fileOverview AI flow to extract key details from a payment confirmation text.
 *
 * - extractPaymentDetails - Function to extract amount, transaction ID, and date.
 * - ExtractPaymentDetailsInput - Input type for extractPaymentDetails.
 * - ExtractPaymentDetailsOutput - Output type for extractPaymentDetails.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractPaymentDetailsInputSchema = z.object({
  text: z.string().describe("Raw text from a payment confirmation to be parsed."),
});
export type ExtractPaymentDetailsInput = z.infer<typeof ExtractPaymentDetailsInputSchema>;

const ExtractPaymentDetailsOutputSchema = z.object({
  receiverName: z.string().optional().describe('The name of the person or entity who received the payment.'),
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
  prompt: `You are an expert OCR agent specializing in parsing financial transaction text from Indian payment apps like Google Pay and Paytm. Your task is to analyze the provided text and extract the following details precisely.

1.  **receiverName**: The name of the person or entity who received the payment. Look for labels like "Paid to", "To:", or the primary name displayed as the recipient.
2.  **amount**: Find the main transaction amount. It may have a currency symbol like '₹'. The value should be a number. For example, if you see '₹200', the value should be \`200\`.
3.  **transactionId**: Find the unique transaction identifier. Look for labels like "UPI Transaction ID", "Transaction ID", "UTR", or "Ref No.". Extract the alphanumeric code associated with it.
4.  **date**: Find the date of the transaction. If you find a date (e.g., "Jan 31, 2026", "31-01-2026"), you MUST format it as YYYY-MM-DD.

Return ONLY a single, valid JSON object with the extracted information. Do not include any text, markdown, or formatting before or after the JSON object. The JSON object should have the following keys: "receiverName" (string), "amount" (number), "transactionId" (string), "date" (string in YYYY-MM-DD format). If any of these fields are not clearly visible, omit them from the JSON object. It is critical that you adhere to the data types specified.

---
EXTRACT FROM THIS TEXT:
{{{text}}}
---
`,
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
    
    // Find the JSON part in case the model adds extra text like \`\`\`json ... \`\`\`
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('The AI model did not return a valid JSON object. Please check the extracted text quality.');
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate with Zod schema before returning
        return ExtractPaymentDetailsOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
