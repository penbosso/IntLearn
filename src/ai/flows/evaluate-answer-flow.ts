'use server';
/**
 * @fileOverview An AI-powered answer evaluator.
 *
 * - evaluateAnswer - A function that evaluates a student's answer against a correct answer.
 * - EvaluateAnswerInput - The input type for the evaluateAnswer function.
 * - EvaluateAnswerOutput - The return type for the evaluateAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateAnswerInputSchema = z.object({
  question: z.string().describe('The question that was asked.'),
  correctAnswer: z.string().describe('The model or correct answer to the question.'),
  studentAnswer: z.string().describe("The student's submitted answer."),
});
export type EvaluateAnswerInput = z.infer<typeof EvaluateAnswerInputSchema>;

const EvaluateAnswerOutputSchema = z.object({
  correctness: z.number().min(0).max(1).describe('A score from 0.0 (completely incorrect) to 1.0 (perfectly correct), indicating how correct the student\'s answer is.'),
  feedback: z.string().describe('A very brief explanation for why the answer is correct or incorrect, explaining the given score.'),
});
export type EvaluateAnswerOutput = z.infer<typeof EvaluateAnswerOutputSchema>;

export async function evaluateAnswer(input: EvaluateAnswerInput): Promise<EvaluateAnswerOutput> {
  return evaluateAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateAnswerPrompt',
  input: {schema: EvaluateAnswerInputSchema},
  output: {schema: EvaluateAnswerOutputSchema},
  prompt: `You are an AI teaching assistant. Your task is to evaluate a student's answer to a question by comparing it to the provided correct answer.

  Focus on semantic equivalence. The student's answer does not need to be a word-for-word match.

  Assign a "correctness" score from 0.0 to 1.0:
  - 1.0 for a complete and accurate answer.
  - 0.5 - 0.9 for a partially correct answer that captures some key points but misses others.
  - 0.0 - 0.4 for an answer that is mostly or completely incorrect.

  Question: {{{question}}}
  Correct Answer: {{{correctAnswer}}}
  Student's Answer: {{{studentAnswer}}}

  Based on this, determine the correctness score. Provide brief feedback explaining your decision and the score you gave.
  `,
});

const evaluateAnswerFlow = ai.defineFlow(
  {
    name: 'evaluateAnswerFlow',
    inputSchema: EvaluateAnswerInputSchema,
    outputSchema: EvaluateAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
