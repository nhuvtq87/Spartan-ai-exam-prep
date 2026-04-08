
import React, { useState } from 'react';

interface LinkImporterProps {
  onImport: (url: string) => void;
  isProcessing: boolean;
  compact?: boolean;
}

const LinkImporter: React.FC<LinkImporterProps> = ({ onImport, isProcessing, compact }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !url.startsWith('http')) {
      alert("Please enter a valid URL (starting with http:// or https://)");
      return;
    }
    onImport(url);
    setUrl('');
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="w-full space-y-2">
        <div className="relative">
          <i className="fa-solid fa-link absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-300/40"></i>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Import Article Link"
            className="w-full pl-8 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none text-[11px] font-medium text-white placeholder:text-blue-200/30 focus:ring-1 focus:ring-sjsu-gold/50 transition-all"
            disabled={isProcessing}
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !url.trim()}
          className={`w-full py-2.5 bg-sjsu-gold text-sjsu-blue rounded-xl font-black text-[10px] uppercase tracking-wider transition-all hover:bg-yellow-500 shadow-lg flex items-center justify-center space-x-2 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? (
            <i className="fa-solid fa-spinner animate-spin"></i>
          ) : (
            <i className="fa-solid fa-bolt"></i>
          )}
          <span>{isProcessing ? 'Syncing...' : 'Import URL'}</span>
        </button>
      </form>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center space-y-4 text-center h-full">
      <div className="w-16 h-16 bg-gold-50 text-sjsu-gold rounded-full flex items-center justify-center">
        <i className="fa-solid fa-link text-2xl"></i>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Import Article Link</h3>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          Paste a link to an article, news piece, or academic paper to generate study materials instantly.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-sjsu-gold outline-none text-sm font-medium"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing || !url.trim()}
          className={`w-full px-8 py-3 bg-sjsu-gold text-sjsu-blue rounded-xl font-bold transition-all hover:bg-yellow-500 shadow-md flex items-center justify-center space-x-2 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? (
            <>
              <i className="fa-solid fa-spinner animate-spin"></i>
              <span>Spartan Syncing...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-bolt"></i>
              <span>Generate from Link</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default LinkImporter;
