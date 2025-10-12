'use client';

import FlashcardDeck from '@/components/flashcard-deck';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';

export default function FlashcardsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const topicId = searchParams.get('topic');
  const firestore = useFirestore();

  const topicRef = useMemoFirebase(() => firestore && topicId ? doc(firestore, `courses/${courseId}/topics`, topicId) : null, [firestore, courseId, topicId]);
  const flashcardsRef = useMemoFirebase(() => firestore && topicId ? query(collection(firestore, `courses/${courseId}/topics/${topicId}/flashcards`), where('status', '==', 'approved')) : null, [firestore, courseId, topicId]);

  const { data: topic, isLoading: isTopicLoading } = useDoc(topicRef);
  const { data: flashcards, isLoading: areFlashcardsLoading } = useCollection(flashcardsRef);

  if (!topicId) {
      notFound();
  }

  const isLoading = isTopicLoading || areFlashcardsLoading;

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <p>Loading flashcards...</p>
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
      </div>
      <div className="flex-grow flex items-center justify-center">
        {flashcards && flashcards.length > 0 ? (
          <FlashcardDeck flashcards={flashcards} />
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">No Flashcards Yet</h2>
            <p className="text-muted-foreground">There are no approved flashcards available for this topic.</p>
          </div>
        )}
      </div>
    </div>
  );
}

    