
import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, CourseMaterial } from '../types';
import FileUpload from './FileUpload';

interface QuizViewProps {
  questions: QuizQuestion[];
  materials: CourseMaterial[];
  isProcessing: boolean;
  onRegenerate: (count: number) => void;
  currentCount: number;
}

const QuizView: React.FC<QuizViewProps> = ({ 
  questions, 
  materials,
  isProcessing,
  onRegenerate,
  currentCount
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [mode, setMode] = useState<'study' | 'exam'>('study');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedCount, setSelectedCount] = useState(currentCount);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setQuizFinished(true);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  if (materials.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 animate-fadeIn text-center px-4">
        <div className="w-24 h-24 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center">
          <i className="fa-solid fa-cloud-arrow-up text-4xl"></i>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">No Materials Found</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Please upload a document or link in the sidebar to unlock this feature.
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sjsu-gold/10 text-sjsu-gold rounded-full mb-2">
            <i className="fa-solid fa-graduation-cap text-3xl"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Spartan Exam Prep</h2>
          <p className="text-gray-500 max-w-lg mx-auto italic">
            Ready to build your practice exam. Adjust the question count and start your simulation.
          </p>
        </div>

        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">Questions to Generate</label>
              <span className="text-sjsu-blue font-black text-xl">{selectedCount}</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="30" 
              step="1" 
              value={selectedCount}
              onChange={(e) => setSelectedCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-sjsu-blue"
            />
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>10 Questions</span>
              <span>30 Questions</span>
            </div>
          </div>

          <button
            onClick={() => onRegenerate(selectedCount)}
            disabled={isProcessing}
            className="w-full py-4 bg-sjsu-gold text-sjsu-blue rounded-2xl font-black shadow-lg shadow-yellow-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-3"
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                <span>Building Exam...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt"></i>
                <span>Generate Practice Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startQuiz = (selectedMode: 'study' | 'exam') => {
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedOption(null);
    setShowExplanation(false);
    setUserAnswers({});
    if (selectedMode === 'exam') {
      setTimeLeft(60 * questions.length); // 1 minute per question
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  };

  if (quizFinished) {
    const finalScore = mode === 'exam' 
      ? Object.entries(userAnswers).filter(([idx, ans]) => questions[parseInt(idx)].correctAnswer === ans).length
      : score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    
    let feedback = "Ready for Tower Hall! Exemplary Spartan spirit.";
    let icon = "fa-medal";
    let color = "text-sjsu-blue";

    if (percentage < 70) {
      feedback = "More time at MLK Library needed. You've got this, Spartan!";
      icon = "fa-book-open-reader";
      color = "text-orange-500";
    } else if (percentage < 90) {
      feedback = "Solid performance. You're on the path to the Dean's list!";
      icon = "fa-star";
      color = "text-sjsu-gold";
    }

    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl border border-gray-100 text-center space-y-8 animate-fadeIn relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-sjsu-blue"></div>
          
          <div className={`text-6xl ${color}`}>
            <i className={`fa-solid ${icon}`}></i>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">Exam Results</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{mode === 'exam' ? 'Exam Simulation' : 'Guided Study'} Completed</p>
          </div>

          <div className="flex justify-center items-center gap-12">
            <div className="text-center">
              <p className="text-4xl font-black text-sjsu-blue">{finalScore}/{questions.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Correct</p>
            </div>
            <div className="w-px h-12 bg-gray-100"></div>
            <div className="text-center">
              <p className="text-4xl font-black text-sjsu-gold">{percentage}%</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Readiness</p>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl">
            <p className="text-sm font-bold text-gray-700 leading-relaxed italic">"{feedback}"</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => startQuiz(mode)}
              className="flex-1 py-4 bg-sjsu-blue text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95"
            >
              Retake Exam
            </button>
            <button 
              onClick={() => {setQuizFinished(false); setCurrentIndex(0); setMode('study');}}
              className="flex-1 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold transition-all hover:bg-gray-50 active:scale-95"
            >
              Review Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isAnswered = mode === 'study' ? selectedOption !== null : userAnswers[currentIndex] !== undefined;

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    
    if (mode === 'study') {
      setSelectedOption(index);
      setShowExplanation(true);
      if (index === currentQ.correctAnswer) setScore(score + 1);
    } else {
      setUserAnswers(prev => ({ ...prev, [currentIndex]: index }));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Quiz Controls / Progress */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
                {questions.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                        i === currentIndex ? 'bg-sjsu-blue w-6' : 
                        (mode === 'exam' ? (userAnswers[i] !== undefined ? 'bg-sjsu-gold' : 'bg-gray-200') : 
                        (i < currentIndex ? 'bg-green-500' : 'bg-gray-200'))
                    }`}></div>
                ))}
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Q {currentIndex + 1} of {questions.length}</span>
        </div>

        <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white border border-gray-100 rounded-xl shadow-sm px-3 py-1 space-x-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Count:</span>
              <select 
                value={selectedCount}
                onChange={(e) => setSelectedCount(parseInt(e.target.value))}
                className="text-xs font-bold text-sjsu-blue bg-transparent outline-none cursor-pointer"
              >
                {[...Array(21)].map((_, i) => (
                  <option key={i + 10} value={i + 10}>{i + 10}</option>
                ))}
              </select>
              <button 
                onClick={() => onRegenerate(selectedCount)}
                disabled={isProcessing}
                className="text-sjsu-blue hover:text-blue-700 disabled:opacity-30"
                title="Regenerate with new count"
              >
                <i className={`fa-solid fa-arrows-rotate ${isProcessing ? 'animate-spin' : ''}`}></i>
              </button>
            </div>
            {mode === 'exam' && (
                <div className={`px-4 py-1.5 rounded-full font-black text-xs tabular-nums flex items-center space-x-2 border ${
                    timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                    <i className="fa-regular fa-clock"></i>
                    <span>{formatTime(timeLeft)}</span>
                </div>
            )}
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => startQuiz('study')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${mode === 'study' ? 'bg-white text-sjsu-blue shadow-sm' : 'text-gray-400'}`}
                >Study</button>
                <button 
                  onClick={() => startQuiz('exam')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${mode === 'exam' ? 'bg-white text-sjsu-blue shadow-sm' : 'text-gray-400'}`}
                >Exam</button>
            </div>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-10 relative">
        <div className="space-y-3">
          <span className="text-[10px] font-black text-sjsu-blue bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">
            {mode === 'study' ? 'Professor Guided' : 'Time Trial Simulation'}
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">{currentQ.question}</h3>
        </div>
        
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isCorrect = idx === currentQ.correctAnswer;
            const currentSelected = mode === 'study' ? selectedOption : userAnswers[currentIndex];
            const isSelected = currentSelected === idx;
            
            let cardStyle = 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100';
            let dotStyle = 'border-gray-200 text-gray-300';

            if (isAnswered) {
              if (mode === 'study') {
                if (isCorrect) {
                  cardStyle = 'bg-green-50 border-green-200 text-green-700';
                  dotStyle = 'bg-green-500 text-white border-green-500';
                } else if (isSelected) {
                  cardStyle = 'bg-red-50 border-red-200 text-red-700';
                  dotStyle = 'bg-red-500 text-white border-red-500';
                }
              } else {
                // Exam mode style: just highlight selection, don't show right/wrong yet
                if (isSelected) {
                  cardStyle = 'bg-sjsu-blue/5 border-sjsu-blue text-sjsu-blue shadow-sm';
                  dotStyle = 'bg-sjsu-blue text-white border-sjsu-blue';
                }
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                className={`w-full p-5 text-left rounded-2xl border-2 transition-all font-semibold flex items-center space-x-4 ${cardStyle}`}
                disabled={isAnswered && mode === 'study'}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border-2 flex-shrink-0 ${dotStyle}`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-sm md:text-base">{option}</span>
              </button>
            );
          })}
        </div>

        {showExplanation && mode === 'study' && (
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-fadeIn flex gap-4">
            <div className="w-10 h-10 bg-sjsu-blue text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <i className="fa-solid fa-chalkboard-user text-sm"></i>
            </div>
            <div>
                <h4 className="text-[10px] font-black text-sjsu-blue uppercase tracking-widest mb-1">Professor's Insight</h4>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">{currentQ.explanation}</p>
            </div>
          </div>
        )}

        {(isAnswered || mode === 'exam') && (
          <div className="flex gap-4">
             {currentIndex > 0 && mode === 'exam' && (
                <button 
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-all"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
             )}
             <button 
                onClick={handleNext}
                disabled={!isAnswered}
                className="flex-1 py-5 bg-sjsu-blue text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              >
                {currentIndex === questions.length - 1 ? 'Finish Exam' : 'Continue to Next'}
              </button>
          </div>
        )}
      </div>

      <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="text-sm font-bold text-gray-800">Target Specific Topics</h4>
          <p className="text-xs text-gray-500">Upload individual chapters for focused sub-exams.</p>
        </div>
      </div>
    </div>
  );
};

export default QuizView;
