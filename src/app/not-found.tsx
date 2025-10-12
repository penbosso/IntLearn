'use client';

import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <div className="max-w-md">
        <Logo className="justify-center mb-4" />
        <h1 className="text-8xl font-bold text-primary font-headline animate-pulse">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          Page Not Found
        </h2>
        <p className="mt-2 text-muted-foreground">
          Oops! The page you are looking for does not exist. It might have
          been moved or deleted.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
