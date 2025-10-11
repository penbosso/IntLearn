'use client';

import { getFlashcardsByTopicId, getTopicById } from '@/lib/data';
import FlashcardDeck from '@/components/flashcard-deck';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Flashcard, Topic } from '@/lib/data';

export default function FlashcardsPage({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: { topic: string };
}) {
  const { courseId } = params;
  const { topic: topicId } = searchParams;
  const [topic, setTopic] = useState<Topic | undefined | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topicId) {
      notFound();
      return;
    }

    async function fetchData() {
      try {
        const [topicData, flashcardsData] = await Promise.all([
          getTopicById(topicId),
          getFlashcardsByTopicId(topicId)
        ]);
        setTopic(topicData);
        setFlashcards(flashcardsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [topicId]);

  if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
            <p>Loading flashcards...</p>
        </div>
      )
  }

  if (!topic) {
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
          <h1 className="text-3xl font-bold font-headline">{topic?.title || 'Flashcards'}</h1>
          <p className="text-muted-foreground">Review the key concepts for this topic.</p>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center">
        {flashcards.length > 0 ? (
          <FlashcardDeck flashcards={flashcards} />
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">No Flashcards Yet</h2>
            <p className="text-muted-foreground">There are no flashcards available for this topic.</p>
          </div>
        )}
      </div>
    </div>
  );
}
