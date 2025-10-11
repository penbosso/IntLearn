'use client';

import { getQuestionsByTopicId, getTopicById } from '@/lib/data';
import QuizComponent from '@/components/quiz-component';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Question, Topic } from '@/lib/data';


export default function QuizPage({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: { topic: string };
}) {
  const { courseId } = params;
  const { topic: topicId } = searchParams;
  const [topic, setTopic] = useState<Topic | undefined | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topicId) {
      notFound();
      return;
    }

    async function fetchData() {
        try {
            const [topicData, questionsData] = await Promise.all([
                getTopicById(topicId),
                getQuestionsByTopicId(topicId)
            ]);
            setTopic(topicData);
            setQuestions(questionsData);
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
          <p>Loading quiz...</p>
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
          <h1 className="text-3xl font-bold font-headline">{topic?.title || 'Quiz'}</h1>
          <p className="text-muted-foreground">Test your knowledge on this topic.</p>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center">
        {questions.length > 0 ? (
          <QuizComponent questions={questions} />
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">No Quiz Available</h2>
            <p className="text-muted-foreground">There are no questions for this topic yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
