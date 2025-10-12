'use client';

import { useMemo, useState } from 'react';
import FlashcardDeck from '@/components/flashcard-deck';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useDoc, useCollection, useMemoFirebase, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Flashcard, FlashcardMastery } from '@/lib/data';


export default function FlashcardsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const topicId = searchParams.get('topic');
  const firestore = useFirestore();
  const { user } = useUser();
  const [hideMastered, setHideMastered] = useState(false);


  const topicRef = useMemoFirebase(() => firestore && topicId ? doc(firestore, `courses/${courseId}/topics`, topicId) : null, [firestore, courseId, topicId]);
  const flashcardsQuery = useMemoFirebase(() => firestore && topicId ? query(collection(firestore, `courses/${courseId}/topics/${topicId}/flashcards`), where('status', '==', 'approved')) : null, [firestore, courseId, topicId]);
  const masteryQuery = useMemoFirebase(() => firestore && user && topicId ? query(collection(firestore, `users/${user.uid}/flashcardMastery`), where('topicId', '==', topicId), where('status', '==', 'mastered')) : null, [firestore, user, topicId]);

  const { data: topic, isLoading: isTopicLoading } = useDoc(topicRef);
  const { data: flashcards, isLoading: areFlashcardsLoading } = useCollection<Flashcard>(flashcardsQuery);
  const { data: masteredCards, isLoading: areMasteryCardsLoading } = useCollection<FlashcardMastery>(masteryQuery);

  if (!topicId) {
      notFound();
  }
  
  const filteredFlashcards = useMemo(() => {
    if (!flashcards) return [];
    if (!hideMastered || !masteredCards) return flashcards;
    const masteredIds = new Set(masteredCards.map(c => c.flashcardId));
    return flashcards.filter(fc => !masteredIds.has(fc.id));
  }, [flashcards, masteredCards, hideMastered]);


  const isLoading = isTopicLoading || areFlashcardsLoading || areMasteryCardsLoading;

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
          <p className="text-muted-foreground">Review the key concepts for this topic.</p>
        </div>
         <div className="flex items-center space-x-2">
            <Switch id="hide-mastered" checked={hideMastered} onCheckedChange={setHideMastered} />
            <Label htmlFor="hide-mastered">Hide Mastered Cards</Label>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center">
        {filteredFlashcards && filteredFlashcards.length > 0 ? (
          <FlashcardDeck flashcards={filteredFlashcards} />
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {hideMastered && flashcards && flashcards.length > 0 ? 'Everything Mastered!' : 'No Flashcards Yet'}
            </h2>
            <p className="text-muted-foreground">
              {hideMastered && flashcards && flashcards.length > 0 ? 'You\'ve mastered all cards for this topic. Toggle the switch to review them all.' : 'There are no approved flashcards available for this topic.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
