'use server';
/**
 * @fileOverview A Genkit flow for generating cohesive color palettes based on a textual description.
 *
 * - generatePalette - A function that generates a 4-color palette using AI.
 * - GeneratePaletteInput - The input type for the function.
 * - GeneratePaletteOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePaletteInputSchema = z.object({
  description: z.string().describe('A description of the desired brand or restaurant atmosphere (e.g., "A moody jazz bar with neon lights").'),
});
export type GeneratePaletteInput = z.infer<typeof GeneratePaletteInputSchema>;

const GeneratePaletteOutputSchema = z.object({
  primary: z.string().describe('The primary brand color in hex format (e.g., "#FF5733").'),
  accent: z.string().describe('The accent color in hex format.'),
  background: z.string().describe('A suitable background color in hex format (usually light or very dark).'),
  text: z.string().describe('A high-contrast text color in hex format.'),
});
export type GeneratePaletteOutput = z.infer<typeof GeneratePaletteOutputSchema>;

export async function generatePalette(input: GeneratePaletteInput): Promise<GeneratePaletteOutput> {
  return generatePaletteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePalettePrompt',
  input: { schema: GeneratePaletteInputSchema },
  output: { schema: GeneratePaletteOutputSchema },
  prompt: `You are an expert brand designer and UI/UX color specialist. Your task is to generate a high-quality, accessible, and aesthetically pleasing 4-color palette for a restaurant storefront based on its description.

Description: {{{description}}}

Generate a palette consisting of:
1. A primary brand color.
2. A secondary accent color.
3. A background color.
4. A primary text color.

Ensure the text color has sufficient contrast against the background color. Return ONLY the hex codes in the specified JSON format.`,
});

const generatePaletteFlow = ai.defineFlow(
  {
    name: 'generatePaletteFlow',
    inputSchema: GeneratePaletteInputSchema,
    outputSchema: GeneratePaletteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("Failed to generate palette.");
    return output;
  }
);
