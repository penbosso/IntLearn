// This file is now primarily for types and mock data for leaderboards.
// Course and topic data will be fetched directly from Firestore in components.

import { PlaceHolderImages } from './placeholder-images';

export type Course = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  adminId: string;
};

export type Topic = {
  id:string;
  courseId: string;
  name: string;
};

export type Flashcard = {
  id: string;
  topicId: string;
  front: string;
  back: string;
};

export type Question = {
  id: string;
  topicId: string;
  text: string;
  type: 'MCQ' | 'True/False' | 'Short Answer';
  options?: string[];
  answer: string;
};

export type StudentProgress = {
  studentId: string;
  courseId: string;
  completedTopics: string[];
  masteredFlashcards: string[];
  quizScores: { [quizId: string]: number };
  accuracy: number;
};

// This function can be used for features that don't need live data, like the leaderboard.
export const getLeaderboard = async () => {
    const { mockUsers } = await import('./auth');
    const sortedUsers = mockUsers.filter(u => u.role === 'student').sort((a, b) => b.xp - a.xp);
    return new Promise(resolve => setTimeout(() => resolve(sortedUsers), 50));
};
