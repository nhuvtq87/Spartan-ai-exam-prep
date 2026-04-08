
export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category?: string;
  isMastered?: boolean;
  lastReviewed?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface StudyEvent {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'assignment' | 'review';
  importance: 'high' | 'medium' | 'low';
  course?: string;
  updatedAt: number;
}

export interface CourseMaterial {
  id: string;
  name: string;
  type: string;
  content: string; // Base64 or Text
  mimeType: string;
  uploadDate?: string;
}

export interface StudySession {
  id: string;
  subject: string;
  durationMinutes: number;
  date: string;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface SimplifiedConcept {
  original: string;
  simpleExplanation: string;
  analogy: string;
  keyTakeaways: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  course?: string;
  createdAt: number;
  updatedAt: number;
}

export type View = 'dashboard' | 'flashcards' | 'quiz' | 'planner' | 'tutor' | 'timer' | 'faq' | 'simplifier' | 'notes' | 'onboarding';
