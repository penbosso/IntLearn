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
import { Input } from '@/components/ui/input';
import { BookOpenCheck, Flame, Zap, ArrowRight, Book, Edit, Loader2, Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useEffect, useState, useMemo } from 'react';
import type { User } from '@/lib/auth';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useCourseProgress } from '@/hooks/use-course-progress';
import type { QuizAttempt, Course as CourseType, Topic } from '@/lib/data';

type Course = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  status: 'draft' | 'published';
}

function ContinueLearningCard() {
    const { user } = useUser();
    const firestore = useFirestore();

    const lastAttemptQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, `users/${user.uid}/quizAttempts`),
            orderBy('attemptedDate', 'desc'),
            limit(1)
        ) : null,
        [user, firestore]
    );

    const { data: lastAttemptData, isLoading: isAttemptLoading } = useCollection<QuizAttempt>(lastAttemptQuery);
    const lastAttempt = lastAttemptData?.[0];

    const courseId = lastAttempt?.courseId;
    const topicId = lastAttempt?.quizId; // This was likely the issue, using quizId as topicId

    const courseRef = useMemoFirebase(() => (firestore && courseId) ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
    const topicRef = useMemoFirebase(() => (firestore && courseId && topicId) ? doc(firestore, `courses/${courseId}/topics`, topicId) : null, [firestore, courseId, topicId]);

    const { data: course, isLoading: isCourseLoading } = useDoc<CourseType>(courseRef);
    const { data: topic, isLoading: isTopicLoading } = useDoc<Topic>(topicRef);

    const isLoading = isAttemptLoading || isCourseLoading || isTopicLoading;

    if (isLoading) {
        return (
             <Card className="bg-primary/10 border-primary/50">
                <CardHeader>
                    <CardTitle>Continue Learning</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-24">
                   <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    // Do not render if the data is incomplete
    if (!lastAttempt || !course || !topic) {
        return null;
    }
    
    return (
        <Card className="bg-primary/10 border-primary/50">
            <CardHeader>
                <CardTitle>Continue Learning</CardTitle>
                <CardDescription>You were last studying: <strong>{topic.name}</strong> from <strong>{course.name}</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex gap-4">
                    <Button asChild>
                        <Link href={`/dashboard/courses/${courseId}/flashcards?topic=${topicId}`}>
                            <Book className="mr-2 h-4 w-4" />
                            Study Flashcards
                        </Link>
                    </Button>
                     <Button asChild variant="outline">
                        <Link href={`/dashboard/courses/${courseId}/quiz?topic=${topicId}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Retake Quiz
                        </Link>
                    </Button>
               </div>
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();

  const coursesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'courses'), where('status', '==', 'published')) : null,
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

  const filteredCourses = useMemo(() => {
    if (!courses) return { enrolled: [], other: [] };
    const searchFiltered = courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const enrolled = searchFiltered.filter(c => enrolledCourseIds.includes(c.id));
    const other = searchFiltered.filter(c => !enrolledCourseIds.includes(c.id));
    return { enrolled, other };
  }, [courses, searchTerm, enrolledCourseIds]);


  if (isUserLoading || !user || areCoursesLoading || areEnrollmentsLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (user.roles.includes('admin') || user.roles.includes('creator') || user.roles.includes('accountant')) {
    const isAdmin = user.roles.includes('admin');
    const isCreator = user.roles.includes('creator');
    const isAccountant = user.roles.includes('accountant');
    
    return (
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <h1 className="text-4xl font-bold font-headline">Admin & Staff Dashboard</h1>
            <p className="text-lg text-muted-foreground max-w-lg">
                Welcome! You have special permissions. Use the sidebar navigation to access your tools.
            </p>
            <div className="flex gap-4">
                {(isAdmin || isCreator) && (
                  <Button asChild>
                      <Link href="/dashboard/admin">
                          Go to Admin Home
                      </Link>
                  </Button>
                )}
                 {(isAdmin || isAccountant) && (
                  <Button asChild variant="outline">
                      <Link href="/dashboard/accounting">
                          Go to Accounting
                      </Link>
                  </Button>
                )}
            </div>
        </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
        <div className="relative md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Search courses..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      
      {/* <ContinueLearningCard /> */}

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
            <div className="text-2xl font-bold">0 / {enrolledCourseIds.length}</div>
            <p className="text-xs text-muted-foreground">Let's get started!</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">My Courses</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.enrolled.length > 0 ? (
            filteredCourses.enrolled.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
           ) : (
                <Card className="md:col-span-3 flex flex-col items-center justify-center text-center p-6 bg-secondary/50 border-dashed">
                    <CardHeader>
                        <CardTitle>{searchTerm ? 'No Matching Courses' : 'No Courses Yet'}</CardTitle>
                        <CardDescription>
                            {searchTerm ? 'No courses in your library match your search.' : 'Start your learning journey by enrolling in a course below.'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
      </div>

       <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Discover New Courses</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.other.length > 0 ? (
            filteredCourses.other.map((course) => (
              <CourseCard key={course.id} course={course} enroll />
            ))
           ) : (
                <Card className="md:col-span-3 flex flex-col items-center justify-center text-center p-6 bg-secondary/50 border-dashed">
                    <CardHeader>
                        <CardTitle>No New Courses</CardTitle>
                        <CardDescription>
                            {searchTerm ? 'No available courses match your search.' : 'You are enrolled in all available courses.'}
                        </CardDescription>
                    </CardHeader>
                </Card>
           )}
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
    const { progress, isLoading: isProgressLoading } = useCourseProgress(enroll ? null : course.id);


    const handleEnroll = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation when clicking the button
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
      <Link href={`/dashboard/courses/${course.id}`} className="block flex-grow">
        <div className="relative">
            <Image
            src={course.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
            alt={course.name}
            width={600}
            height={400}
            data-ai-hint={course.imageHint}
            className="h-48 w-full object-cover"
            />
        </div>
        <div className="flex flex-col flex-grow p-6">
            <CardTitle>{course.name}</CardTitle>
            <CardDescription className="h-10 mt-2 flex-grow">{course.description}</CardDescription>
        </div>
      </Link>
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
