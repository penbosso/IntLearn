'use client';

import { useMemo, useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Edit, Trash2, PlusCircle, UploadCloud, Loader2 } from 'lucide-react';
import { useCollection, useDoc, useMemoFirebase, useAuth, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, writeBatch, serverTimestamp } from 'firebase/firestore';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { generateFlashcardsAndQuestions } from '@/ai/flows/generate-flashcards-and-questions';
import { getCurrentUser } from '@/lib/auth';


// Helper to read file as text or data URL
const readFileAs = (file: File, as: 'text' | 'dataURL'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    if (as === 'text') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
};


function AddContentDialog({ courseId, onContentAdded }: { courseId: string, onContentAdded: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: firebaseUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!topicName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Topic Name Required',
        description: 'Please provide a name for the new topic.',
      });
      return;
    }
    if (!textContent.trim() && !file) {
      toast({
        variant: 'destructive',
        title: 'No Content Provided',
        description: 'Please either paste text content or upload a file.',
      });
      return;
    }

    setLoading(true);
    toast({
      title: 'Generating New Content...',
      description: 'The AI is analyzing your materials. This might take a moment.',
    });

    try {
      if (!firebaseUser) {
        throw new Error('You must be logged in to add content.');
      }
      
      const appUser = await getCurrentUser(firebaseUser);
      if (appUser.role !== 'admin') {
        throw new Error('You must be an administrator to add content.');
      }


      let courseMaterial = textContent;
      let materialType: 'text' | 'image' | 'pdf' = 'text';

      if (file) {
        if (file.type.startsWith('image/')) {
          courseMaterial = await readFileAs(file, 'dataURL');
          materialType = 'image';
        } else if (file.type === 'application/pdf') {
          courseMaterial = await readFileAs(file, 'dataURL');
          materialType = 'pdf';
        } else {
          courseMaterial = await readFileAs(file, 'text');
          materialType = 'text';
        }
      }

      const result = await generateFlashcardsAndQuestions({
        courseMaterial: courseMaterial,
        materialType: materialType,
      });

      const batch = writeBatch(firestore);

      const topicRef = doc(collection(firestore, `courses/${courseId}/topics`));
      batch.set(topicRef, {
        name: topicName,
        description: `Content for ${topicName}`,
        courseId: courseId,
        adminId: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });

      result.flashcards.forEach((flashcard) => {
        const flashcardRef = doc(collection(firestore,`courses/${courseId}/topics/${topicRef.id}/flashcards`));
        batch.set(flashcardRef, {
          ...flashcard,
          topicId: topicRef.id,
          status: 'needs-review',
          adminId: firebaseUser.uid,
        });
      });

      result.questions.forEach((question) => {
        const questionRef = doc(collection(firestore, `courses/${courseId}/topics/${topicRef.id}/questions`));
        batch.set(questionRef, {
          text: question.question,
          answer: question.answer,
          type: question.type,
          options: question.options ?? [],
          topicId: topicRef.id,
          status: 'needs-review',
          adminId: firebaseUser.uid,
        });
      });

      await batch.commit();

      setLoading(false);
      toast({
        title: 'Content Added!',
        description: `New topic "${topicName}" is ready for review.`,
      });
      onContentAdded(); // Callback to refetch topics
      setOpen(false); // Close dialog on success
      // Reset form state
      setTopicName('');
      setTextContent('');
      setFile(null);

    } catch (error: any) {
      console.error('Failed to generate content:', error);
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not generate content.',
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Content to Course</DialogTitle>
            <DialogDescription>
              Create a new topic and provide materials. The AI will generate flashcards and questions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic-name">New Topic Name</Label>
              <Input
                id="topic-name"
                placeholder="e.g., Photosynthesis"
                required
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="materials">
                Upload Materials (PDF, Image, etc.)
              </Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file-dialog"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                    {file ? (
                      <p className="font-semibold text-sm text-foreground">
                        {file.name}
                      </p>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span>{' '}
                          or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, PNG, JPG or TXT
                        </p>
                      </>
                    )}
                  </div>
                  <Input
                    id="dropzone-file-dialog"
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-content">Or Paste Text Content</Label>
              <Textarea
                id="text-content"
                placeholder="Paste your lecture notes or articles here..."
                className="min-h-[120px]"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Generating...' : 'Generate & Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function AdminCourseReviewPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const firestore = useFirestore();
  const [refreshTopics, setRefreshTopics] = useState(0);


  // Memoize Firestore references
  const courseRef = useMemoFirebase(() => firestore && courseId ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
  // Fetch all topics for the course, with a dependency on `refreshTopics` to allow refetching
  const topicsQuery = useMemoFirebase(() => firestore && courseId ? query(collection(firestore, `courses/${courseId}/topics`)) : null, [firestore, courseId, refreshTopics]);

  // Fetch data using hooks
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);
  const { data: topics, isLoading: areTopicsLoading } = useCollection(topicsQuery);

  const [topicId, setTopicId] = useState<string | null>(null);

  // Set the initial topic when topics are loaded or when new topics are added
  useEffect(() => {
    if (!areTopicsLoading && topics && topics.length > 0) {
      // If no topic is selected, or the selected one is no longer valid, select the first one.
      if (!topicId || !topics.some(t => t.id === topicId)) {
        setTopicId(topics[0].id);
      }
    } else if (!areTopicsLoading && topics && topics.length === 0) {
        setTopicId(null);
    }
  }, [topics, areTopicsLoading, topicId]);

  const flashcardsRef = useMemoFirebase(() => firestore && courseId && topicId ? collection(firestore, `courses/${courseId}/topics/${topicId}/flashcards`) : null, [firestore, courseId, topicId]);
  const questionsRef = useMemoFirebase(() => firestore && courseId && topicId ? collection(firestore, `courses/${courseId}/topics/${topicId}/questions`) : null, [firestore, courseId, topicId]);

  const { data: flashcards, isLoading: areFlashcardsLoading } = useCollection(flashcardsRef);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection(questionsRef);
  
  const isLoading = isCourseLoading || areTopicsLoading; // Main page loading state
  const isContentLoading = areFlashcardsLoading || areQuestionsLoading; // Content-specific loading

  const handleContentAdded = () => {
    setRefreshTopics(prev => prev + 1); // Increment to trigger refetch
  };

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
        <div className="flex gap-2">
            <AddContentDialog courseId={courseId} onContentAdded={handleContentAdded} />
            <Button>
                <CheckCircle className="mr-2 h-4 w-4" />
                Publish Course
            </Button>
        </div>
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
                <p className="text-muted-foreground">No topics found. Click "Add Content" to get started.</p>
            )}
        </CardContent>
      </Card>

      <Tabs defaultValue="flashcards">
        <TabsList>
          <TabsTrigger value="flashcards" disabled={!topicId}>Flashcards</TabsTrigger>
          <TabsTrigger value="questions" disabled={!topicId}>Quiz Questions</TabsTrigger>
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
                  {isContentLoading && topicId ? (
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
                    <TableRow><TableCell colSpan={4} className="text-center">
                        {topicId ? 'No flashcards found for this topic.' : 'Please select a topic to see its flashcards.'}
                    </TableCell></TableRow>
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
                   {isContentLoading && topicId ? (
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
                     <TableRow><TableCell colSpan={4} className="text-center">
                        {topicId ? 'No questions found for this topic.' : 'Please select a topic to see its questions.'}
                     </TableCell></TableRow>
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
