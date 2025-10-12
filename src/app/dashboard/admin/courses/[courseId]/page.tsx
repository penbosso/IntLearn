'use client';

import { useMemo, useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Edit, Trash2, ChevronsUpDown } from 'lucide-react';
import { useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


export default function AdminCourseReviewPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const firestore = useFirestore();

  // Memoize Firestore references
  const courseRef = useMemoFirebase(() => firestore && courseId ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
  // Fetch all topics for the course
  const topicsQuery = useMemoFirebase(() => firestore && courseId ? query(collection(firestore, `courses/${courseId}/topics`)) : null, [firestore, courseId]);

  // Fetch data using hooks
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);
  const { data: topics, isLoading: areTopicsLoading } = useCollection(topicsQuery);

  const [topicId, setTopicId] = useState<string | null>(null);

  // Set the initial topic when topics are loaded
  useEffect(() => {
    if (!topicId && topics && topics.length > 0) {
      setTopicId(topics[0].id);
    }
  }, [topics, topicId]);

  const flashcardsRef = useMemoFirebase(() => firestore && courseId && topicId ? collection(firestore, `courses/${courseId}/topics/${topicId}/flashcards`) : null, [firestore, courseId, topicId]);
  const questionsRef = useMemoFirebase(() => firestore && courseId && topicId ? collection(firestore, `courses/${courseId}/topics/${topicId}/questions`) : null, [firestore, courseId, topicId]);

  const { data: flashcards, isLoading: areFlashcardsLoading } = useCollection(flashcardsRef);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection(questionsRef);
  
  const isLoading = isCourseLoading || areTopicsLoading; // Main page loading state
  const isContentLoading = areFlashcardsLoading || areQuestionsLoading; // Content-specific loading

  if (!isLoading && !course) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'published':
        case 'approved':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'needs-review':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const selectedTopicName = useMemo(() => {
    if (!topics || !topicId) return 'Select a topic...';
    return topics.find(t => t.id === topicId)?.name || 'Select a topic...';
  }, [topics, topicId]);

  if (isLoading) {
    return <div>Loading course content for review...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage: {course?.name}</h1>
          <p className="text-muted-foreground">
            Review and approve the AI-generated content for this course.
          </p>
        </div>
        <Button>
          <CheckCircle className="mr-2 h-4 w-4" />
          Publish Course
        </Button>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Topic Selection</CardTitle>
          <CardDescription>Choose a topic to review its content.</CardDescription>
        </CardHeader>
        <CardContent>
            {areTopicsLoading ? (
                <p>Loading topics...</p>
            ) : topics && topics.length > 0 ? (
                 <Select onValueChange={setTopicId} value={topicId || ''}>
                    <SelectTrigger className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                        {topics.map(topic => (
                            <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <p>No topics found for this course.</p>
            )}
        </CardContent>
      </Card>

      <Tabs defaultValue="flashcards">
        <TabsList>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="questions">Quiz Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="flashcards">
          <Card>
            <CardHeader>
              <CardTitle>Generated Flashcards</CardTitle>
              <CardDescription>
                Review and edit the generated flashcards before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Front</TableHead>
                    <TableHead>Back</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isContentLoading ? (
                     <TableRow><TableCell colSpan={4} className="text-center">Loading flashcards...</TableCell></TableRow>
                  ) : flashcards && flashcards.length > 0 ? (
                    flashcards.map((fc) => (
                      <TableRow key={fc.id}>
                        <TableCell className="font-medium max-w-xs truncate">{fc.front}</TableCell>
                        <TableCell className="max-w-xs truncate">{fc.back}</TableCell>
                        <TableCell>
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(fc.status)}`}>
                                {fc.status.replace('-', ' ')}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center">No flashcards found for this topic.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Generated Quiz Questions</CardTitle>
              <CardDescription>
                Review and edit the generated questions for quizzes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isContentLoading ? (
                     <TableRow><TableCell colSpan={4} className="text-center">Loading questions...</TableCell></TableRow>
                  ) : questions && questions.length > 0 ? (
                    questions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium max-w-sm truncate">{q.text}</TableCell>
                        <TableCell>{q.type}</TableCell>
                        <TableCell>
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(q.status)}`}>
                                {q.status.replace('-', ' ')}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow><TableCell colSpan={4} className="text-center">No questions found for this topic.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
