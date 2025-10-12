'use client';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Book, Edit, Loader2 } from 'lucide-react';
import { useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useCourseProgress } from '@/hooks/use-course-progress';
import { useEffect, useState } from 'react';


export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const firestore = useFirestore();

  const courseRef = useMemoFirebase(() => firestore && courseId ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
  const topicsRef = useMemoFirebase(() => firestore && courseId ? collection(firestore, `courses/${courseId}/topics`) : null, [firestore, courseId]);

  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);
  const { data: topics, isLoading: areTopicsLoading } = useCollection(topicsRef);
  const { progress, completedTopics, isLoading: isProgressLoading } = useCourseProgress(courseId);
  
  const isLoading = isCourseLoading || areTopicsLoading || isProgressLoading;
  
  const totalTopics = topics?.length || 0;
  const completedTopicsCount = completedTopics.length;
  const courseCompletion = progress;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Loading course details...</span>
    </div>
  }

  // After loading, if course is still null, then it's a 404.
  // This prevents race conditions where isLoading is false but data isn't populated yet.
  if (!course) {
    notFound();
    return null; // Keep TypeScript happy, notFound() should throw.
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
           <Card className="overflow-hidden">
                <Image
                    src={course.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
                    alt={course.name}
                    width={600}
                    height={400}
                    data-ai-hint={course.imageHint}
                    className="object-cover w-full h-auto"
                />
                 <CardHeader>
                    <CardTitle className="text-2xl">{course.name}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Course Completion</span>
                            <span className="text-sm font-bold">{Math.round(courseCompletion)}%</span>
                        </div>
                        <Progress value={courseCompletion} />
                        <p className="text-xs text-muted-foreground text-center pt-1">
                            {completedTopicsCount} of {totalTopics} topics completed
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:w-2/3">
           <h2 className="text-2xl font-bold mb-4 font-headline">Topics</h2>
           <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {topics && topics.map((topic, index) => (
                  <AccordionItem value={`item-${index}`} key={topic.id}>
                    <AccordionTrigger className="px-6 hover:no-underline">
                        <div className='flex items-center gap-3'>
                            <div className={`w-3 h-3 rounded-full ${completedTopics.includes(topic.id) ? 'bg-green-500' : 'bg-muted'}`}></div>
                            <span>{topic.name}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 bg-secondary/50">
                       <p className="text-muted-foreground mb-4 pt-4">Ready to master this topic? Choose your study method.</p>
                       <div className="flex gap-4">
                            <Button asChild>
                                <Link href={`/dashboard/courses/${courseId}/flashcards?topic=${topic.id}`}>
                                    <Book className="mr-2 h-4 w-4" />
                                    Study Flashcards
                                </Link>
                            </Button>
                             <Button asChild variant="outline">
                                <Link href={`/dashboard/courses/${courseId}/quiz?topic=${topic.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Start Quiz
                                </Link>
                            </Button>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
               {topics?.length === 0 && <p className="p-6 text-muted-foreground">No topics have been added to this course yet.</p>}
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
