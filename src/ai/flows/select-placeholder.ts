'use server';
/**
 * @fileOverview A Genkit flow for intelligently selecting a relevant placeholder image based on an item's name.
 *
 * - selectPlaceholder - A function that returns the best matching image ID from the library.
 * - SelectPlaceholderInput - Input type containing the item name.
 * - SelectPlaceholderOutput - Output type containing the chosen ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const SelectPlaceholderInputSchema = z.object({
  itemName: z.string().describe('The name of the menu item (e.g., "Pepperoni Pizza").'),
});
export type SelectPlaceholderInput = z.infer<typeof SelectPlaceholderInputSchema>;

const SelectPlaceholderOutputSchema = z.object({
  placeholderId: z.string().describe('The ID of the most relevant image from the provided list.'),
});
export type SelectPlaceholderOutput = z.infer<typeof SelectPlaceholderOutputSchema>;

export async function selectPlaceholder(input: SelectPlaceholderInput): Promise<SelectPlaceholderOutput> {
  return selectPlaceholderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'selectPlaceholderPrompt',
  input: { schema: SelectPlaceholderInputSchema },
  output: { schema: SelectPlaceholderOutputSchema },
  prompt: `You are an expert culinary visual designer. Your task is to select the most visually appropriate image ID for a menu item based on its name.

Item Name: {{{itemName}}}

Available Images:
{{#each placeholders}}
- ID: {{this.id}} (Description: {{this.description}})
{{/each}}

Instructions:
1. Analyze the Item Name.
2. Compare it to the Descriptions of the Available Images.
3. Select the ID of the image that best represents the item.
4. If it is a generic main course or meat dish, prefer 'food-steak'.
5. If it is a drink, prefer 'food-drink'.
6. If no specific match is found, select 'hero-restaurant' as a generic high-quality fallback.

Return only the JSON matching the output schema.`,
});

const selectPlaceholderFlow = ai.defineFlow(
  {
    name: 'selectPlaceholderFlow',
    inputSchema: SelectPlaceholderInputSchema,
    outputSchema: SelectPlaceholderOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      placeholders: PlaceHolderImages
    });
    if (!output) throw new Error("Failed to select a relevant placeholder image.");
    return output;
  }
);
