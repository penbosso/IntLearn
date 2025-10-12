'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import type { QuizAttempt } from '@/lib/data';
import { Loader2 } from 'lucide-react';

type PerformanceChartsProps = {
  quizAttempts: QuizAttempt[] | null;
  isLoading: boolean;
};

export default function PerformanceCharts({ quizAttempts, isLoading }: PerformanceChartsProps) {

  const { scoreOverTime, accuracyByTopic } = useMemo(() => {
    if (!quizAttempts) {
      return { scoreOverTime: [], accuracyByTopic: [] };
    }

    // Format data for score over time chart
    const scoreData = quizAttempts.map((attempt, index) => ({
      name: `Quiz ${index + 1}`,
      score: attempt.score,
      date: attempt.attemptedDate ? format(attempt.attemptedDate.toDate(), 'MMM d') : '',
    }));
    
    // Calculate average accuracy by topic
    const topicScores: { [key: string]: { total: number, count: number } } = {};
    quizAttempts.forEach(attempt => {
        if (attempt.topicName) {
            if (!topicScores[attempt.topicName]) {
                topicScores[attempt.topicName] = { total: 0, count: 0 };
            }
            topicScores[attempt.topicName].total += attempt.score;
            topicScores[attempt.topicName].count += 1;
        }
    });

    const topicData = Object.keys(topicScores).map(topicName => ({
        name: topicName,
        accuracy: Math.round(topicScores[topicName].total / topicScores[topicName].count),
    }));

    return { scoreOverTime: scoreData, accuracyByTopic: topicData };
  }, [quizAttempts]);
  
  if (isLoading) {
    return (
        <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!quizAttempts || quizAttempts.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No quiz data available yet. Take a quiz to see your performance!</p>
        </div>
      );
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Quiz Scores Over Time</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="score" name="Quiz Score" stroke="hsl(var(--primary))" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
       <div>
        <h3 className="text-lg font-semibold mb-2">Average Accuracy by Topic</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accuracyByTopic}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value.substring(0, 10) + (value.length > 10 ? '...' : '')} />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
              <Bar dataKey="accuracy" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
