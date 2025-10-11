'use client';

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const accuracyData = [
  { name: 'Cell Structure', accuracy: 85 },
  { name: 'Genetics', accuracy: 92 },
  { name: 'Ancient Egypt', accuracy: 78 },
  { name: 'Roman Empire', accuracy: 65 },
  { name: 'Derivatives', accuracy: 95 },
];

const progressData = [
  { date: 'Apr 1', quizzes: 1, flashcards: 20 },
  { date: 'Apr 5', quizzes: 2, flashcards: 35 },
  { date: 'Apr 10', quizzes: 2, flashcards: 50 },
  { date: 'Apr 15', quizzes: 3, flashcards: 60 },
  { date: 'Apr 20', quizzes: 5, flashcards: 80 },
  { date: 'Apr 25', quizzes: 5, flashcards: 95 },
  { date: 'Apr 30', quizzes: 6, flashcards: 120 },
];

export default function PerformanceCharts() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Accuracy by Topic</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
              <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Study Activity</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="quizzes" name="Quizzes Taken" stroke="hsl(var(--primary))" />
              <Line type="monotone" dataKey="flashcards" name="Flashcards Reviewed" stroke="hsl(var(--accent))" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
