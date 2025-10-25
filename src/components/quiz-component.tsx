
'use client';

import { useState, useEffect } from 'react';
import type { Question } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, X, Repeat, Trophy, SkipForward, Loader2, Flag } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, runTransaction, doc, Timestamp, getDocs, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useParams, useSearchParams } from 'next/navigation';
import { differenceInCalendarDays } from 'date-fns';
import { awardBadges } from '@/lib/badges/badge-engine';
import { evaluateAnswer } from '@/ai/flows/evaluate-answer-flow';
import { FlagContentDialog } from '@/components/flag-content-dialog';
import type { Badge, UserBadge } from '@/lib/data';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export default function QuizComponent({ questions: initialQuestions, topicName }: { questions: Question[], topicName: string }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [shortAnswerText, setShortAnswerText] = useState('');
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const params = useParams();
  const courseId = params.courseId as string;
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');

  // Reset state when initial questions change
  useEffect(() => {
    handleRestart();
  }, [initialQuestions]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  
  const handleSaveResults = async (finalScore: number) => {
    if (!user || !topicId || !courseId) return;

    try {
        const percentage = Math.round((finalScore / questions.length) * 100);
        const xpGained = Math.round(finalScore * 10);

        // Perform the read for existing badges *before* the transaction starts.
        const userBadgesRef = collection(firestore, `users/${user.uid}/userBadges`);
        const existingBadgesSnapshot = await getDocs(query(userBadgesRef));
        const existingBadgeIds = existingBadgesSnapshot.docs.map(doc => doc.data().badgeId);

        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', user.uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }

            // 1. Save the quiz attempt
            const quizAttemptRef = doc(collection(firestore, `users/${user.uid}/quizAttempts`));
            const attemptData = {
                userId: user.uid,
                courseId: courseId,
                quizId: topicId,
                topicName: topicName,
                score: percentage,
                attemptedDate: Timestamp.now(),
                correctAnswers: finalScore,
                totalQuestions: questions.length,
            };
            transaction.set(quizAttemptRef, attemptData);

            // 2. Update user's XP and Streak
            const currentXp = userDoc.data().xp || 0;
            const currentStreak = userDoc.data().streak || 0;
            const lastActivityDate = userDoc.data().lastActivityDate as Timestamp | undefined;
            
            let newStreak = currentStreak;
            const today = new Date();

            if (lastActivityDate) {
                const lastDate = lastActivityDate.toDate();
                const daysDifference = differenceInCalendarDays(today, lastDate);

                if (daysDifference === 1) {
                    newStreak = currentStreak + 1;
                } else if (daysDifference > 1) {
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            transaction.update(userRef, { 
                xp: currentXp + xpGained,
                streak: newStreak,
                lastActivityDate: today,
            });

            // 3. Award Badges (pass transaction and pre-fetched data)
            const newBadges = awardBadges(transaction, {
              userId: user.uid,
              topicId,
              score: percentage,
              existingBadgeIds: existingBadgeIds,
            });

            setTimeout(() => {
              newBadges.forEach((badge, index) => {
                setTimeout(() => {
                  toast({
                    title: "Badge Unlocked!",
                    description: `You've earned the "${badge.name}" badge!`,
                  });
                }, (index + 1) * 600);
              });
            }, 1000);

            if (newStreak > currentStreak && newStreak > 0) {
                 setTimeout(() => {
                    toast({
                        title: "Daily Streak Continued!",
                        description: `You're on a ${newStreak}-day streak!`,
                    });
                }, 1500)
            }
        });

        toast({
            title: `Quiz Complete! +${xpGained} XP`,
            description: `You scored ${percentage}%. Your progress has been saved.`,
        });
    } catch (error: any) {
        console.error("Failed to save quiz results:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Results",
            description: "There was a problem saving your quiz progress.",
        });
    }
  };


  const handleCheckAnswer = async () => {
    const answerToCheck = currentQuestion.type === 'Short Answer' ? shortAnswerText : selectedAnswer;
    if (!answerToCheck) return;

    let isCorrect = false;
    let partialScore = 0;

    if (currentQuestion.type === 'Short Answer') {
        setIsEvaluating(true);
        try {
            const result = await evaluateAnswer({
                question: currentQuestion.text,
                correctAnswer: currentQuestion.answer,
                studentAnswer: answerToCheck,
            });
            partialScore = result.correctness;
            isCorrect = result.correctness >= 0.8; // Consider >= 80% as correct for UI feedback
            toast({
                title: isCorrect ? 'Correct!' : 'Partially Correct',
                description: `${result.feedback} (Score: ${Math.round(result.correctness * 100)}%)`,
            });
        } catch (error) {
            console.error("AI evaluation failed, falling back to exact match", error);
            // Fallback to simple check on AI error
            isCorrect = answerToCheck.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
            partialScore = isCorrect ? 1 : 0;
        } finally {
            setIsEvaluating(false);
        }
    } else {
        isCorrect = answerToCheck.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
        partialScore = isCorrect ? 1 : 0;
    }


    if (isCorrect) {
      setScore(score + partialScore);
      setAnswerState('correct');
    } else {
      setScore(score + partialScore);
      setAnswerState('incorrect');
    }
  };

  const handleNextQuestion = () => {
    const isLastQuestion = currentIndex === questions.length - 1;

    if (isLastQuestion) {
        setShowResults(true);
        handleSaveResults(score);
    } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setAnswerState('unanswered');
        setShortAnswerText('');
    }
  };

  const handleSkip = () => {
    if(questions.length <= 1) return; // Don't skip if only one question left
    const questionToSkip = questions[currentIndex];
    // Create a new array with the skipped question at the end
    const newQuestions = [...questions.slice(0, currentIndex), ...questions.slice(currentIndex + 1), questionToSkip];
    setQuestions(newQuestions);
    // Reset state for the new current question
    setSelectedAnswer(null);
    setAnswerState('unanswered');
    setShortAnswerText('');
  }

  const handleRestart = () => {
    setQuestions([...initialQuestions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswerState('unanswered');
    setScore(0);
    setShowResults(false);
    setShortAnswerText('');
  };
  
  useEffect(() => {
    if (answerState !== 'unanswered') {
      const timer = setTimeout(() => {
        handleNextQuestion();
      }, 1500); // Wait 1.5 seconds before moving to the next question
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerState]);

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Card className="w-full max-w-2xl text-center p-8">
        <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-muted-foreground mb-6">Here's how you did:</p>
        <div className="text-6xl font-bold mb-2 text-primary">{percentage}%</div>
        <p className="text-muted-foreground mb-6">You answered {score.toFixed(1)} out of {questions.length} questions correctly.</p>
        <Button onClick={handleRestart}>
          <Repeat className="mr-2 h-4 w-4" />
          Take Quiz Again
        </Button>
      </Card>
    );
  }

  if (!currentQuestion) {
      return (
          <Card className="w-full max-w-2xl text-center p-8">
              <h2 className="text-2xl font-bold">Loading...</h2>
          </Card>
      )
  }

  const options = currentQuestion.options?.length > 0 ? currentQuestion.options : (currentQuestion.type === 'True/False' ? ['True', 'False'] : []);

  const canSubmit = selectedAnswer !== null || (currentQuestion.type === 'Short Answer' && shortAnswerText.trim() !== '');

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <CardTitle>Question {currentIndex + 1}</CardTitle>
            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} />
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold mb-6 min-h-[3em]">{currentQuestion.text}</p>
        
        {currentQuestion.type === 'Short Answer' ? (
          <Textarea 
            value={shortAnswerText}
            onChange={(e) => setShortAnswerText(e.target.value)}
            placeholder="Type your answer here..."
            disabled={answerState !== 'unanswered' || isEvaluating}
            className="min-h-24"
          />
        ) : (
          <RadioGroup
            value={selectedAnswer || undefined}
            onValueChange={(value) => {
              if (answerState === 'unanswered') {
                setSelectedAnswer(value);
              }
            }}
            disabled={answerState !== 'unanswered'}
            className="space-y-4"
          >
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = currentQuestion.answer === option;
              let itemState: 'unanswered' | 'correct' | 'incorrect' | 'reveal' = 'unanswered';
              
              if(answerState !== 'unanswered') {
                if(isCorrect) itemState = 'correct';
                else if (isSelected && !isCorrect) itemState = 'incorrect';
              }

              return (
                <Label
                  key={index}
                  className={cn(
                    "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                    answerState === 'unanswered' && "border-border hover:border-primary",
                    isSelected && answerState === 'unanswered' && "border-primary",
                    itemState === 'correct' && "border-green-500 bg-green-500/10",
                    itemState === 'incorrect' && "border-red-500 bg-red-500/10"
                  )}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} className="mr-4" />
                  <span>{option}</span>
                  {itemState === 'correct' && <Check className="ml-auto h-5 w-5 text-green-500" />}
                  {itemState === 'incorrect' && <X className="ml-auto h-5 w-5 text-red-500" />}
                </Label>
              );
            })}
          </RadioGroup>
        )}

        {answerState === 'unanswered' && (
            <div className="flex gap-4 mt-6">
                <Button 
                    onClick={handleCheckAnswer}
                    disabled={!canSubmit || isEvaluating}
                    className="w-full"
                >
                    {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                    {isEvaluating ? 'Evaluating...' : 'Submit'}
                </Button>
                <Button 
                    variant="outline" 
                    onClick={handleSkip} 
                    className="w-full"
                    disabled={isEvaluating}
                >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                </Button>
            </div>
        )}

         <div className="mt-4 text-right">
             <FlagContentDialog
                contentType="question"
                contentId={currentQuestion.id}
                courseId={courseId}
                topicId={topicId || ''}
             >
                <Button variant="ghost" size="sm" disabled={answerState !== 'unanswered'}>
                    <Flag className="mr-2 h-4 w-4" /> Flag Question
                </Button>
             </FlagContentDialog>
        </div>

      </CardContent>
    </Card>
  );
}
