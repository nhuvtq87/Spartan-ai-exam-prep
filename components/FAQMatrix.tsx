
import React, { useState } from 'react';
import { FAQItem, CourseMaterial } from '../types';
import FileUpload from './FileUpload';

interface FAQMatrixProps {
  faqs: FAQItem[];
  materials: CourseMaterial[];
  isProcessing: boolean;
  onRegenerate: () => void;
}

const FAQMatrix: React.FC<FAQMatrixProps> = ({ faqs, materials, isProcessing, onRegenerate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(faqs.map((f) => f.category)));

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? faq.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

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

  if (faqs.length === 0) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 bg-white rounded-3xl shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-50 text-sjsu-blue rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-clipboard-list text-3xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Generate FAQ Matrix</h3>
          <p className="text-gray-500 mt-2 mb-8 max-w-sm">Ready to extract the core concept knowledge base from your study materials.</p>
          
          <button
            onClick={onRegenerate}
            disabled={isProcessing}
            className="px-12 py-4 bg-sjsu-blue text-white rounded-2xl font-black shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-3"
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                <span>Extracting Knowledge...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Generate FAQ Matrix</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">FAQ Matrix</h2>
          <p className="text-sm text-gray-500">Core concept knowledge base extracted from your study materials.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={onRegenerate}
            disabled={isProcessing}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-xs font-bold text-sjsu-blue hover:bg-gray-50 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <i className={`fa-solid fa-arrows-rotate ${isProcessing ? 'animate-spin' : ''}`}></i>
            <span>Regenerate Matrix</span>
          </button>
          <div className="relative w-full md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-sjsu-blue outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            selectedCategory === null 
              ? 'bg-sjsu-blue text-white shadow-md' 
              : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
          }`}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedCategory === cat 
                ? 'bg-sjsu-blue text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-sjsu-gold bg-sjsu-gold/10 px-2 py-1 rounded">
                {faq.category}
              </span>
              <i className="fa-solid fa-circle-question text-gray-100 group-hover:text-sjsu-blue/20 transition-colors text-2xl"></i>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-3 leading-tight">{faq.question}</h4>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-sjsu-blue/10 rounded-full"></div>
              <p className="pl-4 text-sm text-gray-600 leading-relaxed italic">{faq.answer}</p>
            </div>
          </div>
        ))}
        
        {filteredFaqs.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            <i className="fa-solid fa-ban text-4xl mb-2 opacity-20"></i>
            <p>No matches found for your search terms.</p>
          </div>
        )}
      </div>

      <div className="pt-8 border-t border-gray-100">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-gray-800">Expand Knowledge Base</h4>
          <p className="text-xs text-gray-500">Upload more notes to generate more FAQs.</p>
        </div>
      </div>
    </div>
  );
};

export default FAQMatrix;
