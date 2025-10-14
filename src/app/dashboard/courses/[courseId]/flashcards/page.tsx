'use client';

import { useMemo, useState, useEffect } from 'react';
import FlashcardDeck from '@/components/flashcard-deck';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useDoc, useCollection, useMemoFirebase, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Flashcard, FlashcardMastery } from '@/lib/data';


export default function FlashcardsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const topicId = searchParams.get('topic');
  const sessionLimit = parseInt(searchParams.get('limit') || '10', 10);
  const firestore = useFirestore();
  const { user } = useUser();
  const [hideMastered, setHideMastered] = useState(false);

  // References
  const topicRef = useMemoFirebase(() => firestore && topicId ? doc(firestore, `courses/${courseId}/topics`, topicId) : null, [firestore, courseId, topicId]);
  const allFlashcardsQuery = useMemoFirebase(() => firestore && topicId ? query(collection(firestore, `courses/${courseId}/topics/${topicId}/flashcards`), where('status', '==', 'approved')) : null, [firestore, courseId, topicId]);
  const allMasteryQuery = useMemoFirebase(() => firestore && user && topicId ? query(collection(firestore, `users/${user.uid}/flashcardMastery`), where('topicId', '==', 'topicId')) : null, [firestore, user, topicId]);

  // Data fetching
  const { data: topic, isLoading: isTopicLoading } = useDoc(topicRef);
  const { data: allFlashcards, isLoading: areAllFlashcardsLoading } = useCollection<Flashcard>(allFlashcardsQuery);
  const { data: allMasteryData, isLoading: areMasteryCardsLoading } = useCollection<FlashcardMastery>(allMasteryQuery);

  const [sessionFlashcards, setSessionFlashcards] = useState<Flashcard[]>([]);

  useEffect(() => {
    if (allFlashcards && allMasteryData) {
      const masteryMap = new Map<string, FlashcardMastery>(allMasteryData.map(m => [m.flashcardId, m]));
      
      let flashcardsToConsider = allFlashcards;
      if (hideMastered) {
          flashcardsToConsider = allFlashcards.filter(fc => masteryMap.get(fc.id)?.status !== 'mastered');
      }

      // Sort by least recently reviewed
      const sorted = [...flashcardsToConsider].sort((a, b) => {
          const masteryA = masteryMap.get(a.id);
          const masteryB = masteryMap.get(b.id);

          const timeA = masteryA?.lastReviewed instanceof Timestamp ? masteryA.lastReviewed.toMillis() : 0;
          const timeB = masteryB?.lastReviewed instanceof Timestamp ? masteryB.lastReviewed.toMillis() : 0;
          
          return timeA - timeB; // Ascending order: oldest first
      });

      setSessionFlashcards(sorted.slice(0, sessionLimit));
    } else if (allFlashcards) {
        // If mastery data is not available yet, just take a random slice
        const shuffled = [...allFlashcards].sort(() => Math.random() - 0.5);
        setSessionFlashcards(shuffled.slice(0, sessionLimit));
    }
  }, [allFlashcards, allMasteryData, sessionLimit, hideMastered]);
  

  if (!topicId) {
      notFound();
  }
  
  const isLoading = isTopicLoading || areAllFlashcardsLoading || areMasteryCardsLoading;

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  if (!isLoading && !topic) {
      notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Button variant="ghost" asChild>
              <Link href={`/dashboard/courses/${courseId}`} className="flex items-center text-sm text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Topics
              </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline">{topic?.name || 'Flashcards'}</h1>
          <p className="text-muted-foreground">Reviewing {sessionFlashcards.length} of {allFlashcards?.length || 0} cards.</p>
        </div>
         <div className="flex items-center space-x-2">
            <Switch id="hide-mastered" checked={hideMastered} onCheckedChange={setHideMastered} />
            <Label htmlFor="hide-mastered">Hide Mastered Cards</Label>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center">
        {sessionFlashcards.length > 0 ? (
          <FlashcardDeck flashcards={sessionFlashcards} />
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {hideMastered && allFlashcards && allFlashcards.length > 0 ? 'Everything Mastered!' : 'No Flashcards Available'}
            </h2>
            <p className="text-muted-foreground">
              {hideMastered && allFlashcards && allFlashcards.length > 0 ? 'You\'ve mastered all cards for this topic. Toggle the switch to review them all.' : 'There are no approved flashcards available for this topic.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
