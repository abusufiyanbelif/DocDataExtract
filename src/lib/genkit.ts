import { configureGenkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";

configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
  ],
});

console.log("✅ Genkit initialized with Google AI");
