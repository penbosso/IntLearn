'use client';

import { useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  collectionGroup,
  query,
  where,
} from 'firebase/firestore';
import type { Topic, QuizAttempt, Flashcard, Question } from '@/lib/data';

const PASSING_THRESHOLD = 70; // 70%

/**
 * A custom hook to calculate a user's progress for a specific course.
 * @param courseId The ID of the course to track progress for.
 * @returns An object containing the progress percentage, completed topic IDs, and loading state.
 */
export function useCourseProgress(courseId: string | null) {
  const { user } = useUser();
  const firestore = useFirestore();

  // 1. Fetch all topics for the given course
  const topicsQuery = useMemoFirebase(
    () =>
      firestore && courseId
        ? collection(firestore, `courses/${courseId}/topics`)
        : null,
    [firestore, courseId]
  );
  const { data: topics, isLoading: areTopicsLoading } =
    useCollection<Topic>(topicsQuery);

  // 2. Fetch all quiz attempts for the current user in this course
  const attemptsQuery = useMemoFirebase(
    () =>
      firestore && user && courseId
        ? query(
            collection(firestore, `users/${user.uid}/quizAttempts`),
            where('courseId', '==', courseId)
          )
        : null,
    [firestore, user, courseId]
  );
  const { data: quizAttempts, isLoading: areAttemptsLoading } =
    useCollection<QuizAttempt>(attemptsQuery);

  // 3. Fetch all approved flashcards and questions for the entire course to determine which topics have content
  const flashcardsQuery = useMemoFirebase(
    () =>
      firestore && courseId
        ? query(
            collectionGroup(firestore, 'flashcards'),
            where('courseId', '==', courseId),
            where('status', '==', 'approved')
          )
        : null,
    [firestore, courseId]
  );
  const { data: allFlashcards, isLoading: areFlashcardsLoading } =
    useCollection<Flashcard>(flashcardsQuery);

  const questionsQuery = useMemoFirebase(
    () =>
      firestore && courseId
        ? query(
            collectionGroup(firestore, 'questions'),
            where('courseId', '==', courseId),
            where('status', '==', 'approved')
          )
        : null,
    [firestore, courseId]
  );
  const { data: allQuestions, isLoading: areQuestionsLoading } =
    useCollection<Question>(questionsQuery);

  const isLoading =
    !courseId || // Ensure courseId is present before calculating
    areTopicsLoading ||
    areAttemptsLoading ||
    areFlashcardsLoading ||
    areQuestionsLoading;

  // 4. Memoize the calculation of progress
  const { progress, completedTopics } = useMemo(() => {
    if (isLoading || !topics || !quizAttempts || !allFlashcards || !allQuestions) {
      return { progress: 0, completedTopics: [] };
    }

    // Determine which topics have actual, approved content
    const contentTopicIds = new Set([
        ...allFlashcards.map(fc => fc.topicId),
        ...allQuestions.map(q => q.topicId)
    ]);
    
    const relevantTopics = topics.filter(topic => contentTopicIds.has(topic.id));

    if (relevantTopics.length === 0) {
      return { progress: 100, completedTopics: [] }; // No content, so course is 100% "complete"
    }

    // Find all topics where the user has at least one passing quiz attempt
    const completed = relevantTopics
      .filter((topic) =>
        quizAttempts.some(
          (attempt) =>
            attempt.quizId === topic.id && attempt.score >= PASSING_THRESHOLD
        )
      )
      .map((topic) => topic.id);

    const progressPercentage = (completed.length / relevantTopics.length) * 100;

    return { progress: progressPercentage, completedTopics: completed };
  }, [topics, quizAttempts, allFlashcards, allQuestions, isLoading]);

  return { progress, completedTopics, isLoading };
}
