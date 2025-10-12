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
  isCorrect: z.boolean().describe('Whether the student\'s answer is semantically correct when compared to the model answer.'),
  feedback: z.string().describe('A very brief explanation for why the answer is correct or incorrect.'),
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

  Focus on semantic equivalence. The student's answer does not need to be a word-for-word match. As long as it conveys the same core meaning and is accurate, it should be considered correct.

  Question: {{{question}}}
  Correct Answer: {{{correctAnswer}}}
  Student's Answer: {{{studentAnswer}}}

  Based on this, determine if the student's answer is correct. Provide brief feedback explaining your decision. For example, if the student's answer is correct but phrased differently, the feedback could be "Correct! You've captured the key points." If it's incorrect, briefly state what was missed.
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
