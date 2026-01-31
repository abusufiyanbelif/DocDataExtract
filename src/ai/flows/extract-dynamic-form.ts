'use server';

/**
 * @fileOverview This file defines a Genkit flow for dynamically extracting key-value pairs and tables from an image.
 *
 * It includes:
 * - extractDynamicFormFromImage: An async function to initiate the dynamic data extraction flow.
 * - ExtractDynamicFormInput: The input type definition for the function, specifying the raw image.
 * - ExtractDynamicFormOutput: The output type definition, detailing the extracted key-value pairs and tables.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractDynamicFormInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a form or document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractDynamicFormInput = z.infer<typeof ExtractDynamicFormInputSchema>;

const KeyValuePairSchema = z.object({
  key: z.string().describe('The label or key for a piece of information found in the document.'),
  value: z.string().describe('The value associated with the corresponding key.'),
});

const TableSchema = z.object({
  name: z.string().describe("A descriptive name for the table, like 'Purchased Items' or 'Contact List'."),
  headers: z.array(z.string()).describe("The column headers for the table."),
  rows: z.array(z.array(z.string())).describe("The row data for the table, where each inner array represents a row."),
});

const ExtractDynamicFormOutputSchema = z.object({
    firstName: z.string().optional().describe("The person's first name, if present."),
    lastName: z.string().optional().describe("The person's last name, if present."),
    middleName: z.string().optional().describe("The person's middle name, if present."),
    country: z.string().optional().describe("The country, if present."),
    state: z.string().optional().describe("The state, if present."),
    city: z.string().optional().describe("The city, if present."),
    pinCode: z.string().optional().describe("The pin code or zip code, if present."),
    fields: z.array(KeyValuePairSchema).describe('An array of key-value pairs extracted from the document.'),
    tables: z.array(TableSchema).describe('An array of tables extracted from the document.'),
});
export type ExtractDynamicFormOutput = z.infer<typeof ExtractDynamicFormOutputSchema>;

export async function extractDynamicFormFromImage(
  input: ExtractDynamicFormInput
): Promise<ExtractDynamicFormOutput> {
  return extractDynamicFormFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractDynamicFormPrompt',
  model: 'gemini-1.5-flash',
  prompt: `You are an expert in document analysis and data extraction.

Your task is to analyze the provided image of a document or form and extract all relevant information.

- If a person's full name is present, extract their first, middle, and last names.
- If an address is present, extract the country, state, city, and pin code.
- For simple fields, identify the labels (keys) and their corresponding values (e.g., { key: "First Name", value: "John" }).
- In many documents, a key will be in one column and the value in another, often separated by a colon (:). For example, "Patient Name : Mr. John Doe". In this case, the key is "Patient Name" and the value is "Mr. John Doe". Make sure to remove the colon from the beginning of the value if it gets included.
- For tabular data, identify the table's name (if any), its column headers, and all of its rows.

Return ONLY a single, valid JSON object with the extracted data. Do not include any text, markdown, or formatting before or after the JSON object.

The JSON object should have the following optional top-level keys for specific personal data: "firstName", "lastName", "middleName", "country", "state", "city", "pinCode".
It must also have a "fields" key containing an array of all other extracted key-value pairs (as objects with "key" and "value" properties), and a "tables" key containing an array of all extracted tables. A table object should have "name" (string), "headers" (array of strings), and "rows" (array of array of strings).

Here is the image of the document:
---
Image: {{media url=photoDataUri}}
---`,
});

const extractDynamicFormFlow = ai.defineFlow(
  {
    name: 'extractDynamicFormFlow',
    inputSchema: ExtractDynamicFormInputSchema,
    outputSchema: ExtractDynamicFormOutputSchema,
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
        return ExtractDynamicFormOutputSchema.parse(parsed);
    } catch (e: any) {
        console.warn("Failed to parse AI response:", text, e);
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`);
    }
  }
);
