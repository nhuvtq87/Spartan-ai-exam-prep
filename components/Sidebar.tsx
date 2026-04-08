
import React from 'react';
import { View, CourseMaterial } from '../types';
import FileUpload from './FileUpload';
import LinkImporter from './LinkImporter';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  materials: CourseMaterial[];
  onUpload: (materials: CourseMaterial[]) => void;
  onImport: (url: string) => void;
  isProcessing: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  materials, 
  onUpload, 
  onImport, 
  isProcessing 
}) => {
  const items: { id: View; icon: string; label: string }[] = [
    { id: 'dashboard', icon: 'fa-table-columns', label: 'Home' },
    { id: 'flashcards', icon: 'fa-clone', label: 'Cards' },
    { id: 'quiz', icon: 'fa-clipboard-question', label: 'Quiz' },
    { id: 'simplifier', icon: 'fa-wand-magic-sparkles', label: 'Simple' },
    { id: 'faq', icon: 'fa-clipboard-list', label: 'FAQs' },
    { id: 'planner', icon: 'fa-calendar-days', label: 'Plan' },
    { id: 'notes', icon: 'fa-note-sticky', label: 'Notes' },
    { id: 'timer', icon: 'fa-stopwatch', label: 'Timer' },
    { id: 'tutor', icon: 'fa-robot', label: 'AI' },
  ];

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'fa-file-pdf';
    if (t.includes('presentation') || t.includes('powerpoint') || t.includes('ppt')) return 'fa-file-powerpoint';
    if (t.includes('word') || t.includes('docx') || t.includes('msword')) return 'fa-file-word';
    if (t.includes('image')) return 'fa-file-image';
    return 'fa-file-lines';
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-sjsu-blue text-white flex-shrink-0 flex-col h-screen sticky top-0 shadow-2xl">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-sjsu-gold rounded-full flex items-center justify-center font-bold text-sjsu-blue text-xl">S</div>
          <h1 className="text-xl font-bold tracking-tight">Spartan Prep</h1>
        </div>
        
        <nav className="flex-1 mt-2 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {items.filter(item => item.label && item.icon).map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-200 border h-auto ${
                currentView === item.id 
                  ? 'bg-white/20 backdrop-blur-md border-white/20 text-white shadow-lg font-bold' 
                  : 'border-transparent hover:bg-white/10 text-blue-100/80 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center text-sm`}></i>
              <span className="text-sm tracking-tight">
                {item.label === 'Home' ? 'Dashboard' : 
                 item.label === 'Cards' ? 'Flashcards' : 
                 item.label === 'Plan' ? 'Study Planner' : 
                 item.label === 'AI' ? 'AI Tutor' : 
                 item.label === 'FAQs' ? 'FAQ Matrix' : 
                 item.label === 'Simple' ? 'Simplifier' : 
                 item.label}
              </span>
            </button>
          ))}

          <div className="mt-8 pt-6 border-t border-white/10 space-y-4 pb-6">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300/60">Course Materials</h3>
            
            <div className="space-y-2 px-2">
              {materials.length === 0 ? (
                <div className="px-4 py-6 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-[10px] text-blue-200/50 font-medium">No materials yet</p>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                      <i className={`fa-solid ${getFileIcon(m.type)} text-xs text-sjsu-gold/70`}></i>
                      <span className="text-[11px] font-medium truncate flex-1">{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-2 space-y-3">
              <div className="sidebar-upload-wrapper">
                <FileUpload onUpload={onUpload} isProcessing={isProcessing} compact />
              </div>
              <div className="sidebar-import-wrapper">
                <LinkImporter onImport={onImport} isProcessing={isProcessing} compact />
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 bg-blue-900 mt-auto border-t border-blue-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
              <i className="fa-solid fa-user text-xs"></i>
            </div>
            <div>
              <p className="text-xs font-semibold">SJSU Student</p>
              <p className="text-[10px] text-blue-300">San Jose State University</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sjsu-blue text-white z-50 flex items-center justify-around px-2 py-2 border-t border-blue-800 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        {items.filter(item => item.label && item.icon).map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 transition-all py-1 ${
              currentView === item.id ? 'text-sjsu-gold' : 'text-blue-300 opacity-70'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-base mb-0.5`}></i>
            <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
