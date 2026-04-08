
import React, { useState, useMemo, useEffect } from 'react';
import { Flashcard, CourseMaterial } from '../types';
import FileUpload from './FileUpload';

interface FlashcardViewProps {
  flashcards: Flashcard[];
  materials: CourseMaterial[];
  isProcessing: boolean;
  onRegenerate: (count: number) => void;
  currentCount: number;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ 
  flashcards: initialFlashcards, 
  materials,
  isProcessing,
  onRegenerate,
  currentCount
}) => {
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedCount, setSelectedCount] = useState(currentCount);

  // Initialize deck when initialFlashcards change
  useEffect(() => {
    setDeck(initialFlashcards.map(card => ({ ...card, isMastered: false })));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  }, [initialFlashcards]);

  const masteredCount = deck.filter(c => c.isMastered).length;
  const progressPercent = deck.length > 0 ? (masteredCount / deck.length) * 100 : 0;

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
  };

  const markCardStatus = (isMastered: boolean) => {
    const updatedDeck = [...deck];
    updatedDeck[currentIndex] = { ...updatedDeck[currentIndex], isMastered };
    setDeck(updatedDeck);
    
    // Automatically advance on mastered or just feedback?
    // Let's advance automatically for a smooth flow
    setTimeout(() => {
        handleNext();
    }, 300);
  };

  const shuffleDeck = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  const resetMastery = () => {
    setDeck(deck.map(c => ({ ...c, isMastered: false })));
    setCurrentIndex(0);
    setIsFinished(false);
    setIsFlipped(false);
  };

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

  if (deck.length === 0) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sjsu-blue/10 text-sjsu-blue rounded-full mb-2">
            <i className="fa-solid fa-clone text-3xl"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Spartan Study Deck</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Ready to generate your active recall deck. Adjust the count below and hit generate.
          </p>
        </div>
        
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">Flashcards to Generate</label>
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
              <span>10 Cards</span>
              <span>30 Cards</span>
            </div>
          </div>

          <button
            onClick={() => onRegenerate(selectedCount)}
            disabled={isProcessing}
            className="w-full py-4 bg-sjsu-blue text-white rounded-2xl font-black shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-3"
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                <span>Generating Deck...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Generate Flashcards</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-12 animate-fadeIn">
        <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl border border-gray-100 text-center space-y-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-sjsu-gold"></div>
          
          <div className="text-6xl text-sjsu-gold">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">Session Complete!</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Mastery Report</p>
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto">
            <div className="text-center p-6 bg-green-50 rounded-3xl border border-green-100">
              <p className="text-4xl font-black text-green-600">{masteredCount}</p>
              <p className="text-[10px] font-bold text-green-700 uppercase">Mastered</p>
            </div>
            <div className="text-center p-6 bg-red-50 rounded-3xl border border-red-100">
              <p className="text-4xl font-black text-red-600">{deck.length - masteredCount}</p>
              <p className="text-[10px] font-bold text-red-700 uppercase">Review Needed</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={resetMastery}
              className="flex-1 py-4 bg-sjsu-blue text-white rounded-2xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              Restart Study
            </button>
            <button 
              onClick={shuffleDeck}
              className="flex-1 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold transition-all hover:bg-gray-50 active:scale-95"
            >
              Shuffle & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = deck[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Active Recall</h2>
          <p className="text-xs md:text-sm text-gray-500">Mastering your academic milestones.</p>
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
            <button 
              onClick={shuffleDeck}
              className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-sjsu-blue rounded-xl shadow-sm transition-all"
              title="Shuffle Deck"
            >
              <i className="fa-solid fa-shuffle"></i>
            </button>
            <div className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-xs font-bold text-gray-400">
                {currentIndex + 1} / {deck.length}
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-end px-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mastery Gauge</span>
            <span className="text-[10px] font-black text-sjsu-blue uppercase tracking-widest">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sjsu-gold transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
        </div>
      </div>

      <div className="relative group perspective-1000">
        <div 
          className={`relative h-80 md:h-96 w-full cursor-pointer transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-8 md:p-16 text-center group-hover:border-sjsu-blue/20 transition-colors">
             <div className="absolute top-8 left-10 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-sjsu-gold"></div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Question</span>
             </div>
             <p className="text-xl md:text-3xl font-bold text-gray-800 leading-tight">{currentCard.question}</p>
             <div className="absolute bottom-8 text-[10px] font-bold text-gray-300 uppercase tracking-widest animate-pulse">
                <i className="fa-solid fa-rotate mr-2"></i>
                Tap to Reveal
             </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-sjsu-blue text-white rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-8 md:p-16 text-center rotate-y-180 overflow-y-auto">
            <div className="absolute top-8 left-10 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-sjsu-gold"></div>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Explanation</span>
            </div>
            <p className="text-lg md:text-2xl font-medium leading-relaxed italic">"{currentCard.answer}"</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        <div className="flex items-center space-x-4">
            <button 
                onClick={handlePrev}
                className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-sjsu-blue shadow-sm transition-all active:scale-90"
            >
                <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button 
                onClick={handleNext}
                className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-sjsu-blue shadow-sm transition-all active:scale-90"
            >
                <i className="fa-solid fa-chevron-right"></i>
            </button>
        </div>

        <div className="w-px h-8 bg-gray-100 hidden md:block"></div>

        <div className="flex items-center space-x-4 w-full md:w-auto">
            <button 
                onClick={() => markCardStatus(false)}
                className="flex-1 md:flex-none px-8 py-4 bg-white border-2 border-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
                <i className="fa-solid fa-xmark"></i>
                <span>Review Again</span>
            </button>
            <button 
                onClick={() => markCardStatus(true)}
                className="flex-1 md:flex-none px-8 py-4 bg-sjsu-gold text-sjsu-blue rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
                <i className="fa-solid fa-check"></i>
                <span>I Got It</span>
            </button>
        </div>
      </div>

      <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="text-sm font-bold text-gray-800">Target Core Concepts</h4>
          <p className="text-xs text-gray-500">Every upload strengthens your customized Spartan Study Deck.</p>
        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FlashcardView;
