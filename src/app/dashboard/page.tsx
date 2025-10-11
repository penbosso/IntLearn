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
import { getCourses } from '@/lib/data';
import Image from 'next/image';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const courses = await getCourses();

  // This is a placeholder for a student's enrolled courses.
  const enrolledCourses = courses.slice(0, 2); 
  const otherCourses = courses.slice(2);

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
            <div className="text-2xl font-bold">1 / {enrolledCourses.length}</div>
            <p className="text-xs text-muted-foreground">Almost there!</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">My Courses</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.map((course) => (
            <CourseCard key={course.id} course={course} progress={Math.random() * 100} />
          ))}
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
        title: string;
        description: string;
        imageUrl: string;
        imageHint: string;
    };
    progress?: number;
    enroll?: boolean;
}

function CourseCard({ course, progress, enroll = false }: CourseCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <Link href={enroll ? `/dashboard/courses/${course.id}` : `/dashboard/courses/${course.id}`} className="block">
        <Image
          src={course.imageUrl}
          alt={course.title}
          width={600}
          height={400}
          data-ai-hint={course.imageHint}
          className="h-48 w-full object-cover"
        />
      </Link>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription className="h-10">{course.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {enroll ? (
             <Button className="w-full">Enroll Now</Button>
        ) : (
          progress !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-bold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
