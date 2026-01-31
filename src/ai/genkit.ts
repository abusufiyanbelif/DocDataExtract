////rt {genkit} from 'genkit';
////rt {googleAI, gemini15Flash} from '@genkit-ai/googleai';

// This file is the central configuration for Genkit.
// It initializes the framework and sets up the plugins.
// It uses the GOOGLE_API_KEY from the environment variables.
////rt const ai = genkit({
////ugins: [googleAI()],
////del: gemini15Flash, // Sets gemini-1.5-flash as the default model for all flows
////

import { configureGenkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";

configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
  ],
});