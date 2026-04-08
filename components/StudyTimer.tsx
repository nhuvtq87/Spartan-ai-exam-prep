
import React, { useState, useEffect, useRef } from 'react';
import { CourseMaterial, StudySession, Note } from '../types';

interface StudyTimerProps {
  materials: CourseMaterial[];
  notes: Note[];
  onSessionComplete: (session: StudySession) => void;
}

const StudyTimer: React.FC<StudyTimerProps> = ({ materials, notes, onSessionComplete }) => {
  const [workTime, setWorkTime] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const [timeLeft, setTimeLeft] = useState(workTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(materials[0]?.name || 'General Study');
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('25');
  const [manualSeconds, setManualSeconds] = useState('00');

  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotification = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      playNotification();
      if (isWorkMode) {
        onSessionComplete({
          id: Math.random().toString(36).substr(2, 9),
          subject: selectedSubject,
          durationMinutes: workTime,
          date: new Date().toISOString()
        });
        setIsWorkMode(false);
        setTimeLeft(breakTime * 60);
      } else {
        setIsWorkMode(true);
        setTimeLeft(workTime * 60);
      }
      setIsActive(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, isWorkMode, workTime, breakTime, onSessionComplete, selectedSubject]);

  const toggleTimer = () => {
    if (isEditing) handleSaveManualTime();
    setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setIsWorkMode(true);
    setTimeLeft(workTime * 60);
    setIsEditing(false);
  };

  const handlePreset = (mins: number) => {
    setIsActive(false);
    setWorkTime(mins);
    setTimeLeft(mins * 60);
    setIsWorkMode(true);
    setIsEditing(false);
  };

  const handleManualEdit = () => {
    if (isActive) setIsActive(false);
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    setManualMinutes(mins.toString().padStart(2, '0'));
    setManualSeconds(secs.toString().padStart(2, '0'));
    setIsEditing(true);
  };

  const handleSaveManualTime = () => {
    const mins = parseInt(manualMinutes) || 0;
    const secs = parseInt(manualSeconds) || 0;
    const totalSecs = (mins * 60) + Math.min(secs, 59);
    setTimeLeft(totalSecs);
    setIsEditing(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = isWorkMode ? workTime * 60 : breakTime * 60;
  const progress = Math.min(((totalDuration - timeLeft) / totalDuration) * 100, 100);

  const presets = [15, 25, 45, 60];

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-fadeIn pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Study Focus</h2>
          <p className="text-xs md:text-sm text-gray-500">Customize your session timing.</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-xl transition-all shadow-sm border ${
            showSettings ? 'bg-sjsu-blue text-white border-sjsu-blue' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
          }`}
        >
          <i className="fa-solid fa-gear"></i>
        </button>
      </div>

      {showSettings && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Default Work (Min)</label>
              <input 
                type="number" 
                min="1"
                value={workTime} 
                onChange={(e) => setWorkTime(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm font-bold focus:ring-2 focus:ring-sjsu-blue transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Default Break (Min)</label>
              <input 
                type="number" 
                min="1"
                value={breakTime} 
                onChange={(e) => setBreakTime(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm font-bold focus:ring-2 focus:ring-sjsu-blue transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Studying For</label>
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm font-bold focus:ring-2 focus:ring-sjsu-blue transition-all"
            >
              <option value="General Study">General Study</option>
              <optgroup label="Materials">
                {materials.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </optgroup>
              <optgroup label="Notes">
                {notes.map(n => <option key={n.id} value={n.title}>{n.title}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              workTime === p && isWorkMode
                ? 'bg-sjsu-gold text-sjsu-blue border-sjsu-gold shadow-md'
                : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
            }`}
          >
            {p}m
          </button>
        ))}
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col items-center space-y-8 relative overflow-hidden group">
        <div 
          className={`absolute top-0 left-0 h-1.5 transition-all duration-1000 ${isWorkMode ? 'bg-sjsu-blue' : 'bg-green-500'}`} 
          style={{ width: `${progress}%` }}
        ></div>
        
        <div className="text-center space-y-1">
          <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
            isWorkMode ? 'bg-blue-50 text-sjsu-blue' : 'bg-green-50 text-green-600'
          }`}>
            {isWorkMode ? 'Spartan Grind' : 'Recovery Phase'}
          </span>
          <h3 className="text-xs font-medium text-gray-400 italic truncate max-w-[240px] mt-2">{selectedSubject}</h3>
        </div>

        <div className="relative flex items-center justify-center">
            <svg className="w-56 h-56 md:w-72 md:h-72 transform -rotate-90">
                <circle 
                  cx="50%" cy="50%" r="45%" 
                  stroke="currentColor" strokeWidth="2" fill="transparent" 
                  className="text-gray-50"
                />
                <circle 
                  cx="50%" cy="50%" r="45%" 
                  stroke="currentColor" strokeWidth="8" fill="transparent" 
                  className={isWorkMode ? 'text-sjsu-blue/10' : 'text-green-500/10'} 
                />
                <circle 
                  cx="50%" cy="50%" r="45%" 
                  stroke="currentColor" strokeWidth="8" fill="transparent" 
                  className={isWorkMode ? 'text-sjsu-blue' : 'text-green-500'} 
                  strokeDasharray="283%" 
                  strokeDashoffset={`${283 - (283 * (100 - progress)) / 100}%`} 
                  strokeLinecap="round" 
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isEditing ? (
                <div className="flex items-center space-x-2 animate-fadeIn" onBlur={handleSaveManualTime}>
                  <input
                    autoFocus
                    type="text"
                    maxLength={2}
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value.replace(/\D/g, ''))}
                    className="w-20 text-4xl md:text-6xl font-black text-center bg-gray-100 rounded-xl focus:ring-2 focus:ring-sjsu-blue outline-none py-2"
                  />
                  <span className="text-4xl md:text-6xl font-black text-gray-300">:</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={manualSeconds}
                    onChange={(e) => setManualSeconds(e.target.value.replace(/\D/g, ''))}
                    className="w-20 text-4xl md:text-6xl font-black text-center bg-gray-100 rounded-xl focus:ring-2 focus:ring-sjsu-blue outline-none py-2"
                  />
                </div>
              ) : (
                <div 
                  onClick={handleManualEdit}
                  className="text-5xl md:text-7xl font-black text-gray-800 tabular-nums cursor-text hover:text-sjsu-blue transition-colors group-hover:scale-105 duration-300"
                >
                  {formatTime(timeLeft)}
                </div>
              )}
              {!isEditing && (
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit time
                </p>
              )}
              {isEditing && (
                <button 
                  onClick={handleSaveManualTime}
                  className="mt-4 px-4 py-1 bg-sjsu-blue text-white text-[10px] font-bold rounded-full"
                >
                  Apply Changes
                </button>
              )}
            </div>
        </div>

        <div className="flex items-center space-x-6">
          <button 
            onClick={resetTimer}
            className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all shadow-sm hover:shadow-md active:scale-90"
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
          
          <button 
            onClick={toggleTimer}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-[2rem] flex items-center justify-center text-2xl md:text-3xl shadow-xl transition-all active:scale-95 ${
              isActive 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                : 'bg-sjsu-blue text-white hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            <i className={`fa-solid ${isActive ? 'fa-pause' : 'fa-play'}`}></i>
          </button>

          <button 
            onClick={() => {
              setIsWorkMode(!isWorkMode);
              setTimeLeft(isWorkMode ? breakTime * 60 : workTime * 60);
              setIsActive(false);
            }}
            className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-sjsu-gold transition-all shadow-sm hover:shadow-md active:scale-90"
            title="Switch Mode"
          >
            <i className="fa-solid fa-shuffle"></i>
          </button>
        </div>
      </div>
      
      <div className="flex justify-center">
        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
          Focus is the key to the Spartan way
        </p>
      </div>
    </div>
  );
};

export default StudyTimer;
