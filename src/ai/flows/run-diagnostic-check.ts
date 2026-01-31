'use server';
/**
 * @fileOverview A simple AI flow to test Genkit connectivity.
 *
 * - runDiagnosticCheck - Function to check Gemini API connectivity.
 */

import {ai} from '@/ai/genkit';

export async function runDiagnosticCheck(): Promise<{ok: boolean; message: string}> {
    try {
        const response = await ai.generate({
            model: 'gemini-1.5-flash',
            prompt: 'Reply with only the word: "OK"',
            config: {
                temperature: 0,
            }
        });

        const text = response.text.trim();
        if (text === 'OK') {
            return { ok: true, message: 'Successfully received a valid response from the Gemini model.' };
        } else {
            return { ok: false, message: `Received an unexpected response: "${text}"` };
        }
    } catch (error: any) => {
        console.error("Genkit Diagnostics Check Failed:", error);
        // Sanitize the error message for the client
        let clientMessage = "An unexpected error occurred.";
        if (error.message) {
            if (error.message.includes('API key not valid')) {
                clientMessage = 'The configured GEMINI_API_KEY is not valid. Please check your .env file.';
            } else if (error.message.includes('404')) {
                clientMessage = `The model was not found. This may indicate an API version mismatch or incorrect model name configuration. (Details: ${error.message})`;
            } else if (error.message.includes('permission denied')) {
                 clientMessage = 'API permission denied. Ensure the Gemini API is enabled for your project in Google Cloud Console.';
            }
             else {
                 clientMessage = `The AI model returned an error: ${error.message}`;
            }
        }
        return { ok: false, message: clientMessage };
    }
}
