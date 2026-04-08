
import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { simplifyConcept } from '../services/geminiService';
import { SimplifiedConcept, CourseMaterial, Note } from '../types';

interface ConceptSimplifierProps {
  materials: CourseMaterial[];
  notes: Note[];
}

const ConceptSimplifier: React.FC<ConceptSimplifierProps> = ({ materials, notes }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SimplifiedConcept | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('simple');
  const [showContextPicker, setShowContextPicker] = useState(false);

  const handleSimplify = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const simplified = await simplifyConcept(input, mode);
      setResult(simplified);
    } catch (error) {
      console.error(error);
      alert("Failed to simplify concept. Try a shorter snippet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectContext = (content: string) => {
    setInput(content.substring(0, 2000)); // Limit to first 2000 chars for simplification
    setShowContextPicker(false);
  };

  const modes = [
    { id: 'simple', label: 'Plain English', icon: 'fa-comment-dots' },
    { id: 'analogy', label: 'Use Analogies', icon: 'fa-bridge' },
    { id: 'eli5', label: 'Explain Like I\'m 5', icon: 'fa-child' },
    { id: 'spartan', label: 'Spartan Style', icon: 'fa-shield-halved' },
    { id: 'gaming', label: 'Gaming Style', icon: 'lucide-gamepad', lucide: Gamepad2 }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Concept Simplifier</h2>
          <p className="text-gray-500">Transform complex SJSU lecture jargon into understandable ideas.</p>
        </div>
        <button 
          onClick={() => setShowContextPicker(!showContextPicker)}
          className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-xs font-bold text-sjsu-blue hover:bg-gray-50 transition-all flex items-center space-x-2"
        >
          <i className="fa-solid fa-folder-open"></i>
          <span>Pick from Materials</span>
        </button>
      </header>

      {showContextPicker && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl animate-fadeIn space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Source Text</h3>
            <button onClick={() => setShowContextPicker(false)} className="text-gray-400 hover:text-gray-600">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
            {materials.map(m => (
              <button 
                key={m.id}
                onClick={() => handleSelectContext(m.content)}
                className="text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all group"
              >
                <p className="text-xs font-bold text-gray-800 truncate group-hover:text-sjsu-blue">{m.name}</p>
                <p className="text-[10px] text-gray-400 uppercase">Material</p>
              </button>
            ))}
            {notes.map(n => (
              <button 
                key={n.id}
                onClick={() => handleSelectContext(n.content)}
                className="text-left p-3 bg-gray-50 hover:bg-gold-50 rounded-xl border border-transparent hover:border-gold-100 transition-all group"
              >
                <p className="text-xs font-bold text-gray-800 truncate group-hover:text-sjsu-gold">{n.title}</p>
                <p className="text-[10px] text-gray-400 uppercase">Note</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Complex Concept or Text</label>
            <span className="text-[10px] text-gray-300 font-bold">{input.length}/2000</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 2000))}
            placeholder="Paste a difficult paragraph from your textbook or lecture notes here..."
            className="w-full h-40 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none transition-all resize-none text-gray-800 placeholder-gray-400"
          />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border ${
                  mode === m.id 
                    ? 'bg-sjsu-blue text-white border-sjsu-blue shadow-md' 
                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                }`}
              >
                {m.lucide ? (
                  <m.lucide className="w-4 h-4" />
                ) : (
                  <i className={`fa-solid ${m.icon}`}></i>
                )}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleSimplify}
            disabled={isLoading || !input.trim()}
            className="w-full md:w-auto px-8 py-3 bg-sjsu-gold text-sjsu-blue font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-wand-magic-sparkles animate-spin"></i>
                <span>Simplifying...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Simplify Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-xs font-bold text-sjsu-blue uppercase tracking-widest mb-2 flex items-center">
                  <i className="fa-solid fa-lightbulb mr-2 text-sjsu-gold"></i>
                  Simple Explanation
                </h3>
                <p className="text-lg text-gray-800 leading-relaxed font-medium">
                  {result.simpleExplanation}
                </p>
              </div>

              <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <h3 className="text-xs font-bold text-sjsu-blue uppercase tracking-widest mb-2 flex items-center">
                  <i className="fa-solid fa-bridge mr-2"></i>
                  The Analogy
                </h3>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  "{result.analogy}"
                </p>
              </div>
            </div>

            <div className="bg-sjsu-blue text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-6">Key Takeaways</h3>
                <ul className="space-y-4">
                  {result.keyTakeaways.map((item, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <div className="mt-1 w-5 h-5 bg-sjsu-gold rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-sjsu-blue font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <i className="fa-solid fa-brain absolute -right-6 -bottom-6 text-9xl text-white/5 rotate-12"></i>
            </div>
          </div>
          
          <button 
            onClick={() => {setResult(null); setInput('');}}
            className="text-gray-400 hover:text-sjsu-blue text-sm font-semibold flex items-center space-x-2 mx-auto"
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            <span>Start Over</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ConceptSimplifier;
