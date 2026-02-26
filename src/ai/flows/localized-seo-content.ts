'use server';
/**
 * @fileOverview A Genkit flow for generating localized SEO content (meta-tags and Schema.org markup) for restaurants.
 *
 * - localizedSeoContentGenerator - A function that handles the generation of localized SEO content.
 * - LocalizedSeoContentInput - The input type for the localizedSeoContentGenerator function.
 * - LocalizedSeoContentOutput - The return type for the localizedSeoContentGenerator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LocalizedSeoContentInputSchema = z.object({
  restaurantName: z.string().describe('The name of the restaurant.'),
  cuisineType: z.string().describe('The type of cuisine served (e.g., Italian, Mexican, Vegan).'),
  location: z
    .string()
    .describe('The city and country where the restaurant is located (e.g., London, UK).'),
  description: z.string().describe('A brief description of the restaurant.'),
  menuHighlights: z.string().describe('Key dishes or specialties offered by the restaurant.'),
  websiteUrl: z.string().url().describe('The official website URL of the restaurant.'),
  phoneNumber: z.string().describe('The contact phone number of the restaurant.'),
  address: z.string().describe('The full physical address of the restaurant.'),
  locale: z
    .string()
    .describe('The target locale for localization (e.g., "en-US", "es-ES", "fr-FR").'),
});
export type LocalizedSeoContentInput = z.infer<typeof LocalizedSeoContentInputSchema>;

const LocalizedSeoContentOutputSchema = z.object({
  metaTitle: z.string().describe('Optimized HTML <title> tag content for the restaurant.'),
  metaDescription:
    z.string().describe('Optimized HTML <meta name="description"> content for the restaurant.'),
  keywords: z.array(z.string()).describe('A list of relevant keywords for SEO.'),
  schemaMarkup: z
    .string()
    .describe('JSON-LD Schema.org markup for LocalBusiness, optimized for the restaurant.'),
});
export type LocalizedSeoContentOutput = z.infer<typeof LocalizedSeoContentOutputSchema>;

export async function localizedSeoContentGenerator(
  input: LocalizedSeoContentInput
): Promise<LocalizedSeoContentOutput> {
  return localizedSeoContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'localizedSeoContentPrompt',
  input: {schema: LocalizedSeoContentInputSchema},
  output: {schema: LocalizedSeoContentOutputSchema},
  prompt: `You are an expert in local SEO and Schema.org markup generation. Your goal is to create highly optimized and localized meta-tags and JSON-LD Schema.org markup for a restaurant's online presence.

Use the following restaurant details to generate the content. Ensure the output is tailored for the specified locale and adheres to best SEO practices for local businesses.

Restaurant Name: {{{restaurantName}}}
Cuisine Type: {{{cuisineType}}}
Location: {{{location}}}
Description: {{{description}}}
Menu Highlights: {{{menuHighlights}}}
Website URL: {{{websiteUrl}}}
Phone Number: {{{phoneNumber}}}
Address: {{{address}}}
Target Locale: {{{locale}}}

---

Instructions:
1. Generate a concise and compelling 'metaTitle' (up to 60 characters) that includes the restaurant name, cuisine, and location, optimized for the target locale.
2. Create an engaging 'metaDescription' (up to 160 characters) that highlights the restaurant's offerings, unique selling points, and location, optimized for the target locale.
3. Provide a list of up to 10 relevant 'keywords' for the restaurant, considering its cuisine, location, and specialties, localized for the target locale.
4. Generate full JSON-LD Schema.org markup for a 'LocalBusiness' type, specifically tailored for a 'Restaurant'. Include properties such as '@context', '@type', 'name', 'address' (PostalAddress), 'telephone', 'url', 'servesCuisine', 'menu', 'acceptsReservations', 'priceRange', and 'hasMap' (using a generic Google Maps URL if a specific one is not provided). Ensure all text fields are localized according to the 'Target Locale'. Ensure address is broken down into streetAddress, addressLocality, addressRegion, postalCode, addressCountry.

Only output the JSON structure as described by the output schema, with all fields populated.`,
});

const localizedSeoContentFlow = ai.defineFlow(
  {
    name: 'localizedSeoContentFlow',
    inputSchema: LocalizedSeoContentInputSchema,
    outputSchema: LocalizedSeoContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
