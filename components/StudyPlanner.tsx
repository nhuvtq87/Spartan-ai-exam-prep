
import React, { useState, useMemo } from 'react';
import { StudyEvent } from '../types';

interface StudyPlannerProps {
  events: StudyEvent[];
  onAddEvent: (event: StudyEvent) => void;
  onUpdateEvent: (event: StudyEvent) => void;
  onDeleteEvent: (id: string) => void;
  onRemoveEvent?: (id: string) => void;
}

type SortOption = 'date' | 'course' | 'modified';

const StudyPlanner: React.FC<StudyPlannerProps> = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StudyEvent | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [newTask, setNewTask] = useState({
    title: '',
    date: '',
    course: '',
    type: 'review' as const,
    importance: 'medium' as const
  });

  // Helper for relative time
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const sortedEvents = useMemo(() => {
    const list = [...events];
    switch (sortBy) {
      case 'date':
        return list.sort((a, b) => {
          if (!a.date) return -1;
          if (!b.date) return 1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      case 'course':
        return list.sort((a, b) => (a.course || 'Uncategorized').localeCompare(b.course || 'Uncategorized'));
      case 'modified':
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
      default:
        return list;
    }
  }, [events, sortBy]);

  // Grouping logic for the Course view
  const groupedEvents = useMemo(() => {
    if (sortBy !== 'course') return null;
    const groups: Record<string, StudyEvent[]> = {};
    sortedEvents.forEach(e => {
      const key = e.course || 'General / Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [sortedEvents, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.date) return;

    onAddEvent({
      ...newTask,
      id: crypto.randomUUID(),
      updatedAt: Date.now()
    });
    
    setNewTask({ title: '', date: '', course: '', type: 'review', importance: 'medium' });
    setShowAddForm(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title || !editingEvent.date) return;

    onUpdateEvent({
      ...editingEvent,
      updatedAt: Date.now()
    });
    
    setEditingEvent(null);
  };

  const handleUpdateDate = (event: StudyEvent, date: string) => {
    onUpdateEvent({
      ...event,
      date,
      updatedAt: Date.now()
    });
  };

  const getImportanceColor = (importance: string, dateStr: string | undefined) => {
    if (!dateStr) return 'bg-gray-400';
    
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) return 'bg-red-500';
    
    switch (importance) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-400';
      default: return 'bg-green-400';
    }
  };

  const renderEventCard = (event: StudyEvent) => {
    const hasDate = !!event.date;
    const eventDate = hasDate ? new Date(event.date) : null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = (hasDate && eventDate) ? eventDate < today : false;
    const diffDays = (hasDate && eventDate) ? Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return (
      <div key={event.id} className="relative pl-10 group mb-6">
        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md flex items-center justify-center transition-all group-hover:scale-110 z-10 ${
            getImportanceColor(event.importance, event.date)
        }`}></div>
        
        <div className={`p-5 rounded-2xl border transition-all ${
          isOverdue 
            ? 'bg-gray-50 border-gray-200 opacity-60' 
            : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-sjsu-blue/20'
        }`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-bold text-gray-800 truncate">{event.title}</h4>
                        {hasDate && diffDays !== null && diffDays <= 3 && diffDays >= 0 && (
                          <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">URGENT</span>
                        )}
                        {!hasDate && (
                          <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded">PENDING SCHEDULE</span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {sortBy !== 'course' && event.course && (
                          <span className="text-[10px] font-bold text-sjsu-blue bg-blue-50 px-2 py-0.5 rounded">
                            {event.course}
                          </span>
                        )}
                        <div className="flex items-center">
                          <i className="fa-regular fa-calendar mr-1.5 text-gray-400"></i>
                          {hasDate && eventDate ? (
                            <span className="text-xs text-gray-500 font-medium">
                              {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <input 
                              type="date" 
                              className="text-xs p-1 bg-orange-50 border border-orange-100 rounded outline-none focus:ring-1 focus:ring-orange-300"
                              onChange={(e) => handleUpdateDate(event, e.target.value)}
                            />
                          )}
                        </div>
                        {sortBy === 'modified' && (
                          <span className="text-[10px] text-gray-400 italic">
                            Updated {getRelativeTime(event.updatedAt)}
                          </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                        <p className={`text-[10px] font-black uppercase ${
                          event.type === 'exam' ? 'text-red-500' : 
                          event.type === 'assignment' ? 'text-blue-500' : 'text-green-500'
                        }`}>{event.type}</p>
                        <p className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                          {!hasDate ? 'Action Required' : isOverdue ? 'Overdue' : diffDays === 0 ? 'Today' : `In ${diffDays}d`}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingEvent(event)}
                          className="p-1.5 text-gray-400 hover:text-sjsu-blue transition-colors"
                          title="Edit Task"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button 
                          onClick={() => onDeleteEvent(event.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete Task"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Edit Spartan Task</h3>
              <button onClick={() => setEditingEvent(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Title</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Course</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                    value={editingEvent.course || ''}
                    onChange={e => setEditingEvent({...editingEvent, course: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                    value={editingEvent.date}
                    onChange={e => setEditingEvent({...editingEvent, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                  <select 
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm font-semibold"
                    value={editingEvent.type}
                    onChange={e => setEditingEvent({...editingEvent, type: e.target.value as any})}
                  >
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="review">Review Session</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Importance</label>
                  <select 
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm font-semibold"
                    value={editingEvent.importance}
                    onChange={e => setEditingEvent({...editingEvent, importance: e.target.value as any})}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-sjsu-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Study Planner</h2>
          <p className="text-gray-500">Track and optimize your SJSU milestones.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Custom Segmented Control */}
            <div className="bg-white border border-gray-100 p-1 rounded-2xl shadow-sm flex">
                {[
                  { id: 'date', icon: 'fa-calendar-day', label: 'Due Date' },
                  { id: 'course', icon: 'fa-book-bookmark', label: 'Courses' },
                  { id: 'modified', icon: 'fa-clock-rotate-left', label: 'Modified' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as SortOption)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      sortBy === opt.id 
                        ? 'bg-sjsu-blue text-white shadow-md' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <i className={`fa-solid ${opt.icon}`}></i>
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
            </div>

            <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 font-bold transition-all shadow-lg active:scale-95 ${
                    showAddForm ? 'bg-gray-100 text-gray-600' : 'bg-sjsu-gold text-sjsu-blue'
                }`}
            >
                <i className={`fa-solid ${showAddForm ? 'fa-xmark' : 'fa-plus'}`}></i>
                <span>Task</span>
            </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-sjsu-gold shadow-xl animate-fadeIn">
          <h3 className="text-xl font-bold mb-6 text-sjsu-blue flex items-center">
            <i className="fa-solid fa-calendar-plus mr-2"></i>
            New Spartan Task
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Title</label>
              <input 
                required
                type="text" 
                placeholder="e.g., Midterm Prep"
                className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Course/Subject</label>
              <input 
                type="text" 
                placeholder="e.g., CMPE 120"
                className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                value={newTask.course}
                onChange={e => setNewTask({...newTask, course: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Date</label>
              <input 
                required
                type="date" 
                className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                value={newTask.date}
                onChange={e => setNewTask({...newTask, date: e.target.value})}
              />
              <p className="text-[10px] text-orange-500 font-bold animate-pulse">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                Select due date (Manual Input Required)
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Type</label>
              <select 
                className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm font-semibold"
                value={newTask.type}
                onChange={e => setNewTask({...newTask, type: e.target.value as any})}
              >
                <option value="exam">Exam</option>
                <option value="assignment">Assignment</option>
                <option value="review">Review Session</option>
              </select>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <button 
                type="submit"
                className="w-full py-3 bg-sjsu-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-bold flex items-center text-gray-800">
                <i className={`fa-solid mr-3 text-sjsu-blue ${
                  sortBy === 'date' ? 'fa-timeline' : sortBy === 'course' ? 'fa-layer-group' : 'fa-history'
                }`}></i>
                {sortBy === 'date' ? 'Study Roadmap' : sortBy === 'course' ? 'Grouped by Course' : 'Recent Updates'}
              </h3>
            </div>
            
            <div className="relative">
              {/* Vertical line only for date/modified view */}
              {sortBy !== 'course' && (
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gray-100"></div>
              )}

              {events.length === 0 ? (
                <div className="text-center py-24 text-gray-400">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-gray-200">
                    <i className="fa-solid fa-calendar-day text-3xl opacity-20"></i>
                  </div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No tasks active</p>
                  <p className="text-xs mt-1">Upload a syllabus or add a task manually.</p>
                </div>
              ) : sortBy === 'course' && groupedEvents ? (
                // Course Grouping View
                Object.entries(groupedEvents as Record<string, StudyEvent[]>).map(([course, courseEvents]) => (
                  <div key={course} className="mb-10 last:mb-0">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-2 h-2 rounded-full bg-sjsu-gold"></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">
                          {course} <span className="ml-2 text-[10px] bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{(courseEvents as StudyEvent[]).length}</span>
                        </h4>
                    </div>
                    <div className="relative pl-0">
                      {(courseEvents as StudyEvent[]).map(event => renderEventCard(event))}
                    </div>
                  </div>
                ))
              ) : (
                // Standard List View (Date or Modified)
                sortedEvents.map(event => renderEventCard(event))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-sjsu-blue text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="text-xl font-bold mb-4">Exam Readiness</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-200">Tasks Completed</span>
                      <span className="font-bold">{events.filter(e => new Date(e.date) < new Date()).length} / {events.length}</span>
                  </div>
                  <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sjsu-gold transition-all duration-1000" 
                        style={{ width: events.length > 0 ? `${(events.filter(e => new Date(e.date) < new Date()).length / events.length) * 100}%` : '0%' }}
                      ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-blue-800/50 p-3 rounded-xl text-center backdrop-blur-sm">
                          <p className="text-2xl font-black">{events.filter(e => e.type === 'exam').length}</p>
                          <p className="text-[10px] uppercase text-blue-200 font-bold">Upcoming Exams</p>
                      </div>
                      <div className="bg-blue-800/50 p-3 rounded-xl text-center backdrop-blur-sm">
                          <p className="text-2xl font-black">{events.filter(e => e.importance === 'high').length}</p>
                          <p className="text-[10px] uppercase text-blue-200 font-bold">High Priority</p>
                      </div>
                  </div>
               </div>
             </div>
             <i className="fa-solid fa-shield-halved absolute -right-6 -bottom-6 text-9xl text-white/5 rotate-12"></i>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <i className="fa-solid fa-sparkles text-sjsu-gold mr-2"></i>
              Spartan Wisdom
            </h3>
            <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                    <div className="mt-1 text-sjsu-gold"><i className="fa-solid fa-bullseye text-xs"></i></div>
                    <p className="text-xs text-gray-600 leading-relaxed">Organize by <span className="font-bold">Courses</span> to see subject-specific workloads.</p>
                </li>
                <li className="flex items-start space-x-3">
                    <div className="mt-1 text-sjsu-gold"><i className="fa-solid fa-brain text-xs"></i></div>
                    <p className="text-xs text-gray-600 leading-relaxed">Review sessions before exams can increase memory retention by up to 50%.</p>
                </li>
                <li className="flex items-start space-x-3">
                    <div className="mt-1 text-sjsu-gold"><i className="fa-solid fa-battery-half text-xs"></i></div>
                    <p className="text-xs text-gray-600 leading-relaxed">Sorting by <span className="font-bold">Modified</span> helps you find tasks you recently added or tweaked.</p>
                </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanner;
