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
            model: 'googleai/gemini-1.5-flash',
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
    } catch (error: any) {
        console.error("Genkit Diagnostics Check Failed:", error);
        
        let clientMessage = `An unexpected error occurred: ${error.message}`;
        if (error.message) {
            const lowerCaseMessage = error.message.toLowerCase();
            if (lowerCaseMessage.includes('api key not valid')) {
                clientMessage = "The configured API key is not valid. Please ensure you have a valid GOOGLE_API_KEY or GEMINI_API_KEY set in your .env file.";
            } else if (lowerCaseMessage.includes('permission denied')) {
                 clientMessage = 'API permission denied. This usually means the "Generative Language API" is not enabled for your project in the Google Cloud Console, or your API key has restrictions.';
            } else if (lowerCaseMessage.includes('not_found') || lowerCaseMessage.includes('not found') || lowerCaseMessage.includes('404')) {
                clientMessage = `Model not found. This can be caused by several issues: 1) The model name in the code (e.g., 'googleai/gemini-1.5-flash') is incorrect. 2) The "Generative Language API" is not enabled in your Google Cloud project. 3) Your API key may have restrictions. Please check your GOOGLE_API_KEY/GEMINI_API_KEY and Google Cloud project configuration. (Details: ${error.message})`;
            }
        }
        
        // Append a general help message if the error is about API keys
        if (clientMessage.toLowerCase().includes('api key')) {
            clientMessage += " Your application is configured to check for both 'GOOGLE_API_KEY' and 'GEMINI_API_KEY' in your .env file."
        }

        return { ok: false, message: clientMessage };
    }
}
