
import {
  Firestore,
  Transaction,
  doc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getBadgeDefinitions, Badge } from './badge-definitions';

type BadgeContext = {
  userId: string;
  topicId: string;
  score: number;
};

/**
 * Checks for and awards new badges to a user within a Firestore transaction.
 * @param transaction The Firestore transaction to use for database operations.
 * @param context The context of the event that could trigger a badge.
 * @returns A promise that resolves with an array of newly awarded badges.
 */
export async function awardBadges(
  transaction: Transaction,
  context: BadgeContext
): Promise<Badge[]> {
  const { userId, score } = context;
  const newBadges: Badge[] = [];

  // Get all possible badge definitions
  const allBadges = getBadgeDefinitions();

  // Get all badges the user has already earned
  const userBadgesRef = collection(
    transaction.firestore,
    `users/${userId}/userBadges`
  );
  // We need to perform this read *before* the transaction to know what to write.
  // This is a limitation of transactions; you can't query inside them easily.
  // For high-concurrency needs, this might need rethinking, but for this use case, it's okay.
  const userBadgesSnapshot = await getDocs(query(userBadgesRef));
  const earnedBadgeIds = userBadgesSnapshot.docs.map(doc => doc.data().badgeId);

  // Check each badge definition
  for (const badge of allBadges) {
    // 1. Check if user already has this badge
    if (earnedBadgeIds.includes(badge.id)) {
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
      const newUserBadgeRef = doc(userBadgesRef);
      transaction.set(newUserBadgeRef, {
        userId,
        badgeId: badge.id,
        earnedDate: serverTimestamp(), // Use server timestamp for consistency
      });
      newBadges.push(badge);
    }
  }

  return newBadges;
}
