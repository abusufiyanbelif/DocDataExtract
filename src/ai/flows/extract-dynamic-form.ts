'use server';

/**
 * @fileOverview This file defines a Genkit flow for dynamically extracting key-value pairs and tables from an image of a form or document.
 *
 * It includes:
 * - extractDynamicFormFromImage: An async function to initiate the dynamic data extraction flow.
 * - ExtractDynamicFormInput: The input type definition for the function, specifying the image data URI.
 * - ExtractDynamicFormOutput: The output type definition, detailing the extracted key-value pairs and tables.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractDynamicFormInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a form or document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'.",
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
  input: {schema: ExtractDynamicFormInputSchema},
  output: {schema: ExtractDynamicFormOutputSchema},
  prompt: `You are an expert in document analysis and data extraction.

  Your task is to analyze the provided image of a document or form and extract all relevant key-value pairs and any tables. 
  
  - For simple fields, identify the labels (keys) and their corresponding values (e.g., { key: "First Name", value: "John" }).
  - For tabular data, identify the table's name, its column headers, and all of its rows.

  Return the extracted data as a combination of key-value pair fields and structured tables.

  Here is the image of the document: {{media url=photoDataUri}}`,
});

const extractDynamicFormFlow = ai.defineFlow(
  {
    name: 'extractDynamicFormFlow',
    inputSchema: ExtractDynamicFormInputSchema,
    outputSchema: ExtractDynamicFormOutputSchema,
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
