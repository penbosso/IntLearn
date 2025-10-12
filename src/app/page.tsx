'use client';

import Link from 'next/link';
import {
  BrainCircuit,
  Swords,
  TrendingUp,
  Award,
  BookOpen,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { useUser } from '@/firebase';

export default function Home() {
  const { user, isUserLoading } = useUser();

  const features = [
    {
      icon: <UploadCloud className="h-10 w-10" />,
      title: 'AI Content Extraction',
      description:
        'Upload course materials (PDF, text, images) and let our AI generate flashcards and questions automatically.',
    },
    {
      icon: <BookOpen className="h-10 w-10" />,
      title: 'Interactive Flashcard Study',
      description:
        'Study with our intuitive swipeable flashcard interface, organized by topic to streamline your learning.',
    },
    {
      icon: <Swords className="h-10 w-10" />,
      title: 'Adaptive Quizzes',
      description:
        'Take AI-powered quizzes that adapt to your performance, focusing on areas where you need the most improvement.',
    },
    {
      icon: <TrendingUp className="h-10 w-10" />,
      title: 'Performance Tracking',
      description:
        'Monitor your progress with detailed analytics, including accuracy, study time, and topic mastery.',
    },
    {
      icon: <Award className="h-10 w-10" />,
      title: 'Gamified Learning',
      description:
        'Stay motivated with XP points, study streaks, leaderboards, and achievement badges.',
    },
    {
      icon: <BrainCircuit className="h-10 w-10" />,
      title: 'Admin Content Management',
      description:
        'Educators can easily manage courses, review AI-generated content, and track overall student performance.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center ">
          <Logo />
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              {isUserLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : user ? (
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/auth">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/auth">Get Started</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <section className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center">
              <div className="mx-auto max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                  The Smarter Way to Learn
                </h1>
                <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                  IntelliLearn uses AI to transform your study materials into
                  interactive flashcards, adaptive quizzes, and actionable
                  insights. Study smarter, not harder.
                </p>
              </div>
              <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/auth">Start Learning Now</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">Explore Features</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-20 md:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                A Powerful, Personalized Learning Toolkit
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                Everything you need to master your subjects and track your
                progress.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <CardHeader className="flex flex-row items-center gap-4 pb-4">
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center">
              <div className="mx-auto max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                  Ready to Revolutionize Your Studying?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Join thousands of students and educators embracing the future
                  of learning.
                </p>
                <div className="mt-8">
                  <Button asChild size="lg">
                    <Link href="/auth">Get Started for Free</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-secondary w-full">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} IntelliLearn. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}