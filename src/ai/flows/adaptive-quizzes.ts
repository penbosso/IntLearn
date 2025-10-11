'use server';

/**
 * @fileOverview An AI-powered adaptive quiz generator.
 *
 * - generateAdaptiveQuiz - A function that generates an adaptive quiz based on student performance.
 * - AdaptiveQuizInput - The input type for the generateAdaptiveQuiz function.
 * - AdaptiveQuizOutput - The return type for the generateAdaptiveQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptiveQuizInputSchema = z.object({
  courseName: z.string().describe('The name of the course.'),
  topic: z.string().describe('The topic of the quiz.'),
  studentPerformanceData: z.string().describe('The student performance data, as a string.'),
  numQuestions: z.number().describe('The number of questions to generate.'),
});
export type AdaptiveQuizInput = z.infer<typeof AdaptiveQuizInputSchema>;

const AdaptiveQuizOutputSchema = z.object({
  quizQuestions: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).describe('The possible answers to the question.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated quiz questions.'),
});
export type AdaptiveQuizOutput = z.infer<typeof AdaptiveQuizOutputSchema>;

export async function generateAdaptiveQuiz(input: AdaptiveQuizInput): Promise<AdaptiveQuizOutput> {
  return adaptiveQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptiveQuizPrompt',
  input: {schema: AdaptiveQuizInputSchema},
  output: {schema: AdaptiveQuizOutputSchema},
  prompt: `You are an AI quiz generator that creates quizzes based on student performance.

  Course Name: {{{courseName}}}
  Topic: {{{topic}}}
  Student Performance Data: {{{studentPerformanceData}}}

  Based on the student performance data, generate a quiz with {{{numQuestions}}} questions that focuses on the student's weak areas.

  The quiz should be in JSON format and should contain an array of quiz questions. Each question should have a question, options, and correctAnswer field.
  The options field should be an array of strings, and the correctAnswer field should be a string that is one of the options.
  Here is an example of the output format:
  {
    "quizQuestions": [
      {
        "question": "Question 1",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": "Option 1"
      },
      {
        "question": "Question 2",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option B"
      }
    ]
  }
  `,
});

const adaptiveQuizFlow = ai.defineFlow(
  {
    name: 'adaptiveQuizFlow',
    inputSchema: AdaptiveQuizInputSchema,
    outputSchema: AdaptiveQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
