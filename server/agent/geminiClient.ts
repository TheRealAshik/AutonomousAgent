import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export { ThinkingLevel };

export const MODELS = {
  COMPLEX: 'gemini-4-argon', // Used for deep planning, reasoning with HIGH thinking
  STANDARD: 'gemini-3.8-flash', // Used for general analysis and rapid generation
  FAST: 'gemini-3.1-flash-lite', // Used for fast summaries and lightweight validations
};
