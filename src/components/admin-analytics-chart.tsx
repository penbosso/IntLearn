'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { format, subDays, eachDayOfInterval, formatISO } from 'date-fns';
import type { QuizAttempt } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminAnalyticsChart() {
  const firestore = useFirestore();

  const allAttemptsQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'quizAttempts')) : null),
    [firestore]
  );
  const { data: allAttempts, isLoading: areAttemptsLoading } = useCollection<QuizAttempt>(allAttemptsQuery);

  const engagementData = useMemo(() => {
    if (!allAttempts) {
      return [];
    }

    const thirtyDaysAgo = subDays(new Date(), 29);
    const dateRange = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });

    const attemptsByDay: { [key: string]: number } = {};
    dateRange.forEach(day => {
        attemptsByDay[formatISO(day, { representation: 'date' })] = 0;
    });

    allAttempts.forEach(attempt => {
      if (attempt.attemptedDate) {
        const dateStr = formatISO(attempt.attemptedDate.toDate(), { representation: 'date' });
        if (dateStr in attemptsByDay) {
          attemptsByDay[dateStr]++;
        }
      }
    });

    return Object.entries(attemptsByDay).map(([date, count]) => ({
      date: format(new Date(date), 'MMM d'),
      attempts: count,
    }));
  }, [allAttempts]);
  
  if (areAttemptsLoading) {
    return (
        <div className="h-[350px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
     <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
              <Legend />
              <Bar dataKey="attempts" name="Quiz Attempts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
}
