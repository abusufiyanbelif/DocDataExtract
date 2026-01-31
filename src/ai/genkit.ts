import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This file is the central configuration for Genkit.
// It initializes the framework and sets up the plugins.

// The googleAI plugin is configured here. It's crucial to provide the API key
// from the environment variables to authenticate with the Google AI services.
// The key should be in your .env file as GOOGLE_API_KEY or GEMINI_API_KEY.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
});
