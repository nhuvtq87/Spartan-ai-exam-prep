
import React, { useState } from 'react';
import { Note } from '../types';

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ notes, onAddNote, onUpdateNote, onDeleteNote }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', course: '' });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content) return;

    const note: Note = {
      id: crypto.randomUUID(),
      title: newNote.title,
      content: newNote.content,
      course: newNote.course,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onAddNote(note);
    setNewNote({ title: '', content: '', course: '' });
    setIsAdding(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title || !editingNote.content) return;

    onUpdateNote({
      ...editingNote,
      updatedAt: Date.now(),
    });
    setEditingNote(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Study Notes</h2>
          <p className="text-gray-500">Your thoughts, organized: Bridging the gap between AI insights and personal mastery.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-sjsu-blue text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2"
        >
          <i className="fa-solid fa-plus"></i>
          <span>New Note</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl border-2 border-sjsu-gold shadow-xl animate-fadeIn">
          <h3 className="text-xl font-bold mb-6 text-sjsu-blue">Create New Note</h3>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</label>
                <input
                  required
                  type="text"
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                  value={newNote.title}
                  onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="e.g., Lecture 5: Neural Networks"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Course (Optional)</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                  value={newNote.course}
                  onChange={e => setNewNote({ ...newNote, course: e.target.value })}
                  placeholder="e.g., CS 157A"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Content</label>
              <textarea
                required
                rows={6}
                className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                value={newNote.content}
                onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Type your notes here..."
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-sjsu-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Edit Note</h3>
              <button onClick={() => setEditingNote(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</label>
                  <input
                    required
                    type="text"
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                    value={editingNote.title}
                    onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Course</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                    value={editingNote.course || ''}
                    onChange={e => setEditingNote({ ...editingNote, course: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Content</label>
                <textarea
                  required
                  rows={10}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-blue outline-none text-sm"
                  value={editingNote.content}
                  onChange={e => setEditingNote({ ...editingNote, content: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sjsu-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Update Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-note-sticky text-3xl text-gray-300"></i>
            </div>
            <p className="text-gray-500 font-medium">No notes yet. Start capturing your knowledge!</p>
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800 truncate pr-8">{note.title}</h4>
                  {note.course && (
                    <span className="text-[10px] font-bold text-sjsu-blue bg-blue-50 px-2 py-0.5 rounded">
                      {note.course}
                    </span>
                  )}
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-6 right-6">
                  <button
                    onClick={() => setEditingNote(note)}
                    className="p-1.5 text-gray-400 hover:text-sjsu-blue"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-4 mb-4">
                {note.content}
              </p>
              <div className="flex items-center text-[10px] text-gray-400 font-medium">
                <i className="fa-regular fa-clock mr-1"></i>
                Updated {new Date(note.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesView;
