
import React, { useState, useRef, useEffect } from 'react';
import { chatWithContext } from '../services/geminiService';
import { CourseMaterial, Note } from '../types';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface AITutorProps {
  materials: CourseMaterial[];
  notes: Note[];
}

const AITutor: React.FC<AITutorProps> = ({ materials, notes }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hello! I'm your Spartan Prep AI. Ask me anything about your uploaded course materials!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatWithContext(userMsg, materials, notes);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I hit a snag. Please check your connection and try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] max-w-4xl mx-auto flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 bg-sjsu-blue text-white flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-robot text-xl"></i>
            </div>
            <div>
                <h2 className="font-bold">Academic Tutor</h2>
                <p className="text-xs text-blue-200">Powered by Gemini AI</p>
            </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold bg-green-500/20 px-3 py-1 rounded-full text-green-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Ready to assist</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-100 bg-white">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'chat' ? 'text-sjsu-blue border-b-2 border-sjsu-blue' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <i className="fa-solid fa-message mr-2"></i>
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('knowledge')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'knowledge' ? 'text-sjsu-blue border-b-2 border-sjsu-blue' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <i className="fa-solid fa-database mr-2"></i>
          Knowledge Base
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-sjsu-blue text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 rounded-tl-none flex space-x-2 items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative flex items-center">
                  <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about your notes..."
                      className="w-full pl-6 pr-14 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none transition-all"
                  />
                  <button 
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 w-10 h-10 bg-sjsu-blue text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                      <i className="fa-solid fa-paper-plane text-sm"></i>
                  </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-widest font-bold">Confidential SJSU Study Space</p>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Course Materials ({materials.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {materials.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No materials uploaded yet.</p>
                ) : (
                  materials.map(m => (
                    <div key={m.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-50 text-sjsu-blue rounded flex items-center justify-center">
                        <i className="fa-solid fa-file-lines text-xs"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{m.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase">{m.type.split('/')[1] || 'document'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Personal Notes ({notes.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No notes captured yet.</p>
                ) : (
                  notes.map(n => (
                    <div key={n.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gold-50 text-sjsu-gold rounded flex items-center justify-center">
                        <i className="fa-solid fa-note-sticky text-xs"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{n.title}</p>
                        <p className="text-[9px] text-gray-400 uppercase">{n.course || 'General'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h4 className="text-xs font-black text-sjsu-blue uppercase tracking-widest mb-2">RAG Status</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your Spartan AI is currently grounding its responses in the {materials.length + notes.length} items listed above. 
                This ensures high-fidelity tutoring based strictly on your academic context.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AITutor;
