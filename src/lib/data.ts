
// This file is now primarily for types and mock data for leaderboards.
// Course and topic data will be fetched directly from Firestore in components.

export type Course = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  adminId: string;
  status?: 'draft' | 'published';
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
  status: 'needs-review' | 'approved' | 'flagged';
};

export type FlashcardMastery = {
    id: string;
    userId: string;
    flashcardId: string;
    topicId: string;
    courseId: string;
    correctStreak: number;
    status: 'learning' | 'mastered';
    lastReviewed: any; // Firestore Timestamp
};

export type Question = {
  id: string;
  topicId: string;
  text: string;
  type: 'MCQ' | 'True/False' | 'Short Answer';
  options?: string[];
  answer: string;
  status: 'needs-review' | 'approved' | 'flagged';
};

export type QuizAttempt = {
  id: string;
  userId: string;
  courseId: string;
  quizId: string; // This corresponds to a topicId
  topicName: string;
  score: number;
  attemptedDate: any; // Firestore Timestamp
  correctAnswers: number;
  totalQuestions: number;
};


export type StudentProgress = {
  studentId: string;
  courseId: string;
  completedTopics: string[];
  masteredFlashcards: string[];
  quizScores: { [quizId: string]: number };
  accuracy: number;
};

export type UserBadge = {
    id: string;
    userId: string;
    badgeId: string;
    earnedDate: any; // Firestore Timestamp
}
