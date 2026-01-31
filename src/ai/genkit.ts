import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/googleai';

// This file is the central configuration for Genkit.
// It initializes the framework and sets up the plugins.
// It uses the GOOGLE_API_KEY from the environment variables.
export const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Flash, // Sets gemini-1.5-flash as the default model for all flows
});
