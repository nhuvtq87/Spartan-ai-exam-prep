import { GoogleGenAI, Type, Part } from "@google/genai";
import OpenAI from "openai";
import { Flashcard, QuizQuestion, StudyEvent, FAQItem, SimplifiedConcept, CourseMaterial, Note } from "../types";

let aiInstance: GoogleGenAI | null = null;
let openaiInstance: OpenAI | null = null;

function getGemini() {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing. Please set API_KEY or GEMINI_API_KEY.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

function getOpenAI() {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing. Failover to OpenAI failed.");
    }
    openaiInstance = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return openaiInstance;
}

/**
 * Converts CourseMaterial and Note arrays into Gemini-compatible Parts.
 * Implements streamlined RAG by truncating extremely large items to high-yield sections.
 */
const MAX_ITEM_CONTEXT = 20000; // ~5000 tokens per item limit for efficiency

const contextToParts = (materials: CourseMaterial[], notes: Note[] = []): Part[] => {
  const materialParts = materials.map(m => {
    if (m.content.startsWith('data:')) {
      const [header, data] = m.content.split(',');
      const mimeType = header.split(':')[1].split(';')[0];
      return {
        inlineData: {
          mimeType: mimeType,
          data: data
        }
      };
    }
    
    // Streamlined RAG: Truncate to the most relevant academic sections
    const content = m.content.length > MAX_ITEM_CONTEXT 
      ? m.content.substring(0, MAX_ITEM_CONTEXT) + "\n\n[... Remaining content truncated for processing efficiency ...]"
      : m.content;

    return { text: `File: ${m.name}\nContent:\n${content}` };
  });

  const noteParts = notes.map(n => {
    const content = n.content.length > MAX_ITEM_CONTEXT
      ? n.content.substring(0, MAX_ITEM_CONTEXT) + "\n\n[... Remaining content truncated ...]"
      : n.content;
    
    return { text: `Note Title: ${n.title}\nCourse: ${n.course || 'General'}\nContent:\n${content}` };
  });

  return [...materialParts, ...noteParts];
};

/**
 * Converts context to OpenAI messages format.
 */
const contextToMessages = (materials: CourseMaterial[], notes: Note[] = []) => {
  const content: any[] = [];
  materials.forEach(m => {
    if (m.content.startsWith('data:')) {
      content.push({ type: "image_url", image_url: { url: m.content } });
    } else {
      const text = m.content.length > MAX_ITEM_CONTEXT 
        ? m.content.substring(0, MAX_ITEM_CONTEXT) + "\n\n[... Remaining content truncated ...]"
        : m.content;
      content.push({ type: "text", text: `File: ${m.name}\nContent:\n${text}` });
    }
  });
  notes.forEach(n => {
    const text = n.content.length > MAX_ITEM_CONTEXT
      ? n.content.substring(0, MAX_ITEM_CONTEXT) + "\n\n[... Remaining content truncated ...]"
      : n.content;
    content.push({ type: "text", text: `Note Title: ${n.title}\nCourse: ${n.course || 'General'}\nContent:\n${text}` });
  });
  return content;
};

const SYSTEM_INSTRUCTION = `You are an expert SJSU academic tutor and document analyst. 

STRICT RULES FOR DATA PROCESSING:
1. NO EXTERNAL KNOWLEDGE: Use ONLY the provided material. If information is missing, say so.
2. NOISE FILTERING: Automatically identify and ignore repetitive headers, footers, page numbers, EBSCOhost copyright notices, and university timestamps. Focus ONLY on the core academic content.
3. HANDWRITING TRANSCRIPTION: If images or PDFs contain handwritten notes, whiteboard diagrams, or markups on tables, transcribe them with high fidelity and integrate them into the context.
4. MAIN CONTENT ONLY: Ignore navigation menus, ads, and UI boilerplate.
5. ERROR HANDLING: If the provided context is empty or states 'Failed to parse', do not attempt to generate content. Instead, return a JSON error object: { "error": "No academic data available" }.
6. NO AUTOMATIC TASK CREATION: Do NOT generate or suggest automatic entries for the Study Planner. The Study Planner is a MANUAL-ENTRY tool only. All dates, deadlines, and times found in the documents must be presented ONLY as informational text (e.g., in the FAQ Matrix or summaries) and never as structured task objects for automatic syncing.
7. PLAIN-TEXT ONLY: You are strictly forbidden from using Markdown formatting in your responses. Do not use bold (**), italics (*), headers (#), or any other Markdown symbols. Use standard Sentence Case for all text (do not use ALL CAPS for headers). For section titles, use plain text on its own line followed by a colon or a blank line. Use simple hyphens (-) for lists.

Your goal is to provide high-fidelity academic support based strictly on the user's uploaded materials.`;

/**
 * Failover wrapper to handle Gemini errors by falling back to OpenAI.
 */
async function callWithFailover(geminiCall: () => Promise<string>, openaiCall: () => Promise<string>): Promise<string> {
  try {
    return await geminiCall();
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";
    
    // Check for 503 (Service Unavailable) or 429 (Rate Limit)
    if (status === 503 || status === 429 || message.includes("503") || message.includes("429")) {
      console.warn("Gemini service issue detected. Backup Model Active (OpenAI).");
      return await openaiCall();
    }
    throw error;
  }
}

