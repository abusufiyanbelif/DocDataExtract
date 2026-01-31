
'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting billing data from text.
 *
 * It includes:
 * - extractBillingDataFromText: An async function to initiate the billing data extraction flow.
 * - ExtractBillingDataInput: The input type definition for the function, specifying the text.
 * - ExtractBillingDataOutput: The output type definition, detailing the extracted billing information.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBillingDataInputSchema = z.object({
  text: z.string().describe("The raw text from a bill or invoice from which to extract data."),
});
export type ExtractBillingDataInput = z.infer<typeof ExtractBillingDataInputSchema>;

const PurchasedItemSchema = z.object({
  item: z.string().describe('The name or description of the purchased item.'),
  quantity: z.number().optional().describe('The quantity of the item.'),
  unitPrice: z.number().optional().describe('The price per unit of the item.'),
  totalPrice: z.number().describe('The total price for the line item.'),
});

const ExtractBillingDataOutputSchema = z.object({
  vendorInformation: z.string().describe('The name and contact information of the vendor.'),
  dates: z.string().describe('The billing date and due date, if available.'),
  amounts: z.string().describe('The total amount due and any other relevant amounts.'),
  purchasedItems: z.array(PurchasedItemSchema).describe('An array of items or services purchased, with their details.'),
});
export type ExtractBillingDataOutput = z.infer<typeof ExtractBillingDataOutputSchema>;

export async function extractBillingDataFromText(
  input: ExtractBillingDataInput
): Promise<ExtractBillingDataOutput> {
  return extractBillingDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBillingDataPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  prompt: `You are an expert in extracting data from bills and invoices.

  Please extract the following information from the text provided.
  Return ONLY a single, valid JSON object with the extracted information. Do not include any text, markdown, or formatting before or after the JSON object.

  The JSON object should have the following keys:
  - "vendorInformation" (string): The name and contact information of the vendor.
  - "dates" (string): The billing date and due date, if available.
  - "amounts" (string): The total amount due and any other relevant amounts.
  - "purchasedItems" (array): A list of items or services. Each item in the array should be an object with keys: "item" (string), "quantity" (number, optional), "unitPrice" (number, optional), and "totalPrice" (number).

  Here is the text from the bill:
  ---
  {{{text}}}
  ---`,
});

const extractBillingDataFlow = ai.defineFlow(
  {
    name: 'extractBillingDataFlow',
    inputSchema: ExtractBillingDataInputSchema,
    outputSchema: ExtractBillingDataOutputSchema,
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
        return ExtractBillingDataOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
