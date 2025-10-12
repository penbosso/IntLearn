
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Users, BarChart, BookOpen, Loader2 } from 'lucide-react';
import type { Course, QuizAttempt } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { useUser } from '@/firebase';
import AdminAnalyticsChart from '@/components/admin-analytics-chart';
import { useEffect, useState } from 'react';
import { getCurrentUser, User } from '@/lib/auth';


export default function AdminDashboardPage() {
  const { user: firebaseUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (firebaseUser) {
      getCurrentUser(firebaseUser).then(setUser);
    }
  }, [firebaseUser]);

  const coursesQuery = useMemoFirebase(
    () => firebaseUser ? query(collection(firestore, 'courses'), where('adminId', '==', firebaseUser.uid)) : null,
    [firebaseUser, firestore]
  );
  
  const { data: courses, isLoading: areCoursesLoading } = useCollection<Course>(coursesQuery);

  const studentsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), where('role', '==', 'student')) : null,
    [firestore]
  );
  const { data: students, isLoading: areStudentsLoading } = useCollection<User>(studentsQuery);


  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const isLoading = areCoursesLoading || areStudentsLoading || !user;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Loading Admin Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold font-headline">Welcome, {user?.name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Manage courses, content, and student progress.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Course
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {areCoursesLoading ? <Loader2 className="h-6 w-6 animate-spin"/> :
                <>
                    <div className="text-2xl font-bold">{courses?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">{courses?.filter(c => c.status === 'draft').length} courses awaiting review</p>
                </>
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areStudentsLoading ? <Loader2 className="h-6 w-6 animate-spin"/> :
                <>
                    <div className="text-2xl font-bold">{students?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Total students on the platform</p>
                </>
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manage Students</CardTitle>
            <CardDescription>
                View student progress and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
              <Button asChild>
                  <Link href="/dashboard/admin/students">
                      <Users className="mr-2 h-4 w-4" />
                      View All Students
                  </Link>
              </Button>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
              <CardTitle>Daily Engagement</CardTitle>
              <CardDescription>Quiz attempts over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
              <AdminAnalyticsChart />
          </CardContent>
       </Card>

      <Card>
        <CardHeader>
          <CardTitle>Managed Courses</CardTitle>
          <CardDescription>
            Review, edit, and manage your published courses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areCoursesLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading courses...</TableCell></TableRow>}
              {!areCoursesLoading && courses && courses.map((course: Course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(course.status || 'Draft')}`}>
                      {course.status || 'Draft'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                       <Link href={`/dashboard/admin/courses/${course.id}`}>Manage</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!areCoursesLoading && (!courses || courses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">You haven't created any courses yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
    