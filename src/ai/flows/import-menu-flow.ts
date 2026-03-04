'use server';
/**
 * @fileOverview A Genkit flow for extracting structured menu items from a photo.
 *
 * - importMenu - A function that handles the menu extraction process.
 * - ImportMenuInput - The input type for the importMenu function.
 * - ImportMenuOutput - The return type for the importMenu function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImportMenuInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a printed menu, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ImportMenuInput = z.infer<typeof ImportMenuInputSchema>;

const ScannedItemSchema = z.object({
  name: z.string().describe('The name of the menu item.'),
  price: z.number().describe('The price of the item.'),
  description: z.string().describe('A brief description of the item.'),
  category: z.string().describe('The category this item belongs to (e.g. Starters, Mains, Drinks).'),
});

const ImportMenuOutputSchema = z.object({
  items: z.array(ScannedItemSchema).describe('List of items extracted from the menu photo.'),
});
export type ImportMenuOutput = z.infer<typeof ImportMenuOutputSchema>;

export async function importMenu(input: ImportMenuInput): Promise<ImportMenuOutput> {
  return importMenuFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importMenuPrompt',
  input: { schema: ImportMenuInputSchema },
  output: { schema: ImportMenuOutputSchema },
  prompt: `You are an expert menu digitizer. 
  
Analyze this photo of a restaurant menu and extract all available items. 
For each item, identify its name, price (as a number), a short description, and a logical category.

If a price is listed with a currency symbol, extract only the number.
If a description isn't clearly visible for an item, generate a short, professional 1-sentence description based on the item name.

Photo: {{media url=photoDataUri}}`,
});

const importMenuFlow = ai.defineFlow(
  {
    name: 'importMenuFlow',
    inputSchema: ImportMenuInputSchema,
    outputSchema: ImportMenuOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to extract menu items from the image.');
    }
    return output;
  }
);
