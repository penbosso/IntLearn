
'use client';

import { useParams, notFound } from 'next/navigation';
import {
  useDoc,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection, query, orderBy, where, updateDoc } from 'firebase/firestore';
import type { User, UserRole } from '@/lib/auth';
import type { QuizAttempt, Course } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { EarnedBadges } from '@/components/earned-badges';
import { Zap, Flame, Loader2, BookOpen, Shield } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useCourseProgress } from '@/hooks/use-course-progress';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

function EnrolledCourseCard({ course }: { course: Course }) {
    const { progress, isLoading } = useCourseProgress(course.id);
    
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
                 <BookOpen className="h-8 w-8 text-muted-foreground" />
                 <div>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                 </div>
            </CardHeader>
            <CardContent className="mt-auto">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-bold">{isLoading ? '...' : `${Math.round(progress)}%`}</span>
                    </div>
                    <Progress value={isLoading ? 0 : progress} className="h-2" />
                </div>
            </CardContent>
        </Card>
    )
}

const ALL_ROLES: UserRole[] = ['student', 'creator', 'admin', 'accountant'];

function RoleManager({ studentId, currentRoles }: { studentId: string; currentRoles: UserRole[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [roles, setRoles] = useState(currentRoles || []);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Update state if the prop changes after initial render
        setRoles(currentRoles || []);
    }, [currentRoles]);


    const handleRoleChange = (role: UserRole, checked: boolean) => {
        let newRoles: UserRole[];
        if (checked) {
            newRoles = [...roles, role];
        } else {
            // Ensure at least one role remains, default to 'student'
            const filteredRoles = roles.filter(r => r !== role);
            newRoles = filteredRoles.length > 0 ? filteredRoles : ['student'];
        }
        setRoles(newRoles);
    };

    const handleSaveChanges = async () => {
      setIsLoading(true);
      try {
          const userRef = doc(firestore, 'users', studentId);
          await updateDoc(userRef, { roles: roles });
          toast({
              title: "Roles Updated",
              description: `User roles have been successfully updated.`,
          });
      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Error Updating Roles',
              description: error.message,
          });
      } finally {
          setIsLoading(false);
      }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Manage Roles
                </CardTitle>
                <CardDescription>
                    Assign roles to this user to grant or revoke specific permissions.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  {ALL_ROLES.map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={(roles || []).includes(role)}
                        onCheckedChange={(checked) => handleRoleChange(role, !!checked)}
                      />
                      <Label htmlFor={`role-${role}`} className="capitalize">
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
                 <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Role Changes
                 </Button>
            </CardContent>
        </Card>
    );
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const firestore = useFirestore();

  // Fetch student data
  const studentRef = useMemoFirebase(
    () => (firestore && studentId ? doc(firestore, 'users', studentId) : null),
    [firestore, studentId]
  );
  const { data: student, isLoading: isStudentLoading } = useDoc<User>(studentRef);

  // Fetch student's enrollments
  const enrollmentsQuery = useMemoFirebase(
    () => (firestore && studentId ? collection(firestore, `users/${studentId}/enrollments`) : null),
    [firestore, studentId]
  );
  const { data: enrollments, isLoading: areEnrollmentsLoading } = useCollection(enrollmentsQuery);

  // Fetch all courses to match enrollments
  const coursesQuery = useMemoFirebase(
    () => (firestore && enrollments && enrollments.length > 0) ? query(collection(firestore, 'courses'), where('__name__', 'in', enrollments.map(e => e.courseId))) : null,
    [firestore, enrollments]
  );
  const { data: courses, isLoading: areCoursesLoading } = useCollection<Course>(coursesQuery);

  // Fetch student's quiz attempts
  const attemptsQuery = useMemoFirebase(
    () =>
      firestore && studentId
        ? query(
            collection(firestore, `users/${studentId}/quizAttempts`),
            orderBy('attemptedDate', 'desc')
          )
        : null,
    [firestore, studentId]
  );
  const { data: quizAttempts, isLoading: areAttemptsLoading } = useCollection<QuizAttempt>(attemptsQuery);

  const isLoading =
    isStudentLoading || areEnrollmentsLoading || areAttemptsLoading || areCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!student) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4">
          <AvatarImage src={student.avatarUrl} alt={student.displayName} />
          <AvatarFallback className="text-3xl">
            {student.displayName ? student.displayName.charAt(0) : 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold font-headline">{student.displayName}</h1>
          <p className="text-muted-foreground">{student.email}</p>
        </div>
      </div>
      
       <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{(student.xp || 0).toLocaleString()}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{student.streak || 0} Days</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{courses?.length || 0}</div>
            </CardContent>
        </Card>
      </div>

       {student && <RoleManager studentId={studentId} currentRoles={student.roles} />}

       <EarnedBadges userId={studentId} />

        <div>
            <h2 className="text-2xl font-bold mb-4 font-headline">Enrolled Courses</h2>
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {courses && courses.length > 0 ? (
                courses.map((course) => (
                    <EnrolledCourseCard key={course.id} course={course} />
                ))
            ) : (
                <Card className="md:col-span-3 flex flex-col items-center justify-center text-center p-6 bg-secondary/50 border-dashed">
                    <CardHeader>
                        <CardTitle>No Courses</CardTitle>
                        <CardDescription>This student has not enrolled in any courses yet.</CardDescription>
                    </CardHeader>
                </Card>
            )}
            </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz History</CardTitle>
          <CardDescription>A log of all quizzes taken by {student.displayName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areAttemptsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Loading quiz history...</TableCell>
                </TableRow>
              ) : quizAttempts && quizAttempts.length > 0 ? (
                quizAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.topicName}</TableCell>
                    <TableCell>{attempt.attemptedDate.toDate().toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{attempt.score}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No quiz attempts recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