export const fetchLinkContent = async (url: string): Promise<{ text: string; sources: any[] }> => {
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the content of the article at this URL: ${url}. 
      STRICT RULE: Extract ONLY the main academic or informational content present on the page.`,
      config: { tools: [{ googleSearch: {} }] },
    });
    return JSON.stringify({ text: response.text, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] });
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Extract main academic content from the provided URL context." },
        { role: "user", content: `Analyze the content of the article at this URL: ${url}` }
      ]
    });
    return JSON.stringify({ text: response.choices[0].message.content, sources: [] });
  };

  const result = JSON.parse(await callWithFailover(geminiCall, openaiCall));
  return { text: result.text || "Could not extract content.", sources: result.sources || [] };
};

export const generateFlashcards = async (materials: CourseMaterial[], notes: Note[] = [], count: number = 15): Promise<Flashcard[]> => {
  const prompt = `Generate a deck of ${count} high-yield flashcards based on the provided materials. Focus on critical terminology, core theories, and complex relationships. Ensure questions use 'Active Recall' principles.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...contextToParts(materials, notes), { text: prompt }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["id", "question", "answer"]
              }
            },
            error: { type: Type.STRING }
          }
        }
      }
    });
    return response.text;
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: [{ type: "text", text: prompt }, ...contextToMessages(materials, notes)] }
      ],
      response_format: { type: "json_object" }
    });
    return response.choices[0].message.content || "{}";
  };

  const data = JSON.parse(await callWithFailover(geminiCall, openaiCall));
  if (data.error) throw new Error(data.error);
  return data.flashcards || [];
};

export const generateQuiz = async (materials: CourseMaterial[], notes: Note[] = [], count: number = 10): Promise<QuizQuestion[]> => {
  const prompt = `Create a rigorous ${count}-question multiple choice practice exam based strictly on the provided material. Cover core concepts, technical details, and potential 'trick' areas.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [...contextToParts(materials, notes), { text: prompt }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation"]
              }
            },
            error: { type: Type.STRING }
          }
        }
      }
    });
    return response.text;
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: [{ type: "text", text: prompt }, ...contextToMessages(materials, notes)] }
      ],
      response_format: { type: "json_object" }
    });
    return response.choices[0].message.content || "{}";
  };

  const data = JSON.parse(await callWithFailover(geminiCall, openaiCall));
  if (data.error) throw new Error(data.error);
  return data.questions || [];
};

export const extractStudyPlan = async (materials: CourseMaterial[], notes: Note[] = []): Promise<StudyEvent[]> => {
  const prompt = "Review these materials and extract all key exams and assignments. Identify which course/subject each belongs to. STRICT RULE: Extract ONLY the task description (title) and the course/subject name. DO NOT extract, parse, or guess any due dates. Leave the 'date' field as an empty string for all items.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...contextToParts(materials, notes), { text: prompt }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              type: { type: Type.STRING },
              importance: { type: Type.STRING },
              course: { type: Type.STRING }
            },
            required: ["id", "title", "date", "type", "importance"]
          }
        }
      }
    });
    return response.text;
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: [{ type: "text", text: prompt }, ...contextToMessages(materials, notes)] }
      ],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content || "[]";
    const parsed = JSON.parse(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : (parsed.events || parsed.studyPlan || []));
  };

  const data = JSON.parse(await callWithFailover(geminiCall, openaiCall));
  return data.map((item: any) => ({
    ...item,
    id: crypto.randomUUID(),
    updatedAt: Date.now()
  }));
};

export const generateFAQMatrix = async (materials: CourseMaterial[], notes: Note[] = []): Promise<FAQItem[]> => {
  const prompt = "Extract a list of 'Frequently Asked Questions' that represent the core knowledge required for an exam. ALSO, identify all critical dates, times, and deadlines (e.g., exam dates, assignment due dates) found in the materials and include them as FAQ items under a 'Deadlines & Schedule' category. Organize everything into an FAQ Matrix.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...contextToParts(materials, notes), { text: prompt }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              question: { type: Type.STRING },
              answer: { type: Type.STRING }
            },
            required: ["id", "category", "question", "answer"]
          }
        }
      }
    });
    return response.text;
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: [{ type: "text", text: prompt }, ...contextToMessages(materials, notes)] }
      ],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content || "[]";
    const parsed = JSON.parse(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : (parsed.faqs || []));
  };

  return JSON.parse(await callWithFailover(geminiCall, openaiCall));
};

export const simplifyConcept = async (concept: string, level: string = "simple"): Promise<SimplifiedConcept> => {
  let styleInstruction = "";
  if (level === "gaming") {
    styleInstruction = `
    TONE: High-energy, engaging, and gamer-centric.
    METAPHORS: Use gaming terminology to explain academic concepts.
    - Mastering a topic = "Leveling Up"
    - Difficult exams = "Boss Battles"
    - Core concepts = "Main Quests" or "Base Stats"
    - Useful tips/shortcuts = "Buffs" or "Cheat Codes"
    - Learning outcomes = "XP" or "Unlockables"
    - Distractions = "Lag" or "Side Quests"
    `;
  }

  const prompt = `Simplify the following academic concept. STRICT RULE: Use ONLY the information provided in the concept text below. 
  Tone/Level: ${level}. 
  ${styleInstruction}
  Concept: ${concept}`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            simpleExplanation: { type: Type.STRING },
            analogy: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["original", "simpleExplanation", "analogy", "keyTakeaways"]
        }
      }
    });
    return response.text;
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a concept simplifier." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return response.choices[0].message.content || "{}";
  };

  return JSON.parse(await callWithFailover(geminiCall, openaiCall));
};

export const chatWithContext = async (query: string, materials: CourseMaterial[], notes: Note[] = []) => {
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...contextToParts(materials, notes), { text: `Question: ${query}` }] },
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text;
  };

  const openaiCall = async () => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: [{ type: "text", text: `Question: ${query}` }, ...contextToMessages(materials, notes)] }
      ]
    });
    return response.choices[0].message.content || "I'm sorry, I couldn't process that.";
  };

  return await callWithFailover(geminiCall, openaiCall);
};

