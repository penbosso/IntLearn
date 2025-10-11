'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, X, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Flashcard } from '@/lib/data';

export default function FlashcardDeck({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [knownCards, setKnownCards] = useState<string[]>([]);

  const currentFlashcard = useMemo(() => flashcards[currentIndex], [flashcards, currentIndex]);
  const progress = useMemo(() => (currentIndex / flashcards.length) * 100, [currentIndex, flashcards.length]);

  const handleNext = (known: boolean) => {
    if (known && !knownCards.includes(currentFlashcard.id)) {
        setKnownCards([...knownCards, currentFlashcard.id]);
    }

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
    setKnownCards([]);
  };

  if (completed) {
    return (
        <Card className="w-full max-w-lg text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Session Complete!</h2>
            <p className="text-muted-foreground mb-6">You reviewed all the flashcards.</p>
            <div className="text-4xl font-bold mb-2">{knownCards.length} / {flashcards.length}</div>
            <p className="text-muted-foreground mb-6">Marked as known</p>
            <Button onClick={handleRestart}>
                <Repeat className="mr-2 h-4 w-4" />
                Study Again
            </Button>
        </Card>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="space-y-4">
        <div 
          className="relative [perspective:1000px] h-[24rem]"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div
            className={cn(
                "w-full h-full absolute transition-transform duration-700 [transform-style:preserve-3d]",
                isFlipped && "[transform:rotateY(180deg)]"
            )}
          >
            {/* Front of card */}
            <Card className="w-full h-full flex items-center justify-center absolute [backface-visibility:hidden]">
              <CardContent className="p-6 text-center">
                <p className="text-2xl font-semibold">{currentFlashcard.front}</p>
              </CardContent>
            </Card>

            {/* Back of card */}
            <Card className="w-full h-full flex items-center justify-center absolute [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <CardContent className="p-6 text-center">
                <p className="text-xl">{currentFlashcard.back}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Click card to flip
        </div>

        <div className="flex justify-around gap-4 pt-4">
          <Button variant="outline" className="w-full h-16 text-red-500 hover:text-red-500 hover:bg-red-500/10 border-red-500/50" onClick={() => handleNext(false)}>
            <X className="mr-2 h-6 w-6" />
            <span className="text-lg">Review Again</span>
          </Button>
          <Button className="w-full h-16 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleNext(true)}>
            <Check className="mr-2 h-6 w-6" />
            <span className="text-lg">I Knew This</span>
          </Button>
        </div>
        
        <div className="pt-4">
          <Progress value={progress} />
          <p className="text-center mt-2 text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
      </div>
    </div>
  );
}
