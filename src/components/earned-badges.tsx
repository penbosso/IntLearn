'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { UserBadge } from '@/lib/data';
import { getBadgeDefinitions } from '@/lib/badges/badge-definitions';


export function EarnedBadges() {
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
        return (
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-500" />
                        My Badges
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
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