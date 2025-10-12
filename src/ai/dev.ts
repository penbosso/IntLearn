import { config } from 'dotenv';
config();

import '@/ai/flows/generate-flashcards-and-questions.ts';
import '@/ai/flows/adaptive-quizzes.ts';
import '@/ai/flows/evaluate-answer-flow.ts';
