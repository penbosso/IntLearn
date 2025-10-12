'use client';

import QuizComponent from '@/components/quiz-component';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';


export default function QuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const topicId = searchParams.get('topic');
  const firestore = useFirestore();

  const topicRef = useMemoFirebase(() => firestore && topicId ? doc(firestore, `courses/${courseId}/topics`, topicId) : null, [firestore, courseId, topicId]);
  const questionsQuery = useMemoFirebase(() => firestore && topicId ? query(collection(firestore, `courses/${courseId}/topics/${topicId}/questions`), where('status', '==', 'approved')) : null, [firestore, courseId, topicId]);

  const { data: topic, isLoading: isTopicLoading } = useDoc(topicRef);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection(questionsQuery);

  if (!topicId) {
      notFound();
  }

  const isLoading = isTopicLoading || areQuestionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
          <p>Loading quiz...</p>
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
          <h1 className="text-3xl font-bold font-headline">{topic?.name || 'Quiz'}</h1>
          <p className="text-muted-foreground">Test your knowledge on this topic.</p>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center">
        {questions && questions.length > 0 ? (
          <QuizComponent questions={questions} topicName={topic.name} />
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">No Quiz Available</h2>
            <p className="text-muted-foreground">There are no approved questions for this topic yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
