import { PlaceHolderImages } from './placeholder-images';

export type Course = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  adminId: string;
};

export type Topic = {
  id: string;
  courseId: string;
  title: string;
};

export type Flashcard = {
  id: string;
  topicId: string;
  front: string;
  back: string;
};

export type Question = {
  id: string;
  topicId: string;
  question: string;
  type: 'MCQ' | 'True/False' | 'Short Answer';
  options?: string[];
  answer: string;
};

export type StudentProgress = {
  studentId: string;
  courseId: string;
  completedTopics: string[];
  masteredFlashcards: string[];
  quizScores: { [quizId: string]: number };
  accuracy: number;
};

const courses: Course[] = [
  {
    id: '1',
    title: 'Introduction to Biology',
    description: 'Explore the fundamental principles of life and biological systems.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'course-biology')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(img => img.id === 'course-biology')?.imageHint || '',
    adminId: '99',
  },
  {
    id: '2',
    title: 'World History: Ancient Civilizations',
    description: 'A journey through the rise and fall of great empires.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'course-history')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(img => img.id === 'course-history')?.imageHint || '',
    adminId: '99',
  },
  {
    id: '3',
    title: 'Calculus I',
    description: 'Master the concepts of limits, derivatives, and integrals.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'course-calculus')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(img => img.id === 'course-calculus')?.imageHint || '',
    adminId: '99',
  },
];

const topics: Topic[] = [
  { id: 'bio-1', courseId: '1', title: 'Cell Structure' },
  { id: 'bio-2', courseId: '1', title: 'Genetics' },
  { id: 'hist-1', courseId: '2', title: 'Ancient Egypt' },
  { id: 'hist-2', courseId: '2', title: 'The Roman Empire' },
  { id: 'calc-1', courseId: '3', title: 'Derivatives' },
];

const flashcards: Flashcard[] = [
  { id: 'fc-1', topicId: 'bio-1', front: 'What is the powerhouse of the cell?', back: 'The Mitochondria' },
  { id: 'fc-2', topicId: 'bio-1', front: 'What does the cell nucleus contain?', back: 'The cell\'s genetic material (DNA)' },
  { id: 'fc-3', topicId: 'hist-1', front: 'What is the name of the ancient Egyptian writing system?', back: 'Hieroglyphics' },
];

const questions: Question[] = [
  {
    id: 'q-1',
    topicId: 'bio-1',
    question: 'Which organelle is responsible for protein synthesis?',
    type: 'MCQ',
    options: ['Mitochondria', 'Ribosome', 'Nucleus', 'Golgi Apparatus'],
    answer: 'Ribosome',
  },
  {
    id: 'q-2',
    topicId: 'bio-1',
    question: 'The cell membrane is permeable.',
    type: 'True/False',
    options: ['True', 'False'],
    answer: 'False',
  },
];

const studentProgress: StudentProgress[] = [
  {
    studentId: '1',
    courseId: '1',
    completedTopics: ['bio-1'],
    masteredFlashcards: ['fc-1'],
    quizScores: { 'quiz-bio-1': 85 },
    accuracy: 88,
  },
  {
    studentId: '1',
    courseId: '2',
    completedTopics: [],
    masteredFlashcards: [],
    quizScores: {},
    accuracy: 72,
  },
];

// API-like functions to fetch data
export const getCourses = async (): Promise<Course[]> => {
  return new Promise(resolve => setTimeout(() => resolve(courses), 50));
};

export const getCourseById = async (id: string): Promise<Course | undefined> => {
  return new Promise(resolve => setTimeout(() => resolve(courses.find(c => c.id === id)), 50));
};

export const getTopicsByCourseId = async (courseId: string): Promise<Topic[]> => {
  return new Promise(resolve => setTimeout(() => resolve(topics.filter(t => t.courseId === courseId)), 50));
};

export const getTopicById = async (id: string): Promise<Topic | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(topics.find(t => t.id === id)), 50));
}

export const getFlashcardsByTopicId = async (topicId: string): Promise<Flashcard[]> => {
    return new Promise(resolve => setTimeout(() => resolve(flashcards.filter(f => f.topicId === topicId)), 50));
};

export const getQuestionsByTopicId = async (topicId: string): Promise<Question[]> => {
    return new Promise(resolve => setTimeout(() => resolve(questions.filter(q => q.topicId === topicId)), 50));
};

export const getStudentProgress = async (studentId: string, courseId: string): Promise<StudentProgress | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(studentProgress.find(p => p.studentId === studentId && p.courseId === courseId)), 50));
};

export const getLeaderboard = async () => {
    const { mockUsers } = await import('./auth');
    const sortedUsers = mockUsers.filter(u => u.role === 'student').sort((a, b) => b.xp - a.xp);
    return new Promise(resolve => setTimeout(() => resolve(sortedUsers), 50));
};
