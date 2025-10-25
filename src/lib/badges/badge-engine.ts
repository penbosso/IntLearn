

import {
  Transaction,
  doc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { getBadgeDefinitions, Badge } from './badge-definitions';

type BadgeContext = {
  userId: string;
  topicId: string;
  score: number;
  existingBadgeIds: string[]; // Pass pre-fetched badge IDs
};

/**
 * Checks for and awards new badges to a user within a Firestore transaction.
 * This function now expects existing badge data to be passed in to avoid reads within the transaction.
 * @param transaction The Firestore transaction to use for database operations.
 * @param context The context of the event that could trigger a badge, including existing badges.
 * @returns An array of newly awarded badges (definitions).
 */
export function awardBadges(
  transaction: Transaction,
  context: BadgeContext
): Badge[] {
  const { userId, score, existingBadgeIds } = context;
  const newBadges: Badge[] = [];

  // Get all possible badge definitions
  const allBadges = getBadgeDefinitions();

  // Check each badge definition
  for (const badge of allBadges) {
    // 1. Check if user already has this badge (using pre-fetched data)
    if (existingBadgeIds.includes(badge.id)) {
      continue; // Skip to next badge
    }

    // 2. Check if user meets the criteria for this new badge
    let criteriaMet = false;
    switch (badge.criteria.type) {
      case 'quiz_score':
        if (score >= badge.criteria.score) {
          criteriaMet = true;
        }
        break;
      // Future badge types could go here...
    }

    // 3. If criteria are met, award the badge within the transaction
    if (criteriaMet) {
      const userBadgesRef = collection(doc(firestore, 'users', userId), 'userBadges');
      const newUserBadgeRef = doc(userBadgesRef);
      
      transaction.set(newUserBadgeRef, {
        userId,
        badgeId: badge.id,
        earnedDate: serverTimestamp(),
      });
      newBadges.push(badge);
    }
  }

  return newBadges;
}

// We need to get the firestore instance from somewhere.
// A global/singleton approach is easiest for this engine.
import { initializeFirebase } from '@/firebase';
const { firestore } = initializeFirebase();
