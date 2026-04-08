
import React, { useRef } from 'react';
import { CourseMaterial } from '../types';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js using Vite's URL import
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface FileUploadProps {
  onUpload: (materials: CourseMaterial[]) => void;
  isProcessing: boolean;
  compact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isProcessing, compact }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * High-fidelity Word extractor (.docx)
   * Uses mammoth to convert document structure into clean raw text.
   */
  const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || "No text content found in Word document.";
    } catch (err) {
      console.error("Docx Error:", err);
      return "Failed to parse Word document. Please ensure it is a valid .docx file.";
    }
  };

  /**
   * High-fidelity PPTX extractor.
   * Parses XML namespaces to identify Titles, Body text, and Speaker Notes.
   */
  const extractTextFromPptx = async (file: File): Promise<string> => {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const parser = new DOMParser();
      let fullText = "";

      const slideFiles = Object.keys(zipContent.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml') && !name.includes('_rels')
      );

      slideFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.toString() || "0");
        const bNum = parseInt(b.match(/\d+/)?.toString() || "0");
        return aNum - bNum;
      });

      for (const slidePath of slideFiles) {
        const slideNum = slidePath.match(/\d+/)?.toString();
        const slideXmlText = await zipContent.files[slidePath].async("text");
        const slideDoc = parser.parseFromString(slideXmlText, "application/xml");
        
        let title = "";
        const shapes = slideDoc.getElementsByTagName("p:sp");
        for (let i = 0; i < shapes.length; i++) {
          const ph = shapes[i].getElementsByTagName("p:ph")[0];
          if (ph && (ph.getAttribute("type") === "title" || ph.getAttribute("type") === "ctrTitle")) {
            const textNodes = shapes[i].getElementsByTagName("a:t");
            title = Array.from(textNodes).map(t => t.textContent).join(" ").trim();
            break;
          }
        }
        
        if (!title) {
          const allTextNodes = slideDoc.getElementsByTagName("a:t");
          if (allTextNodes.length > 0) {
            title = allTextNodes[0].textContent?.trim() || "";
          }
        }

        const allSlideTextNodes = slideDoc.getElementsByTagName("a:t");
        const slideBody = Array.from(allSlideTextNodes)
          .map(t => t.textContent)
          .join(" ")
          .replace(/\s+/g, ' ')
          .trim();

        let notes = "";
        const relPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        if (zipContent.files[relPath]) {
          const relXmlText = await zipContent.files[relPath].async("text");
          const relDoc = parser.parseFromString(relXmlText, "application/xml");
          const rels = relDoc.getElementsByTagName("Relationship");
          
          for (let j = 0; j < rels.length; j++) {
            const target = rels[j].getAttribute("Target");
            if (target && target.includes("notesSlide")) {
              const notesPath = `ppt/` + target.replace('../', '');
              if (zipContent.files[notesPath]) {
                const notesXmlText = await zipContent.files[notesPath].async("text");
                const notesDoc = parser.parseFromString(notesXmlText, "application/xml");
                const notesTextNodes = notesDoc.getElementsByTagName("a:t");
                notes = Array.from(notesTextNodes)
                  .map(t => t.textContent)
                  .join(" ")
                  .trim();
              }
              break;
            }
          }
        }

        fullText += `[SLIDE ${slideNum}]\n`;
        fullText += `TITLE: ${title || "No Title Found"}\n`;
        fullText += `CONTENT: ${slideBody}\n`;
        if (notes) {
          fullText += `SPEAKER NOTES: ${notes}\n`;
        }
        fullText += `----------------------------\n\n`;
      }

      return fullText || "No readable text content found in this presentation.";
    } catch (err) {
      console.error("PPTX Extraction Error:", err);
      return "Failed to parse PowerPoint presentation.";
    }
  };

  /**
   * High-fidelity PDF extractor.
   * Extracts text from all pages of a PDF document.
   */
  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += `[PAGE ${i}]\n${pageText}\n\n`;
      }

      return fullText || "No readable text content found in this PDF.";
    } catch (err) {
      console.error("PDF Extraction Error:", err);
      return "Failed to parse PDF document.";
    }
  };

  /**
   * Best-effort text extraction for legacy binary formats (.doc, .ppt).
   * Scans the binary data for printable ASCII sequences.
   */
  const extractTextFromLegacy = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Extract printable chunks of 4+ characters to filter out binary noise
        const matches = content.match(/[ -~]{4,}/g);
        if (matches) {
          const extracted = matches.join(' ').replace(/\s+/g, ' ').trim();
          resolve(`[LEGACY FILE: ${file.name}]\nEXTRACTED CONTENT: ${extracted}`);
        } else {
          resolve(`No readable text content found in legacy binary file: ${file.name}`);
        }
      };
      reader.onerror = () => resolve(`Failed to read legacy binary file: ${file.name}`);
      reader.readAsText(file, 'ISO-8859-1');
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Process files in parallel
    const filePromises = Array.from(files).map(async (file: File): Promise<CourseMaterial | null> => {
      const fileName = file.name.toLowerCase();
      let content = "";
      let mimeType = file.type;

      try {
        if (fileName.endsWith('.pptx')) {
          content = await extractTextFromPptx(file);
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        } else if (fileName.endsWith('.docx')) {
          content = await extractTextFromDocx(file);
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileName.endsWith('.pdf')) {
          content = await extractTextFromPdf(file);
          mimeType = 'application/pdf';
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.ppt')) {
          content = await extractTextFromLegacy(file);
          mimeType = fileName.endsWith('.doc') ? 'application/msword' : 'application/vnd.ms-powerpoint';
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          const dataUrlPromise = new Promise<string>((resolve) => {
            reader.onload = (event) => resolve(event.target?.result as string);
          });
          reader.readAsDataURL(file);
          content = await dataUrlPromise;
        } else if (fileName.endsWith('.txt')) {
          return null;
        } else {
          const reader = new FileReader();
          const textPromise = new Promise<string>((resolve) => {
            reader.onload = (event) => resolve(event.target?.result as string);
          });
          reader.readAsText(file);
          content = await textPromise;
        }

        if (content) {
          const trimmedContent = content.trim();
          // Validation: check if text is not empty or exclusively whitespace and length < 100
          // Skip check for images as they are handled by vision
          if (!file.type.startsWith('image/') && trimmedContent.length < 100) {
            alert(`Error processing ${file.name}: Information is missing. The provided content is unreadable or contains no text data.`);
            return null;
          }

          return {
            id: crypto.randomUUID(),
            name: file.name,
            type: mimeType,
            content,
            mimeType: mimeType,
          };
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
      return null;
    });

    const results = await Promise.all(filePromises);
    const materials = results.filter((m): m is CourseMaterial => m !== null);

    if (materials.length > 0) {
      onUpload(materials);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (compact) {
    return (
      <div className="w-full">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".pdf,.pptx,.ppt,.docx,.doc,image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={`w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl transition-all flex items-center justify-center space-x-3 group ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? (
            <i className="fa-solid fa-spinner animate-spin text-xs"></i>
          ) : (
            <i className="fa-solid fa-cloud-arrow-up text-xs text-sjsu-gold group-hover:scale-110 transition-transform"></i>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {isProcessing ? 'Processing...' : 'Drop or Click'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center space-y-4 text-center">
      <div className="w-16 h-16 bg-blue-50 text-sjsu-blue rounded-full flex items-center justify-center">
        <i className="fa-solid fa-file-export text-2xl"></i>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Upload Course Material</h3>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          Upload PDF, Images, Word (DOC/DOCX), or PowerPoint (PPT/PPTX) for study generation.
        </p>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".pdf,.pptx,.ppt,.docx,.doc,image/*"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={`px-8 py-3 bg-sjsu-blue text-white rounded-xl font-medium transition-all hover:bg-blue-700 shadow-md flex items-center space-x-2 ${
          isProcessing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isProcessing ? (
          <>
            <i className="fa-solid fa-spinner animate-spin"></i>
            <span>Processing Academic Data...</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-plus"></i>
            <span>Add Files</span>
          </>
        )}
      </button>
      <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold mt-4">
        Supports legacy DOC/PPT with best-effort extraction
      </p>
    </div>
  );
};

export default FileUpload;
