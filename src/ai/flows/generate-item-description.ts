'use server';
/**
 * @fileOverview A Genkit flow for generating professional and appetizing menu item descriptions.
 *
 * - generateItemDescription - A function that generates a description based on item name and cuisine.
 * - GenerateItemDescriptionInput - The input type for the function.
 * - GenerateItemDescriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateItemDescriptionInputSchema = z.object({
  itemName: z.string().describe('The name of the menu item (e.g., "Truffle Tagliatelle").'),
  cuisine: z.string().optional().describe('The type of cuisine served (e.g., "Italian").'),
});
export type GenerateItemDescriptionInput = z.infer<typeof GenerateItemDescriptionInputSchema>;

const GenerateItemDescriptionOutputSchema = z.object({
  description: z.string().describe('A sensory, professional, and appetizing description of the item.'),
});
export type GenerateItemDescriptionOutput = z.infer<typeof GenerateItemDescriptionOutputSchema>;

export async function generateItemDescription(input: GenerateItemDescriptionInput): Promise<GenerateItemDescriptionOutput> {
  return generateItemDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateItemDescriptionPrompt',
  input: { schema: GenerateItemDescriptionInputSchema },
  output: { schema: GenerateItemDescriptionOutputSchema },
  prompt: `You are an expert culinary copywriter for high-end restaurants. Your task is to write a mouth-watering, professional, and concise description (maximum 160 characters) for a menu item.

Item Name: {{{itemName}}}
{{#if cuisine}}Cuisine Style: {{{cuisine}}}{{/if}}

Focus on:
1. Premium ingredients.
2. Professional preparation methods (e.g., "slow-roasted", "hand-stretched").
3. Sensory appeal (textures, aromas, flavors).
4. Keeping it elegant and sophisticated.

Return ONLY the description in the specified JSON format.`,
});

const generateItemDescriptionFlow = ai.defineFlow(
  {
    name: 'generateItemDescriptionFlow',
    inputSchema: GenerateItemDescriptionInputSchema,
    outputSchema: GenerateItemDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("Failed to generate item description.");
    return output;
  }
);
