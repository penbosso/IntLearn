
'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface FlagContentDialogProps {
  children: React.ReactNode;
  contentType: 'flashcard' | 'question';
  contentId: string;
  courseId: string;
  topicId: string;
}

export function FlagContentDialog({
  children,
  contentType,
  contentId,
  courseId,
  topicId,
}: FlagContentDialogProps) {
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const handleFlagSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to flag content.',
      });
      return;
    }
    if (!comment.trim()) {
      toast({
        variant: 'destructive',
        title: 'Comment Required',
        description: 'Please provide a reason for flagging this content.',
      });
      return;
    }

    setLoading(true);

    const collectionName = contentType === 'flashcard' ? 'flashcards' : 'questions';
    const contentRef = doc(firestore, `courses/${courseId}/topics/${topicId}/${collectionName}`, contentId);

    try {
      await updateDoc(contentRef, {
        status: 'flagged',
        flaggedComment: comment,
        flaggedBy: user.uid,
        flaggedAt: serverTimestamp(),
      });

      toast({
        title: 'Content Flagged',
        description: 'Thank you for your feedback. An admin will review this content shortly.',
      });
      setOpen(false);
      setComment('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Flagging Failed',
        description: error.message || 'There was an issue submitting your feedback.',
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
          <DialogTitle>Flag Content for Review</DialogTitle>
          <DialogDescription>
            Please describe the issue with this content. Your feedback helps us improve the quality of our learning materials.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="flag-comment">Comment</Label>
          <Textarea
            id="flag-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g., The answer seems incorrect because..."
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleFlagSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
