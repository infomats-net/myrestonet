'use server';
/**
 * @fileOverview AI-powered menu recommendations based on cart context and menu profile.
 *
 * - getSmartRecommendations - Suggests items to add based on flavor profiles and logic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecommendationInputSchema = z.object({
  cartItems: z.array(z.string()).describe('List of item names currently in the cart.'),
  availableMenu: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
  })).describe('The full list of available items in the restaurant.'),
});

const RecommendationOutputSchema = z.object({
  recommendedIds: z.array(z.string()).describe('IDs of the top 3 recommended items.'),
  reasoning: z.string().describe('Brief explanation of why these were chosen.'),
});

export async function getSmartRecommendations(input: z.infer<typeof RecommendationInputSchema>) {
  return smartRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartRecommendationsPrompt',
  input: { schema: RecommendationInputSchema },
  output: { schema: RecommendationOutputSchema },
  prompt: `You are a professional restaurant sommelier and cross-selling expert.
Analyze the items in the customer's cart and suggest 3 items from the available menu that would complement them perfectly.

Cart contains: {{{cartItems}}}

Consider:
1. Flavor pairing (e.g., wine with steak, fries with burgers).
2. Category balance (if they have mains, suggest drinks or desserts).
3. Popularity and logic.

Return ONLY the IDs of the items and a short reasoning.`,
});

const smartRecommendationsFlow = ai.defineFlow(
  {
    name: 'smartRecommendationsFlow',
    inputSchema: RecommendationInputSchema,
    outputSchema: RecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("Failed to generate recommendations.");
    return output;
  }
);
