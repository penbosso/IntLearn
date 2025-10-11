import { getCourseById } from '@/lib/data';
import { notFound } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Edit, Trash2 } from 'lucide-react';

const mockFlashcards = [
    { id: 'f1', front: 'What is the powerhouse of the cell?', back: 'Mitochondria', status: 'Approved' },
    { id: 'f2', front: 'What does DNA stand for?', back: 'Deoxyribonucleic acid', status: 'Needs Review' },
];

const mockQuestions = [
    { id: 'q1', question: 'Which of these is a primary color?', type: 'MCQ', status: 'Approved' },
    { id: 'q2', question: 'The Earth is flat.', type: 'True/False', status: 'Approved' },
    { id: 'q3', question: 'What is the capital of France?', type: 'Short Answer', status: 'Needs Review' },
]

export default async function AdminCourseReviewPage({ params }: { params: { id: string } }) {
  const course = await getCourseById(params.id) || { id: '4', title: 'New AI-Generated Course'};
  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold font-headline">Manage: {course.title}</h1>
                <p className="text-muted-foreground">Review and approve the AI-generated content for this course.</p>
            </div>
            <Button>
            <CheckCircle className="mr-2 h-4 w-4" />
            Publish Course
            </Button>
        </div>

        <Tabs defaultValue="flashcards">
            <TabsList>
                <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                <TabsTrigger value="questions">Quiz Questions</TabsTrigger>
            </TabsList>
            <TabsContent value="flashcards">
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Flashcards</CardTitle>
                        <CardDescription>Review and edit the generated flashcards before publishing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Front</TableHead>
                                    <TableHead>Back</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockFlashcards.map(fc => (
                                    <TableRow key={fc.id}>
                                        <TableCell className="font-medium max-w-xs truncate">{fc.front}</TableCell>
                                        <TableCell className="max-w-xs truncate">{fc.back}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${fc.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {fc.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="questions">
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Quiz Questions</CardTitle>
                        <CardDescription>Review and edit the generated questions for quizzes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {mockQuestions.map(q => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium max-w-sm truncate">{q.question}</TableCell>
                                        <TableCell>{q.type}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${q.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {q.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
