'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating flashcards and questions from course materials.
 *
 * The flow takes course materials as input and uses AI to extract key concepts and generate flashcards and questions.
 * It exports the following:
 * - `generateFlashcardsAndQuestions`: The main function to trigger the flow.
 * - `GenerateFlashcardsAndQuestionsInput`: The input type for the flow.
 * - `GenerateFlashcardsAndQuestionsOutput`: The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MaterialSchema = z.object({
  type: z.enum(['text', 'image', 'pdf']).describe('The type of the material provided.'),
  content: z.string().describe('The course material to process. Can be text, or a data URI for an image/PDF.'),
});

const GenerateFlashcardsAndQuestionsInputSchema = z.object({
  materials: z.array(MaterialSchema).describe('An array of course materials to process.'),
});

export type GenerateFlashcardsAndQuestionsInput = z.infer<typeof GenerateFlashcardsAndQuestionsInputSchema>;

const GenerateFlashcardsAndQuestionsOutputSchema = z.object({
  flashcards: z.array(z.object({
    front: z.string().describe('The question or concept on the front of the flashcard.'),
    back: z.string().describe('The answer or explanation on the back of the flashcard.'),
  })).describe('The generated flashcards.'),
  questions: z.array(z.object({
    question: z.string().describe('The question text.'),
    answer: z.string().describe('The answer to the question.'),
    type: z.enum(['MCQ', 'True/False', 'Short Answer']).describe('The type of question.'),
    options: z.array(z.string()).optional().describe('The multiple choice options, if applicable.'),
  })).describe('The generated questions.'),
});

export type GenerateFlashcardsAndQuestionsOutput = z.infer<typeof GenerateFlashcardsAndQuestionsOutputSchema>;

export async function generateFlashcardsAndQuestions(input: GenerateFlashcardsAndQuestionsInput): Promise<GenerateFlashcardsAndQuestionsOutput> {
  return generateFlashcardsAndQuestionsFlow(input);
}

// Add an isText boolean to the prompt input schema for easier templating
const PromptInputSchema = GenerateFlashcardsAndQuestionsInputSchema.extend({
    materials: z.array(MaterialSchema.extend({
        isText: z.boolean(),
    })),
});


const generateFlashcardsAndQuestionsPrompt = ai.definePrompt({
  name: 'generateFlashcardsAndQuestionsPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: GenerateFlashcardsAndQuestionsOutputSchema},
  prompt: `You are an AI assistant designed to generate flashcards and questions from course materials.

  Your goal is to help admins quickly create learning resources for their students.

  Given the following course materials, please generate a unified set of flashcards and questions.
  
  {{#each materials}}
  Material (Type: {{{this.type}}}):
  {{#if this.isText}}
    {{{this.content}}}
  {{else}}
    {{media url=this.content}}
  {{/if}}
  ---
  {{/each}}

  Flashcards should have a clear question or concept on the front and a concise answer or explanation on the back.

  Questions should be of various types: multiple choice (MCQ), true/false, and short answer. For multiple choice questions, provide several options, one of which is the correct answer. Each question should have a single correct answer. There should be an 'options' field if and only if the question 'type' is 'MCQ'.

  Present the output in a JSON format that adheres to the following schema:
  ${JSON.stringify(GenerateFlashcardsAndQuestionsOutputSchema.describe('schema for output'))}
  `,
});

const generateFlashcardsAndQuestionsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsAndQuestionsFlow',
    inputSchema: GenerateFlashcardsAndQuestionsInputSchema,
    outputSchema: GenerateFlashcardsAndQuestionsOutputSchema,
  },
  async input => {
    // Pre-process materials to add the 'isText' flag for easier use in the prompt template
    const processedMaterials = input.materials.map(material => ({
      ...material,
      isText: material.type === 'text',
    }));

    const {output} = await generateFlashcardsAndQuestionsPrompt({
        materials: processedMaterials
    });
    return output!;
  }
);
