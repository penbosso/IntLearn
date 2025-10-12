'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PerformanceCharts from '@/components/performance-charts';
import { Target, CheckCircle, BarChart, Trophy, Loader2, Award } from 'lucide-react';
import type { User } from '@/lib/auth';
import type { QuizAttempt, UserBadge } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Badge as BadgeDefinition, getBadgeDefinitions } from '@/lib/badges/badge-definitions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function EarnedBadges() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userBadgesQuery = useMemoFirebase(
      () => user ? query(collection(firestore, `users/${user.uid}/userBadges`)) : null,
      [firestore, user]
    );

    const { data: earnedBadges, isLoading } = useCollection<UserBadge>(userBadgesQuery);

    const allBadges = getBadgeDefinitions();

    const badgesWithData = useMemo(() => {
        if (!earnedBadges) return [];
        return earnedBadges.map(ub => {
            const definition = allBadges.find(b => b.id === ub.badgeId);
            return {
                ...ub,
                ...definition,
                earnedDate: ub.earnedDate
            }
        }).sort((a, b) => b.earnedDate.toMillis() - a.earnedDate.toMillis());
    }, [earnedBadges, allBadges]);
    

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-500" />
                    My Badges
                </CardTitle>
                <CardDescription>
                    Your collection of earned achievements.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {badgesWithData && badgesWithData.length > 0 ? (
                    <TooltipProvider>
                        <div className="flex flex-wrap gap-4">
                            {badgesWithData.map(badge => (
                                <Tooltip key={badge.id}>
                                    <TooltipTrigger>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed">
                                                 <span className="text-3xl">{badge.icon}</span>
                                            </div>
                                            <span className="text-xs font-medium text-center max-w-[80px] truncate">{badge.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">{badge.name}</p>
                                        <p>{badge.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Earned on: {new Date(badge.earnedDate.seconds * 1000).toLocaleDateString()}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </TooltipProvider>
                ) : (
                    <p className="text-muted-foreground text-center p-4">You haven't earned any badges yet. Keep learning!</p>
                )}
            </CardContent>
        </Card>
    )
}

export default function PerformancePage() {
    const firestore = useFirestore();
    const { user } = useUser();

    // Fetch leaderboard data
    const leaderboardQuery = useMemoFirebase(
      () =>
        firestore
          ? query(
              collection(firestore, 'users'),
              where('role', '==', 'student'),
              orderBy('xp', 'desc'),
              where('xp', '>', 0) // Only show users with XP
            )
          : null,
      [firestore]
    );
    const { data: leaderboardData, isLoading: isLeaderboardLoading } = useCollection<User>(leaderboardQuery);

    // Fetch user's quiz attempts
    const attemptsQuery = useMemoFirebase(
      () => user ? query(collection(firestore, `users/${user.uid}/quizAttempts`), orderBy('attemptedDate', 'asc')) : null,
      [firestore, user]
    );
    const { data: quizAttempts, isLoading: areAttemptsLoading } = useCollection<QuizAttempt>(attemptsQuery);
    
    // Calculate aggregate stats
    const { overallAccuracy, quizzesTaken } = useMemo(() => {
        if (!quizAttempts || quizAttempts.length === 0) {
            return { overallAccuracy: 0, quizzesTaken: 0 };
        }

        const totalScore = quizAttempts.reduce((acc, attempt) => acc + attempt.score, 0);
        const averageScore = totalScore / quizAttempts.length;

        return {
            overallAccuracy: Math.round(averageScore),
            quizzesTaken: quizAttempts.length
        };
    }, [quizAttempts]);

    const isLoading = isLeaderboardLoading || areAttemptsLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">My Performance</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areAttemptsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> :
              <>
                <div className="text-2xl font-bold">{overallAccuracy}%</div>
                <p className="text-xs text-muted-foreground">Average score across all quizzes</p>
              </>
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flashcards Mastered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">...</div>
            <p className="text-xs text-muted-foreground">Feature coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {areAttemptsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> :
              <>
                <div className="text-2xl font-bold">{quizzesTaken}</div>
                <p className="text-xs text-muted-foreground">Total quizzes completed</p>
              </>
            }
          </CardContent>
        </Card>
      </div>

      <EarnedBadges />

      <Card>
        <CardHeader>
          <CardTitle>Progress Over Time</CardTitle>
          <CardDescription>
            Your quiz scores and performance by topic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceCharts quizAttempts={quizAttempts} isLoading={areAttemptsLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            See how you rank against other students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">XP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLeaderboardLoading && (
                 <TableRow><TableCell colSpan={3} className="text-center">Loading leaderboard...</TableCell></TableRow>
              )}
              {leaderboardData?.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-lg">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">{user.xp.toLocaleString()}</TableCell>
                </TableRow>
              ))}
               {!isLeaderboardLoading && leaderboardData?.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center">No students with XP on the leaderboard yet.</TableCell></TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
