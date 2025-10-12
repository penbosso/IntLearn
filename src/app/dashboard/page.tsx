'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpenCheck, Flame, Zap } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useCourseProgress } from '@/hooks/use-course-progress';


type Course = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
}

export default function DashboardPage() {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const firestore = useFirestore();

  const coursesQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'courses') : null,
    [firestore]
  );
  const { data: courses, isLoading: areCoursesLoading } = useCollection<Course>(coursesQuery);

  const userEnrollmentsQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, `users/${user.id}/enrollments`) : null,
    [firestore, user]
  );
  const { data: enrollments, isLoading: areEnrollmentsLoading } = useCollection(userEnrollmentsQuery);
  
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isUserLoading && firebaseUser) {
      getCurrentUser(firebaseUser).then(setUser);
    }
  }, [firebaseUser, isUserLoading]);
  
  useEffect(() => {
    if (enrollments) {
        setEnrolledCourseIds(enrollments.map(e => e.courseId));
    }
  }, [enrollments]);

  if (isUserLoading || !user || areCoursesLoading || areEnrollmentsLoading) {
    return <div>Loading dashboard...</div>;
  }

  const enrolledCourses = courses?.filter(c => enrolledCourseIds.includes(c.id)) || [];
  const otherCourses = courses?.filter(c => !enrolledCourseIds.includes(c.id)) || [];


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.xp.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+200 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.streak} Days</div>
            <p className="text-xs text-muted-foreground">Keep it going!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 / {enrolledCourses.length}</div>
            <p className="text-xs text-muted-foreground">Let's get started!</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">My Courses</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.length > 0 ? (
            enrolledCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
           ) : (
                <Card className="flex flex-col items-center justify-center text-center p-6 bg-secondary/50 border-dashed">
                    <CardHeader>
                        <CardTitle>No Courses Yet</CardTitle>
                        <CardDescription>Start your learning journey by enrolling in a course below.</CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
      </div>

       <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Discover New Courses</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {otherCourses.map((course) => (
            <CourseCard key={course.id} course={course} enroll />
          ))}
        </div>
      </div>
    </div>
  );
}

type CourseCardProps = {
    course: {
        id: string;
        name: string;
        description: string;
        imageUrl: string;
        imageHint: string;
    };
    enroll?: boolean;
}

function CourseCard({ course, enroll = false }: CourseCardProps) {
    const { user: firebaseUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isEnrolling, setIsEnrolling] = useState(false);
    const { progress, isLoading: isProgressLoading } = useCourseProgress(course.id);


    const handleEnroll = async () => {
        if (!firebaseUser) {
            toast({
                variant: "destructive",
                title: "Not Logged In",
                description: "You must be logged in to enroll in a course.",
            });
            return;
        }

        setIsEnrolling(true);
        try {
            const enrollmentRef = collection(firestore, `users/${firebaseUser.uid}/enrollments`);
            await addDoc(enrollmentRef, {
                userId: firebaseUser.uid,
                courseId: course.id,
                enrollmentDate: serverTimestamp(),
            });
            toast({
                title: "Enrolled Successfully!",
                description: `You have enrolled in "${course.name}".`,
            });
        } catch (error: any) {
            console.error("Enrollment failed:", error);
            toast({
                variant: "destructive",
                title: "Enrollment Failed",
                description: error.message || "Could not enroll in the course.",
            });
        } finally {
            setIsEnrolling(false);
        }
    };


  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col">
      <Link href={`/dashboard/courses/${course.id}`} className="block">
        <Image
          src={course.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
          alt={course.name}
          width={600}
          height={400}
          data-ai-hint={course.imageHint}
          className="h-48 w-full object-cover"
        />
      </Link>
      <CardHeader>
        <CardTitle>{course.name}</CardTitle>
        <CardDescription className="h-10">{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        {enroll ? (
             <Button className="w-full" onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
             </Button>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-bold">{isProgressLoading ? '...' : `${Math.round(progress)}%`}</span>
            </div>
            <Progress value={isProgressLoading ? 0 : progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
