
import React from 'react';
import { CourseMaterial, StudyEvent, StudySession, View } from '../types';

interface DashboardProps {
  materials: CourseMaterial[];
  events: StudyEvent[];
  sessions: StudySession[];
  onViewChange: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  materials, 
  events, 
  sessions, 
  onViewChange
}) => {
  const nextExam = events
    .filter(e => e.type === 'exam' && e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const daysToExam = nextExam 
    ? Math.ceil((new Date(nextExam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;

  const subjectStats = sessions.reduce((acc, s) => {
    acc[s.subject] = (acc[s.subject] || 0) + s.durationMinutes;
    return acc;
  }, {} as Record<string, number>);

  const topSubject = Object.entries(subjectStats).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'fa-file-pdf';
    if (t.includes('presentation') || t.includes('powerpoint') || t.includes('ppt')) return 'fa-file-powerpoint';
    if (t.includes('word') || t.includes('docx') || t.includes('msword')) return 'fa-file-word';
    if (t.includes('image')) return 'fa-file-image';
    return 'fa-file-lines';
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Spartan Study</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Ready for SJSU success?</p>
        </div>
        <div className="bg-sjsu-gold/10 px-3 py-1.5 rounded-lg border border-sjsu-gold/20 flex items-center space-x-2">
          <i className="fa-solid fa-star sjsu-gold text-xs"></i>
          <span className="text-xs font-semibold text-yellow-800">4.9 GPA Target</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-sjsu-blue text-white p-5 md:p-6 rounded-2xl shadow-lg flex flex-col justify-between overflow-hidden relative min-h-[140px]">
          <div className="relative z-10">
            <h3 className="text-xs md:text-sm font-medium text-blue-100 uppercase tracking-wider">Upcoming Exam</h3>
            <p className="text-lg md:text-xl font-bold mt-1 truncate max-w-[90%]">{nextExam?.title || "No exams synced"}</p>
            {daysToExam !== null && (
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-black">{daysToExam}</span>
                <span className="text-xs ml-2 font-medium">Days Left</span>
              </div>
            )}
          </div>
          <i className="fa-solid fa-graduation-cap absolute -right-4 -bottom-4 text-7xl md:text-9xl text-white/10 rotate-12"></i>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Focused Time</h3>
            <div className="w-7 h-7 bg-blue-50 text-sjsu-blue rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-stopwatch text-xs"></i>
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900">
            {hours}h {minutes}m
          </div>
          <p className="text-[10px] text-gray-400 mt-1 truncate">
            Top: <span className="text-sjsu-blue font-bold">{topSubject ? topSubject[0] : 'None'}</span>
          </p>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Course Material</h3>
            <div className="w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-file-invoice text-xs"></i>
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900">{materials.length} Files</div>
          <div className="mt-3 h-1.5 w-full bg-green-50 rounded-full overflow-hidden">
             <div className="h-full bg-green-500 rounded-full" style={{ width: materials.length > 0 ? '70%' : '0%' }}></div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg md:text-xl font-bold text-gray-800">Quick Actions</h3>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Manual AI Generation</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Flashcards Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="w-10 h-10 bg-blue-50 text-sjsu-blue rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-clone"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-800">Flashcards</h4>
              <p className="text-[10px] text-gray-500 mt-1">Generate active recall cards from materials.</p>
            </div>
            <button 
              onClick={() => onViewChange('flashcards')}
              disabled={materials.length === 0}
              className="mt-4 w-full py-2 bg-sjsu-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:grayscale transition-all hover:bg-blue-700 active:scale-95"
            >
              Generate
            </button>
          </div>

          {/* Quiz Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-clipboard-question"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-800">Practice Quiz</h4>
              <p className="text-[10px] text-gray-500 mt-1">Create a rigorous exam based on your docs.</p>
            </div>
            <button 
              onClick={() => onViewChange('quiz')}
              disabled={materials.length === 0}
              className="mt-4 w-full py-2 bg-sjsu-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:grayscale transition-all hover:bg-blue-700 active:scale-95"
            >
              Take a Quiz
            </button>
          </div>

          {/* Simplifier Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-800">Simplifier</h4>
              <p className="text-[10px] text-gray-500 mt-1">Break down complex jargon into plain English.</p>
            </div>
            <button 
              onClick={() => onViewChange('simplifier')}
              disabled={materials.length === 0}
              className="mt-4 w-full py-2 bg-sjsu-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:grayscale transition-all hover:bg-blue-700 active:scale-95"
            >
              Simplify
            </button>
          </div>

          {/* FAQ Matrix Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-clipboard-list"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-800">FAQ Matrix</h4>
              <p className="text-[10px] text-gray-500 mt-1">Extract core knowledge and deadlines.</p>
            </div>
            <button 
              onClick={() => onViewChange('faq')}
              disabled={materials.length === 0}
              className="mt-4 w-full py-2 bg-sjsu-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:grayscale transition-all hover:bg-blue-700 active:scale-95"
            >
              FAQ Matrix
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Files</h3>
            <button className="text-xs text-sjsu-blue font-semibold">View All</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {materials.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <i className="fa-regular fa-folder-open text-3xl mb-2"></i>
                <p className="text-xs">No materials uploaded.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {materials.map((m) => (
                  <li key={m.id} className="p-3 md:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 text-sjsu-blue rounded flex-shrink-0 flex items-center justify-center">
                        <i className={`fa-solid ${getFileIcon(m.type)} text-sm`}></i>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-tighter">{m.type.split('/')[1] || m.type}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Timeline</h3>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Next 14 Days</span>
          </div>
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
                Sync a syllabus to start.
              </div>
            ) : (
              events.slice(0, 4).map((event) => (
                <div key={event.id} className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3 md:space-x-4">
                  <div className={`w-1.5 h-8 rounded-full ${
                    event.importance === 'high' ? 'bg-red-500' : 
                    event.importance === 'medium' ? 'bg-orange-400' : 'bg-green-400'
                  }`}></div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-xs md:text-sm font-bold text-gray-800 truncate">{event.title}</h4>
                    <p className="text-[10px] text-gray-500">
                      {event.date ? new Date(event.date).toLocaleDateString() : 'Date required'}
                    </p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    event.type === 'exam' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {event.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
