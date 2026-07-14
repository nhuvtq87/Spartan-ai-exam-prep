
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import FlashcardView from './components/FlashcardView';
import QuizView from './components/QuizView';
import StudyPlanner from './components/StudyPlanner';
import AITutor from './components/AITutor';
import StudyTimer from './components/StudyTimer';
import FAQMatrix from './components/FAQMatrix';
import ConceptSimplifier from './components/ConceptSimplifier';
import NotesView from './components/NotesView';
import OnboardingView from './components/OnboardingView';
import { View, CourseMaterial, Flashcard, QuizQuestion, StudyEvent, StudySession, FAQItem, Note } from './types';
import { generateFlashcards, generateQuiz, generateFAQMatrix } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('onboarding');
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(50);
  const [quizCount, setQuizCount] = useState(50);
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    // Fetch SJSU academic resources from the updated API
    fetch('/api/resources')
      .then(res => res.json())
      .then(data => setResources(data.links || []))
      .catch(err => console.error("Failed to fetch resources:", err));
  }, []);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 10000);
  };

  const processMaterials = async (allMaterials: CourseMaterial[], allNotes: Note[], fCount?: number, qCount?: number) => {
    if (allMaterials.length === 0 && allNotes.length === 0) return;

    try {
      const [newFlashcards, newQuiz, newFaqs] = await Promise.all([
        generateFlashcards(allMaterials, allNotes, fCount || flashcardCount),
        generateQuiz(allMaterials, allNotes, qCount || quizCount),
        generateFAQMatrix(allMaterials, allNotes)
      ]);

      setFlashcards(newFlashcards);
      setQuizzes(newQuiz);
      setFaqs(newFaqs);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      showError(error?.message || "Failed to process materials with AI. Please check your API key/connection.");
    }
  };

  const handleFileUpload = (newMaterials: CourseMaterial[]) => {
    // Optimistic UI: Add materials immediately
    setMaterials(prev => {
      const updated = [...prev, ...newMaterials];
      // Process in background using the updated list
      setIsProcessing(true);
      processMaterials(updated, notes).finally(() => setIsProcessing(false));
      return updated;
    });
  };

  const handleAddNote = (note: Note) => {
    setNotes(prev => {
      const updated = [...prev, note];
      setIsProcessing(true);
      processMaterials(materials, updated).finally(() => setIsProcessing(false));
      return updated;
    });
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === updatedNote.id ? updatedNote : n);
      setIsProcessing(true);
      processMaterials(materials, updated).finally(() => setIsProcessing(false));
      return updated;
    });
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      setIsProcessing(true);
      processMaterials(materials, updated).finally(() => setIsProcessing(false));
      return updated;
    });
  };

  const handleOnboardingComplete = (name: string, initialMaterials: CourseMaterial[]) => {
    setCourseName(name);
    setMaterials(initialMaterials);
    setIsProcessing(true);
    processMaterials(initialMaterials, []).finally(() => {
      setIsProcessing(false);
      setView('dashboard');
    });
  };

  const handleAddEvent = (event: StudyEvent) => {
    setEvents(prev => [...prev, event]);
  };

  const handleUpdateEvent = (updatedEvent: StudyEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleSessionComplete = (session: StudySession) => {
    setSessions(prev => [...prev, session]);
  };

  const handleRegenerateFlashcards = async (count: number) => {
    if (materials.length === 0 && notes.length === 0) return;
    setFlashcardCount(count);
    setIsProcessing(true);
    try {
      const newFlashcards = await generateFlashcards(materials, notes, count);
      setFlashcards(newFlashcards);
    } catch (error: any) {
      console.error("Flashcard Regeneration Error:", error);
      showError(error?.message || "Failed to regenerate flashcards.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateQuiz = async (count: number) => {
    if (materials.length === 0 && notes.length === 0) return;
    setQuizCount(count);
    setIsProcessing(true);
    try {
      const newQuiz = await generateQuiz(materials, notes, count);
      setQuizzes(newQuiz);
    } catch (error: any) {
      console.error("Quiz Regeneration Error:", error);
      showError(error?.message || "Failed to regenerate quiz.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateFAQ = async () => {
    if (materials.length === 0 && notes.length === 0) return;
    setIsProcessing(true);
    try {
      const newFaqs = await generateFAQMatrix(materials, notes);
      setFaqs(newFaqs);
    } catch (error: any) {
      console.error("FAQ Regeneration Error:", error);
      showError(error?.message || "Failed to regenerate FAQ Matrix.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="space-y-6 md:space-y-8 animate-fadeIn">
            <Dashboard 
              materials={materials} 
              events={events} 
              sessions={sessions}
              onViewChange={setView} 
            />
            {sources.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-8">
                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <i className="fa-solid fa-earth-americas mr-2 text-sjsu-blue"></i>
                  Grounding Sources
                </h4>
                <div className="flex flex-wrap gap-3">
                  {sources.map((s, i) => (
                    s.web && (
                      <a 
                        key={i} 
                        href={s.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] bg-blue-50 text-sjsu-blue px-3 py-1.5 rounded-lg border border-blue-100 font-semibold hover:bg-blue-100 transition-colors"
                      >
                        {s.web.title || "External Source"}
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'flashcards':
        return (
          <FlashcardView 
            flashcards={flashcards} 
            materials={materials}
            isProcessing={isProcessing} 
            onRegenerate={handleRegenerateFlashcards}
            currentCount={flashcardCount}
            onUpload={handleFileUpload}
          />
        );
      case 'quiz':
        return (
          <QuizView 
            questions={quizzes} 
            materials={materials}
            isProcessing={isProcessing} 
            onRegenerate={handleRegenerateQuiz}
            currentCount={quizCount}
            onUpload={handleFileUpload}
          />
        );
      case 'faq':
        return (
          <FAQMatrix 
            faqs={faqs} 
            materials={materials}
            isProcessing={isProcessing} 
            onRegenerate={handleRegenerateFAQ}
          />
        );
      case 'simplifier':
        return <ConceptSimplifier materials={materials} notes={notes} />;
      case 'planner':
        return <StudyPlanner events={events} onAddEvent={handleAddEvent} onUpdateEvent={handleUpdateEvent} onDeleteEvent={handleDeleteEvent} />;
      case 'notes':
        return <NotesView notes={notes} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />;
      case 'timer':
        return (
          <StudyTimer 
            materials={materials} 
            notes={notes}
            onSessionComplete={handleSessionComplete} 
          />
        );
      case 'tutor':
        return <AITutor materials={materials} notes={notes} sjsuResources={resources} />;
      case 'onboarding':
        return <OnboardingView onComplete={handleOnboardingComplete} isProcessing={isProcessing} />;
      default:
        return <Dashboard materials={materials} events={events} sessions={sessions} onViewChange={setView} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 relative">
      <Sidebar 
        currentView={view} 
        onViewChange={setView} 
        materials={materials}
        onUpload={handleFileUpload}
        isProcessing={isProcessing}
      />
      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fadeIn w-full max-w-lg px-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-lg flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-bold text-sm">Error</h3>
                <p className="text-red-700 text-xs mt-1">{errorMsg}</p>
              </div>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 transition-colors ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-8 max-h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @media (max-width: 768px) {
          ::-webkit-scrollbar {
            width: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
