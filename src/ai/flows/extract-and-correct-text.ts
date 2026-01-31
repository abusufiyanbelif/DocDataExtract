'use server';

/**
 * @fileOverview Extracts text from an image or document and allows the user to correct any errors.
 *
 * - extractAndCorrectText - A function that handles the text extraction and correction process.
 * - ExtractAndCorrectTextInput - The input type for the extractAndCorrectText function.
 * - ExtractAndCorrectTextOutput - The return type for the extractAndCorrectText function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const ExtractAndCorrectTextInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document or image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userCorrection: z.string().optional().describe('The user-corrected text, if any.'),
});
export type ExtractAndCorrectTextInput = z.infer<typeof ExtractAndCorrectTextInputSchema>;

const ExtractAndCorrectTextOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text from the image or document.'),
});
export type ExtractAndCorrectTextOutput = z.infer<typeof ExtractAndCorrectTextOutputSchema>;

export async function extractAndCorrectText(input: ExtractAndCorrectTextInput): Promise<ExtractAndCorrectTextOutput> {
  return extractAndCorrectTextFlow(input);
}

const extractTextPrompt = ai.definePrompt({
  name: 'extractTextPrompt',
  model: googleAI.model('gemini-pro-vision'),
  input: {schema: ExtractAndCorrectTextInputSchema},
  prompt: `You are an OCR (Optical Character Recognition) expert.

  Extract the text from the following image.

  Image: {{media url=photoDataUri}}
  `,
});

const extractAndCorrectTextFlow = ai.defineFlow(
  {
    name: 'extractAndCorrectTextFlow',
    inputSchema: ExtractAndCorrectTextInputSchema,
    outputSchema: ExtractAndCorrectTextOutputSchema,
  },
  async (input) => {
    // If the user has provided a correction, use that instead of calling the AI.
    if (input.userCorrection) {
      return { extractedText: input.userCorrection };
    }

    const response = await extractTextPrompt(input);
    const extractedText = response.text;

    if (!extractedText) {
      throw new Error('The AI model failed to extract text. Please check the document quality or try again.');
    }
    return { extractedText };
  }
);
