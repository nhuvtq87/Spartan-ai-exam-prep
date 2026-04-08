
import React, { useState } from 'react';
import { CourseMaterial } from '../types';
import FileUpload from './FileUpload';

interface OnboardingViewProps {
  onComplete: (courseName: string, materials: CourseMaterial[]) => void;
  isProcessing: boolean;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, isProcessing }) => {
  const [step, setStep] = useState(1);
  const [courseName, setCourseName] = useState('');
  const [uploadedMaterials, setUploadedMaterials] = useState<CourseMaterial[]>([]);

  const handleNext = () => {
    if (step === 1 && courseName) {
      setStep(2);
    } else if (step === 2 && uploadedMaterials.length > 0) {
      onComplete(courseName, uploadedMaterials);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 animate-fadeIn">
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-12">
            <div className="flex space-x-2">
              {[1, 2].map(i => (
                <div 
                  key={i} 
                  className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= i ? 'bg-sjsu-blue' : 'bg-gray-100'}`}
                ></div>
              ))}
            </div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Step {step} of 2</span>
          </div>

          {step === 1 ? (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-gray-900 leading-tight">Welcome, Spartan.</h2>
                <p className="text-gray-500 text-lg">Let's set up your academic command center. What course are we conquering today?</p>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Course Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full p-6 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-sjsu-blue/10 outline-none text-xl font-bold text-sjsu-blue placeholder:text-gray-300 transition-all"
                  placeholder="e.g., CMPE 120: Computer Organization"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && courseName && handleNext()}
                />
              </div>

              <button 
                onClick={handleNext}
                disabled={!courseName}
                className={`w-full py-6 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center space-x-3 ${
                  courseName ? 'bg-sjsu-blue text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Initialize Course</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-gray-900 leading-tight">Feed the AI.</h2>
                <p className="text-gray-500 text-lg">Upload your syllabus, lecture notes, or slides for <span className="text-sjsu-blue font-bold">{courseName}</span>.</p>
              </div>

              <FileUpload 
                onUpload={(m) => setUploadedMaterials(prev => [...prev, ...m])} 
                isProcessing={isProcessing} 
              />

              {uploadedMaterials.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-sjsu-blue mb-2 flex items-center">
                    <i className="fa-solid fa-check-circle mr-2"></i>
                    {uploadedMaterials.length} Files Ready
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedMaterials.map(m => (
                      <span key={m.id} className="text-[10px] bg-white px-2 py-1 rounded border border-blue-200 text-gray-600 truncate max-w-[150px]">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-6 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleNext}
                  disabled={uploadedMaterials.length === 0 || isProcessing}
                  className={`flex-[2] py-6 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center space-x-3 ${
                    uploadedMaterials.length > 0 && !isProcessing ? 'bg-sjsu-gold text-sjsu-blue hover:scale-[1.02] shadow-yellow-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch Roadmap</span>
                      <i className="fa-solid fa-rocket"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-6 border-t border-gray-100 flex items-center justify-center space-x-8">
          <div className="flex items-center space-x-2 text-gray-400">
            <i className="fa-solid fa-shield-halved text-xs"></i>
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure RAG Pipeline</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400">
            <i className="fa-solid fa-bolt text-xs"></i>
            <span className="text-[10px] font-bold uppercase tracking-widest">Gemini 3.0 Pro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
