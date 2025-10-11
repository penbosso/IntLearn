import Image from 'next/image';
import Link from 'next/link';
import { getCourseById, getTopicsByCourseId, getStudentProgress } from '@/lib/data';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Book, Edit } from 'lucide-react';

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await getCourseById(params.id);
  if (!course) {
    notFound();
  }

  const topics = await getTopicsByCourseId(params.id);
  // In a real app, you'd get the current user's ID
  const progress = await getStudentProgress('1', params.id);
  const totalTopics = topics.length;
  const completedTopicsCount = progress?.completedTopics.length || 0;
  const courseCompletion = totalTopics > 0 ? (completedTopicsCount / totalTopics) * 100 : 0;


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
           <Card className="overflow-hidden">
                <Image
                    src={course.imageUrl}
                    alt={course.title}
                    width={600}
                    height={400}
                    data-ai-hint={course.imageHint}
                    className="object-cover w-full h-auto"
                />
                 <CardHeader>
                    <CardTitle className="text-2xl">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Course Completion</span>
                            <span className="text-sm font-bold">{Math.round(courseCompletion)}%</span>
                        </div>
                        <Progress value={courseCompletion} />
                        <p className="text-xs text-muted-foreground text-center pt-1">
                            {completedTopicsCount} of {totalTopics} topics completed
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:w-2/3">
           <h2 className="text-2xl font-bold mb-4 font-headline">Topics</h2>
           <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {topics.map((topic, index) => (
                  <AccordionItem value={`item-${index}`} key={topic.id}>
                    <AccordionTrigger className="px-6 hover:no-underline">
                        <div className='flex items-center gap-3'>
                            <div className={`w-3 h-3 rounded-full ${progress?.completedTopics.includes(topic.id) ? 'bg-green-500' : 'bg-muted'}`}></div>
                            <span>{topic.title}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 bg-secondary/50">
                       <p className="text-muted-foreground mb-4 pt-4">Ready to master this topic? Choose your study method.</p>
                       <div className="flex gap-4">
                            <Button asChild>
                                <Link href={`/dashboard/courses/${params.id}/flashcards?topic=${topic.id}`}>
                                    <Book className="mr-2 h-4 w-4" />
                                    Study Flashcards
                                </Link>
                            </Button>
                             <Button asChild variant="outline">
                                <Link href={`/dashboard/courses/${params.id}/quiz?topic=${topic.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Start Quiz
                                </Link>
                            </Button>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
               {topics.length === 0 && <p className="p-6 text-muted-foreground">No topics have been added to this course yet.</p>}
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
