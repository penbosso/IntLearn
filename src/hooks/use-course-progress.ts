'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Topic, QuizAttempt } from '@/lib/data';

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
    () => (firestore && courseId ? collection(firestore, `courses/${courseId}/topics`) : null),
    [firestore, courseId]
  );
  const { data: topics, isLoading: areTopicsLoading } = useCollection<Topic>(topicsQuery);

  // 2. Fetch all quiz attempts for the current user
  const attemptsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/quizAttempts`) : null),
    [firestore, user]
  );
  const { data: quizAttempts, isLoading: areAttemptsLoading } = useCollection<QuizAttempt>(attemptsQuery);
  
  const isLoading = areTopicsLoading || areAttemptsLoading;

  // 3. Memoize the calculation of progress
  const { progress, completedTopics } = useMemo(() => {
    if (isLoading || !topics || !quizAttempts) {
      return { progress: 0, completedTopics: [] };
    }

    if (topics.length === 0) {
      return { progress: 0, completedTopics: [] };
    }

    // Find all topics where the user has at least one passing quiz attempt
    const completed = topics
      .filter(topic =>
        quizAttempts.some(
          attempt =>
            attempt.quizId === topic.id && attempt.score >= PASSING_THRESHOLD
        )
      )
      .map(topic => topic.id);

    const progressPercentage = (completed.length / topics.length) * 100;

    return { progress: progressPercentage, completedTopics: completed };
  }, [topics, quizAttempts, isLoading]);

  return { progress, completedTopics, isLoading };
}
