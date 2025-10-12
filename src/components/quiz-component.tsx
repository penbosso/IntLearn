'use client';

import { useState, useEffect } from 'react';
import type { Question } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, X, Repeat, ArrowRight, Trophy } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useParams, useSearchParams } from 'next/navigation';


type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export default function QuizComponent({ questions }: { questions: Question[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  
  const handleSaveResults = async (finalScore: number) => {
    if (!user || !topicId) return;

    try {
        const percentage = Math.round((finalScore / questions.length) * 100);
        const xpGained = finalScore * 10; // e.g., 10 XP per correct answer

        // Use a transaction to ensure atomicity
        await runTransaction(firestore, async (transaction) => {
            // 1. Save the quiz attempt
            const quizAttemptRef = collection(firestore, `users/${user.uid}/quizAttempts`);
            transaction.set(doc(quizAttemptRef), {
                userId: user.uid,
                quizId: topicId, // Using topicId as quizId for now
                score: percentage,
                attemptedDate: serverTimestamp(),
                correctAnswers: finalScore,
                totalQuestions: questions.length,
            });

            // 2. Update user's XP
            const userRef = doc(firestore, 'users', user.uid);
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists()) {
                const currentXp = userDoc.data().xp || 0;
                transaction.update(userRef, { xp: currentXp + xpGained });
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


  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === currentQuestion.answer;
    if (isCorrect) {
      setScore(score + 1);
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
    }
  };

  const handleNextQuestion = () => {
    const isLastQuestion = currentIndex === questions.length - 1;

    if (isLastQuestion) {
        setShowResults(true);
        // We use the final score here directly
        const finalScore = selectedAnswer === currentQuestion.answer ? score + 1 : score;
        handleSaveResults(finalScore);
    } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setAnswerState('unanswered');
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswerState('unanswered');
    setScore(0);
    setShowResults(false);
  };
  
  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Card className="w-full max-w-2xl text-center p-8">
        <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-muted-foreground mb-6">Here's how you did:</p>
        <div className="text-6xl font-bold mb-2 text-primary">{percentage}%</div>
        <p className="text-muted-foreground mb-6">You answered {score} out of {questions.length} questions correctly.</p>
        <Button onClick={handleRestart}>
          <Repeat className="mr-2 h-4 w-4" />
          Take Quiz Again
        </Button>
      </Card>
    );
  }

  const options = currentQuestion.options?.length > 0 ? currentQuestion.options : (currentQuestion.type === 'True/False' ? ['True', 'False'] : []);


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
        
        <RadioGroup
          value={selectedAnswer || undefined}
          onValueChange={setSelectedAnswer}
          disabled={answerState !== 'unanswered'}
          className="space-y-4"
        >
          {options.map((option, index) => {
             const isSelected = selectedAnswer === option;
             const isCorrect = currentQuestion.answer === option;
             let state: AnswerState = 'unanswered';
             if (answerState !== 'unanswered' && isSelected) {
                state = isCorrect ? 'correct' : 'incorrect';
             } else if (answerState !== 'unanswered' && isCorrect) {
                state = 'correct';
             }

            return (
              <Label
                key={index}
                className={cn(
                  "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                  state === 'unanswered' && "border-border hover:border-primary",
                  state === 'correct' && "border-green-500 bg-green-500/10",
                  state === 'incorrect' && "border-red-500 bg-red-500/10",
                  isSelected && answerState === 'unanswered' && "border-primary"
                )}
              >
                <RadioGroupItem value={option} id={`option-${index}`} className="mr-4" />
                <span>{option}</span>
                {state === 'correct' && <Check className="ml-auto h-5 w-5 text-green-500" />}
                {state === 'incorrect' && <X className="ml-auto h-5 w-5 text-red-500" />}
              </Label>
            );
          })}
        </RadioGroup>

        <div className="mt-8 flex justify-end">
            {answerState === 'unanswered' ? (
                 <Button onClick={handleCheckAnswer} disabled={!selectedAnswer}>Check Answer</Button>
            ) : (
                <Button onClick={handleNextQuestion}>
                    {currentIndex === questions.length -1 ? 'Finish Quiz' : 'Next Question'}
                    {currentIndex < questions.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

    