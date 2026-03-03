
'use server';
/**
 * @fileOverview A Genkit flow for generating professional, engaging, and Appetizing transactional email content.
 *
 * - generateEmailContent - Generates HTML and Text content for various notification types.
 * - GenerateEmailContentInput - Input type for the email content generator.
 * - GenerateEmailContentOutput - Output type containing subject, text, and html.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateEmailContentInputSchema = z.object({
  type: z.enum(['welcome_admin', 'welcome_partner', 'welcome_support', 'reservation_confirmed', 'order_confirmed']),
  recipientName: z.string().describe('The name of the person receiving the email.'),
  restaurantName: z.string().optional().describe('The name of the restaurant (if applicable).'),
  details: z.string().optional().describe('Specific details like Order ID, Reservation Time, or Login Instructions.'),
});
export type GenerateEmailContentInput = z.infer<typeof GenerateEmailContentInputSchema>;

const GenerateEmailContentOutputSchema = z.object({
  subject: z.string().describe('A catchy and relevant email subject line.'),
  text: z.string().describe('Plain text version of the email body.'),
  html: z.string().describe('Professional HTML version of the email body with modern styling.'),
});
export type GenerateEmailContentOutput = z.infer<typeof GenerateEmailContentOutputSchema>;

export async function generateEmailContent(input: GenerateEmailContentInput): Promise<GenerateEmailContentOutput> {
  return generateEmailContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmailContentPrompt',
  input: { schema: GenerateEmailContentInputSchema },
  output: { schema: GenerateEmailContentOutputSchema },
  prompt: `You are an expert brand communications manager for MyRestoNet, a global luxury restaurant SaaS platform.
Your task is to write a warm, professional, and visually appealing email for a user.

Email Context:
- Type: {{{type}}}
- Recipient: {{{recipientName}}}
{{#if restaurantName}}- Restaurant: {{{restaurantName}}}{{/if}}
{{#if details}}- Key Details: {{{details}}}{{/if}}

Style Guidelines:
1. Use a tone that is welcoming, high-end, and efficient.
2. For restaurant-related emails (Reservations/Orders), include sensory language about food and ambiance.
3. The HTML version should use clean inline CSS, a professional font stack (Inter/Sans-serif), and a 2px rounded green border (#22c55e) for call-to-action sections.
4. Ensure the plain text version is clear and easy to read.

Return only the JSON matching the output schema.`,
});

const generateEmailContentFlow = ai.defineFlow(
  {
    name: 'generateEmailContentFlow',
    inputSchema: GenerateEmailContentInputSchema,
    outputSchema: GenerateEmailContentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("Failed to generate email content.");
    return output;
  }
);
