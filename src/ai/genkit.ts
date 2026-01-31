import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// IMPORTANT: Do NOT import any flows into this file.
// This file is for initializing the 'ai' object only.
// All flow imports should be in 'src/ai/dev.ts'.

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    console.warn(
    'GEMINI_API_KEY environment variable not set. AI features will not work. For local development, add it to your .env file. For deployment, add it as a secret in your Firebase App Hosting configuration.'
    );
}

// Always include the googleAI plugin. It can handle a missing key and will
// throw an error at runtime if an AI call is made without credentials.
const plugins = [googleAI({apiKey: geminiApiKey})];


export const ai = genkit({
  plugins,
});
