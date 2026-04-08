
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * High-fidelity Word extractor (.docx)
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
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
 */
export const extractTextFromPptx = async (file: File): Promise<string> => {
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
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
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
 */
export const extractTextFromLegacy = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
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
