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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Check, CheckCircle, Edit, Trash2, PlusCircle, UploadCloud, Loader2, XCircle, File as FileIcon, ChevronDown } from 'lucide-react';
import { useCollection, useDoc, useMemoFirebase, useAuth, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, writeBatch, serverTimestamp, deleteDoc, updateDoc, getDoc, setDoc, addDoc } from 'firebase/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';


// Helper to read file as a data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


function AddContentDialog({ courseId, onContentAdded }: { courseId: string, onContentAdded: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: firebaseUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [files, setFiles] = useState<File[] | null>(null);
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
    if (!textContent.trim() && (!files || files.length === 0)) {
      toast({
        variant: 'destructive',
        title: 'No Content Provided',
        description: 'Please either paste text content or upload one or more files.',
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

      const materials: { type: 'text' | 'image' | 'pdf', content: string }[] = [];

      if (textContent.trim()) {
        materials.push({ type: 'text', content: textContent });
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const dataUrl = await readFileAsDataURL(file);
          let type: 'image' | 'pdf' | 'text' = 'text';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type === 'application/pdf') type = 'pdf';
          materials.push({ type, content: dataUrl });
        }
      }

      const result = await generateFlashcardsAndQuestions({
        materials,
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
      setFiles(null);

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
                Upload Materials (PDF, Images, etc.)
              </Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file-dialog"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                    {files && files.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-2">
                        {Array.from(files).map(file => (
                          <div key={file.name} className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 text-xs">
                            <FileIcon className="h-4 w-4" />
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span>{' '}
                          or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, PNG, JPG, TXT, etc.
                        </p>
                      </>
                    )}
                  </div>
                  <Input
                    id="dropzone-file-dialog"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : null)}
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

function AddTopicDialog({ courseId, adminId, onTopicAdded }: { courseId: string; adminId: string; onTopicAdded: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [topicName, setTopicName] = useState('');
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

    setLoading(true);
    try {
      await addDoc(collection(firestore, `courses/${courseId}/topics`), {
        name: topicName,
        description: `New topic: ${topicName}`,
        courseId: courseId,
        adminId: adminId,
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      toast({
        title: 'Topic Created',
        description: `Successfully created topic "${topicName}".`,
      });
      onTopicAdded(); // Callback to refetch topics
      setOpen(false); // Close dialog
      setTopicName(''); // Reset form
    } catch (error: any) {
      console.error('Failed to create topic:', error);
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not create topic.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Topic</DialogTitle>
            <DialogDescription>
              Create a new topic to organize your course content.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-topic-name">New Topic Name</Label>
              <Input
                id="new-topic-name"
                placeholder="e.g., Cellular Respiration"
                required
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Creating...' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function EditContentDialog({ item, topics, originalTopicId, courseId, type, children, onTopicChange }: { item: any, topics: any[], originalTopicId: string, courseId: string, type: 'flashcard' | 'question', children: React.ReactNode, onTopicChange: () => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: firebaseUser } = useUser();
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState(item);
    const [selectedTopicId, setSelectedTopicId] = useState(originalTopicId);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setContent(item);
        setSelectedTopicId(originalTopicId);
    }, [item, originalTopicId]);

    const handleSave = async () => {
        setLoading(true);
        const collectionName = type === 'flashcard' ? 'flashcards' : 'questions';

        try {
             if (!firebaseUser) throw new Error("User not authenticated.");
            // If topic hasn't changed, just update the document
            if (selectedTopicId === originalTopicId) {
                const itemRef = doc(firestore, `courses/${courseId}/topics/${originalTopicId}/${collectionName}`, item.id);
                await updateDoc(itemRef, content);
            } else {
                // Topic changed, so we need to move the document
                const batch = writeBatch(firestore);
                const oldDocRef = doc(firestore, `courses/${courseId}/topics/${originalTopicId}/${collectionName}`, item.id);
                const newDocRef = doc(firestore, `courses/${courseId}/topics/${selectedTopicId}/${collectionName}`, item.id);
                
                const currentDocSnapshot = await getDoc(oldDocRef);
                const currentData = currentDocSnapshot.data();

                const updatedContent = { 
                    ...currentData,
                    ...content, 
                    topicId: selectedTopicId,
                    adminId: currentData?.adminId || firebaseUser.uid 
                };

                batch.set(newDocRef, updatedContent);
                batch.delete(oldDocRef);

                await batch.commit();
            }

            toast({
                title: 'Content Updated',
                description: `The ${type} has been successfully saved.`,
            });
            onTopicChange();
            setOpen(false);
        } catch (error: any) {
             console.error("Failed to save content:", error);
            toast({
                variant: 'destructive',
                title: 'Error Saving',
                description: `Could not save the ${type}. ${error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {type === 'flashcard' ? 'Flashcard' : 'Question'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="edit-topic">Topic</Label>
                        <Select onValueChange={setSelectedTopicId} defaultValue={selectedTopicId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                                {topics.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {type === 'flashcard' ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="edit-front">Front</Label>
                                <Textarea id="edit-front" value={content.front} onChange={(e) => setContent({ ...content, front: e.target.value })} className="min-h-24" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-back">Back</Label>
                                <Textarea id="edit-back" value={content.back} onChange={(e) => setContent({ ...content, back: e.target.value })} className="min-h-24" />
                            </div>
                        </>
                    ) : (
                        <>
                             <div className="space-y-2">
                                <Label htmlFor="edit-text">Question Text</Label>
                                <Textarea id="edit-text" value={content.text} onChange={(e) => setContent({ ...content, text: e.target.value })} className="min-h-24" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-answer">Answer</Label>
                                <Input id="edit-answer" value={content.answer} onChange={(e) => setContent({ ...content, answer: e.target.value })} />
                            </div>
                            {content.options && content.options.length > 0 && (
                                <div className="space-y-2">
                                     <Label>Options</Label>
                                     <div className="space-y-2">
                                        {content.options.map((option: string, index: number) => (
                                            <Input key={index} value={option} onChange={(e) => {
                                                const newOptions = [...content.options];
                                                newOptions[index] = e.target.value;
                                                setContent({ ...content, options: newOptions });
                                            }} />
                                        ))}
                                     </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminCourseReviewPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedFlashcards, setSelectedFlashcards] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [bulkActionTopic, setBulkActionTopic] = useState('');
  const [isBulkTopicDialogOpen, setIsBulkTopicDialogOpen] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);


  // Memoize Firestore references
  const courseRef = useMemoFirebase(() => firestore && courseId ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
  // Fetch all topics for the course, with a dependency on `refreshKey` to allow refetching
  const topicsQuery = useMemoFirebase(() => firestore && courseId ? query(collection(firestore, `courses/${courseId}/topics`)) : null, [firestore, courseId, refreshKey]);

  // Fetch data using hooks
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);
  const { data: topics, isLoading: areTopicsLoading } = useCollection(topicsQuery);
  
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if(isCourseLoading) {
        setHasTimedOut(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [isCourseLoading]);


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
  
  // Clear selections when topic changes
  useEffect(() => {
    setSelectedFlashcards([]);
    setSelectedQuestions([]);
  }, [topicId])

  const flashcardsRef = useMemoFirebase(() => firestore && courseId && topicId ? collection(firestore, `courses/${courseId}/topics/${topicId}/flashcards`) : null, [firestore, courseId, topicId, refreshKey]);
  const questionsRef = useMemoFirebase(() => firestore && courseId && topicId ? collection(firestore, `courses/${courseId}/topics/${topicId}/questions`) : null, [firestore, courseId, topicId, refreshKey]);

  const { data: flashcards, isLoading: areFlashcardsLoading } = useCollection(flashcardsRef);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection(questionsRef);
  
  const isLoading = isCourseLoading || areTopicsLoading; // Main page loading state
  const isContentLoading = areFlashcardsLoading || areQuestionsLoading; // Content-specific loading

  const handleContentRefresh = () => {
    setRefreshKey(prev => prev + 1); // Increment to trigger refetch
  };

  const handleDelete = async (type: 'flashcard' | 'question', id: string) => {
    if (!topicId) return;
    const collectionPath = type === 'flashcard' ? `courses/${courseId}/topics/${topicId}/flashcards` : `courses/${courseId}/topics/${topicId}/questions`;
    const itemRef = doc(firestore, collectionPath, id);
    try {
        await deleteDoc(itemRef);
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Deleted`, description: `The item has been removed.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
    }
  };

  const handleApprove = async (type: 'flashcard' | 'question', id: string) => {
      if (!topicId) return;
      const collectionPath = type === 'flashcard' ? `courses/${courseId}/topics/${topicId}/flashcards` : `courses/${courseId}/topics/${topicId}/questions`;
      const itemRef = doc(firestore, collectionPath, id);
      try {
          await updateDoc(itemRef, { status: 'approved' });
          toast({ title: 'Content Approved', description: `The ${type} has been marked as approved.` });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Approval Failed', description: error.message });
      }
  };
  
   const handleBulkApprove = async (type: 'flashcard' | 'question') => {
    const selectedIds = type === 'flashcard' ? selectedFlashcards : selectedQuestions;
    if (selectedIds.length === 0 || !topicId) return;

    setIsBulkActionLoading(true);
    const collectionPath = type === 'flashcard' ? 'flashcards' : 'questions';
    const batch = writeBatch(firestore);

    selectedIds.forEach(id => {
      const itemRef = doc(firestore, `courses/${courseId}/topics/${topicId}/${collectionPath}`, id);
      batch.update(itemRef, { status: 'approved' });
    });

    try {
      await batch.commit();
      toast({
        title: 'Bulk Approval Successful',
        description: `${selectedIds.length} items have been approved.`,
      });
      if (type === 'flashcard') setSelectedFlashcards([]);
      else setSelectedQuestions([]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Bulk Approval Failed', description: error.message });
    } finally {
        setIsBulkActionLoading(false);
    }
  };
  
  const handleInitiateBulkTopicChange = (type: 'flashcard' | 'question') => {
    const selectedIds = type === 'flashcard' ? selectedFlashcards : selectedQuestions;
    if (selectedIds.length === 0) return;
    setBulkActionTopic(''); // Reset topic state
    setIsBulkTopicDialogOpen(true); // Open the topic selection dialog
  };

  const handleConfirmBulkTopicChange = async (type: 'flashcard' | 'question') => {
    if (!bulkActionTopic || !topicId) return;

    setIsBulkActionLoading(true);
    const selectedIds = type === 'flashcard' ? selectedFlashcards : selectedQuestions;
    const collectionName = type === 'flashcard' ? 'flashcards' : 'questions';
    const batch = writeBatch(firestore);
    
    let newTopicId = bulkActionTopic;
    const existingTopic = topics?.find(t => t.id === bulkActionTopic);

    try {
        // We must read the documents first to move them
        for (const id of selectedIds) {
            const oldDocRef = doc(firestore, `courses/${courseId}/topics/${topicId}/${collectionName}`, id);
            const newDocRef = doc(firestore, `courses/${courseId}/topics/${newTopicId}/${collectionName}`, id);

            const docSnapshot = await getDoc(oldDocRef);
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                batch.set(newDocRef, { ...data, topicId: newTopicId });
                batch.delete(oldDocRef);
            }
        }
        
        await batch.commit();

        toast({
            title: 'Bulk Topic Change Successful',
            description: `${selectedIds.length} items moved to topic "${existingTopic?.name}".`,
        });
        
        handleContentRefresh();
        if (type === 'flashcard') setSelectedFlashcards([]);
        else setSelectedQuestions([]);
        setIsBulkTopicDialogOpen(false);

    } catch (error: any) {
        console.error('Bulk topic change failed', error);
        toast({ variant: 'destructive', title: 'Bulk Topic Change Failed', description: error.message });
    } finally {
        setIsBulkActionLoading(false);
    }
  };


  const handlePublish = async () => {
    if (!courseRef) return;
    const newStatus = course?.status === 'published' ? 'draft' : 'published';
    try {
        await updateDoc(courseRef, { status: newStatus });
        toast({
            title: `Course ${newStatus === 'published' ? 'Published' : 'Unpublished'}`,
            description: `The course is now ${newStatus}.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message,
        });
    }
  };

  if (!isCourseLoading && !course && hasTimedOut) {
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

  const topicOptions = useMemo(() => topics?.map(t => ({ value: t.id, label: t.name })) || [], [topics]);


  if (isLoading && !hasTimedOut) {
    return <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Loading course content for review...</span>
    </div>
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
            <AddContentDialog courseId={courseId} onContentAdded={handleContentRefresh} />
            <Button onClick={handlePublish}>
                {course?.status === 'published' ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {course?.status === 'published' ? 'Unpublish Course' : 'Publish Course'}
            </Button>
        </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Topic Selection</CardTitle>
          <CardDescription>Choose a topic to review its content, or create a new one.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
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
                <p className="text-muted-foreground">No topics found.</p>
            )}
            {course && <AddTopicDialog courseId={courseId} adminId={course.adminId} onTopicAdded={handleContentRefresh} />}
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
              <div className="flex justify-between items-center">
                 <CardDescription>
                    Review and edit the generated flashcards before publishing.
                </CardDescription>
                {selectedFlashcards.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={isBulkActionLoading}>
                                {isBulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                Actions ({selectedFlashcards.length})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleBulkApprove('flashcard')} disabled={isBulkActionLoading}>
                                {isBulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInitiateBulkTopicChange('flashcard')} disabled={isBulkActionLoading}>
                                Change Topic
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox
                            checked={selectedFlashcards.length > 0 && flashcards?.length ? selectedFlashcards.length === flashcards.length : false}
                            onCheckedChange={(checked) => {
                                if (checked && flashcards) {
                                    setSelectedFlashcards(flashcards.map(fc => fc.id));
                                } else {
                                    setSelectedFlashcards([]);
                                }
                            }}
                        />
                    </TableHead>
                    <TableHead>Front</TableHead>
                    <TableHead>Back</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isContentLoading && topicId ? (
                     <TableRow><TableCell colSpan={5} className="text-center">Loading flashcards...</TableCell></TableRow>
                  ) : flashcards && flashcards.length > 0 ? (
                    flashcards.map((fc) => (
                      <TableRow key={fc.id} data-state={selectedFlashcards.includes(fc.id) ? "selected" : undefined}>
                        <TableCell>
                            <Checkbox
                                checked={selectedFlashcards.includes(fc.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedFlashcards(prev => [...prev, fc.id]);
                                    } else {
                                        setSelectedFlashcards(prev => prev.filter(id => id !== fc.id));
                                    }
                                }}
                            />
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{fc.front}</TableCell>
                        <TableCell className="max-w-xs truncate">{fc.back}</TableCell>
                        <TableCell>
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(fc.status)}`}>
                                {fc.status.replace('-', ' ')}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                            {fc.status !== 'approved' && (
                                <Button variant="ghost" size="sm" onClick={() => handleApprove('flashcard', fc.id)}>
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                            )}
                            <EditContentDialog item={fc} topics={topics || []} originalTopicId={topicId!} courseId={courseId} type="flashcard" onTopicChange={handleContentRefresh}>
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </EditContentDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the flashcard.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete('flashcard', fc.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center">
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
               <div className="flex justify-between items-center">
                <CardDescription>
                    Review and edit the generated questions for quizzes.
                </CardDescription>
                {selectedQuestions.length > 0 && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={isBulkActionLoading}>
                                {isBulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                Actions ({selectedQuestions.length})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleBulkApprove('question')} disabled={isBulkActionLoading}>
                                {isBulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInitiateBulkTopicChange('question')} disabled={isBulkActionLoading}>
                                Change Topic
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                         <Checkbox
                            checked={selectedQuestions.length > 0 && questions?.length ? selectedQuestions.length === questions.length : false}
                            onCheckedChange={(checked) => {
                                if (checked && questions) {
                                    setSelectedQuestions(questions.map(q => q.id));
                                } else {
                                    setSelectedQuestions([]);
                                }
                            }}
                        />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isContentLoading && topicId ? (
                     <TableRow><TableCell colSpan={5} className="text-center">Loading questions...</TableCell></TableRow>
                  ) : questions && questions.length > 0 ? (
                    questions.map((q) => (
                      <TableRow key={q.id} data-state={selectedQuestions.includes(q.id) ? "selected" : undefined}>
                        <TableCell>
                            <Checkbox
                                checked={selectedQuestions.includes(q.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedQuestions(prev => [...prev, q.id]);
                                    } else {
                                        setSelectedQuestions(prev => prev.filter(id => id !== q.id));
                                    }
                                }}
                            />
                        </TableCell>
                        <TableCell className="font-medium max-w-sm truncate">{q.text}</TableCell>
                        <TableCell>{q.type}</TableCell>
                        <TableCell>
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(q.status)}`}>
                                {q.status.replace('-', ' ')}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           {q.status !== 'approved' && (
                                <Button variant="ghost" size="sm" onClick={() => handleApprove('question', q.id)}>
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                            )}
                          <EditContentDialog item={q} topics={topics || []} originalTopicId={topicId!} courseId={courseId} type="question" onTopicChange={handleContentRefresh}>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                          </EditContentDialog>
                          <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the question.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete('question', q.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow><TableCell colSpan={5} className="text-center">
                        {topicId ? 'No questions found for this topic.' : 'Please select a topic to see its questions.'}
                     </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for bulk topic change */}
      <Dialog open={isBulkTopicDialogOpen} onOpenChange={setIsBulkTopicDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Topic for Selected Items</DialogTitle>
                <DialogDescription>Select a new topic for the selected items.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
               <Select onValueChange={setBulkActionTopic} disabled={isBulkActionLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a new topic" />
                    </SelectTrigger>
                    <SelectContent>
                        {topics?.filter(t => t.id !== topicId).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isBulkActionLoading}>Cancel</Button></DialogClose>
                <Button 
                    onClick={() => handleConfirmBulkTopicChange(selectedFlashcards.length > 0 ? 'flashcard' : 'question')}
                    disabled={isBulkActionLoading || !bulkActionTopic}
                >
                    {isBulkActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Move Items
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
