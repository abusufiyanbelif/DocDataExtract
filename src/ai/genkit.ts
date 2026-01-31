import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// This file is the central configuration for Genkit.
// It initializes the framework and sets up the plugins.

// The googleAI plugin is configured here. It's crucial to provide the API key
// from the environment variables to authenticate with the Google AI services.
// The 'GEMINI_API_KEY' should be set in your .env file.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
