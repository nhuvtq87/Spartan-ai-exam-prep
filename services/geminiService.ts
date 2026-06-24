import { GoogleGenAI, Type, Part } from "@google/genai";
import OpenAI from "openai";
import crypto from "crypto";
import { Flashcard, QuizQuestion, StudyEvent, FAQItem, SimplifiedConcept, CourseMaterial, Note } from "../types";

let aiInstance: GoogleGenAI | null = null;
let openaiInstance: OpenAI | null = null;

const isBrowser = typeof window !== 'undefined';

let activeKeyIndex = 0;

function getGemini(forceNext: boolean = false) {
  const candidateKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY
  ].filter((k): k is string => !!k && !k.startsWith('MY_G'));

  if (candidateKeys.length === 0) {
    console.error("SERVER ERROR: No GEMINI_API_KEY is found in environment.");
    throw new Error("Gemini API key is missing or invalid. Please check your settings.");
  }

  if (forceNext) {
    activeKeyIndex = (activeKeyIndex + 1) % candidateKeys.length;
    aiInstance = null; // force re-creation
  }

  if (!aiInstance) {
    const apiKey = candidateKeys[activeKeyIndex];
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

async function executeGeminiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  const candidateKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY
  ].filter((k): k is string => !!k && !k.startsWith('MY_G'));

  let attempts = 0;
  const maxAttempts = Math.max(1, candidateKeys.length);

  while (attempts < maxAttempts) {
    try {
      return await apiCall();
    } catch (error: any) {
      const message = error?.message || "";
      const status = error?.status || error?.response?.status;
      
      const isKeyError = message.includes("leaked") || 
                         message.includes("API key not valid") || 
                         message.includes("INVALID_ARGUMENT") ||
                         message.includes("PERMISSION_DENIED") ||
                         status === 403 || 
                         status === 400;

      if (isKeyError && candidateKeys.length > 1 && attempts < maxAttempts - 1) {
        console.warn(`Gemini API key error detected: ${message}. Rotating key...`);
        getGemini(true); // Rotate to the next key and recreate aiInstance
        attempts++;
      } else {
        throw error;
      }
    }
  }
  return await apiCall(); // fallback final try
}

/**
 * Converts CourseMaterial and Note arrays into Gemini-compatible Parts.
 */
const MAX_ITEM_CONTEXT = 30000;

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

const SYSTEM_INSTRUCTION = `You are "Spartan AI," a premier academic concierge for San Jose State University students. 

STRICT RULES FOR DATA PROCESSING:
1. NO EXTERNAL KNOWLEDGE: Use ONLY the provided material. If information is missing, explicitly state "This information is not present in your local coursework."
2. NOISE FILTERING: Automatically identify and ignore repetitive headers, footers, page numbers, and university UI boilerplate. focus on syllabi, lecture notes, and assignment prompts.
3. SJSU CONTEXT: When possible, reference SJSU-specific resources (e.g., King Library, SJSU Writing Center, Peer Connections) if the user's materials mention them.
4. MAIN CONTENT ONLY: Ignore navigation menus and ads from pasted web links.
5. ERROR HANDLING: If the provided context is empty or states 'Failed to parse', return a JSON error object: { "error": "No academic data available" }.
6. NO AUTOMATIC TASK CREATION: All dates, deadlines, and times found in the documents must be presented ONLY as informational text.
7. FORMATTING: Use clear, scannable structures. Forbidden from using ALL CAPS for headers. Use simple hyphens (-) for lists.
8. PEDAGOGY: Prefer "Socratic" guidance in Chat mode—help students find the answer rather than just giving it.

Your goal is to provide high-fidelity academic support based strictly on the user's uploaded materials while maintaining the helpful, focused identity of an SJSU Spartan Tutor.`;

async function callWithFailover(geminiCall: () => Promise<string>, openaiCall: () => Promise<string>): Promise<string> {
  try {
    return await executeGeminiCall(geminiCall);
  } catch (error: any) {
    console.warn("Gemini execution failed with all keys. Attempting failover to OpenAI.", error.message || error);
    try {
      return await openaiCall();
    } catch (openaiErr: any) {
      console.error("OpenAI backup failover also failed:", openaiErr.message || openaiErr);
      throw error; // throw original Gemini error if OpenAI also fails
    }
  }
}

export const fetchLinkContent = async (url: string): Promise<{ text: string; sources: any[] }> => {
  if (isBrowser) {
    const res = await fetch('/api/ai/fetch-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error("Failed to fetch link content via server.");
    return res.json();
  }

  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [{ text: `Analyze the content of the article at this URL: ${url}. 
      STRICT RULE: Extract ONLY the main academic or informational content present on the page.` }]
      },
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
  if (isBrowser) {
    const res = await fetch('/api/ai/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, notes, count })
    });
    if (!res.ok) throw new Error("Failed to generate flashcards via server.");
    return res.json();
  }

  const prompt = `Generate a deck of ${count} high-yield flashcards. Focus on critical SJSU course terminology, core theories, and complex academic relationships found in the docs.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [...contextToParts(materials, notes), { text: prompt }]
      },
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
  if (isBrowser) {
    const res = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, notes, count })
    });
    if (!res.ok) throw new Error("Failed to generate quiz via server.");
    return res.json();
  }

  const prompt = `Create a rigorous ${count}-question San Jose State University practice exam based strictly on the provided material. Ensure questions mapping to Bloom's Taxonomy levels of understanding, application, and analysis.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [...contextToParts(materials, notes), { text: prompt }]
      },
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
  if (isBrowser) {
    const res = await fetch('/api/ai/study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, notes })
    });
    if (!res.ok) throw new Error("Failed to extract study plan via server.");
    return res.json();
  }

  const prompt = "Extract all key academic dates. Identify which course each belongs to. DO NOT guess any due dates—extract ONLY what is written. Leave the 'date' field as empty string if vague.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [...contextToParts(materials, notes), { text: prompt }]
      },
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
  if (isBrowser) {
    const res = await fetch('/api/ai/faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, notes })
    });
    if (!res.ok) throw new Error("Failed to generate FAQ Matrix via server.");
    return res.json();
  }

  const prompt = "Generate an FAQ based CORE SJSU academic knowledge required for an exam. Include dates found in the syllabus. Return as an array of items with category, question, and answer.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [...contextToParts(materials, notes), { text: prompt }]
      },
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
  if (isBrowser) {
    const res = await fetch('/api/ai/simplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept, level })
    });
    if (!res.ok) throw new Error("Failed to simplify concept via server.");
    return res.json();
  }

  let styleInstruction = "";
  if (level === "gaming") {
    styleInstruction = `TONE: High-energy, gamer-centric. Metaphors: Mastered = Level Up, Boss Battles = Exams, Cheat Codes = Study Tips.`;
  } else if (level === "spartan") {
    styleInstruction = `TONE: SJSU Spartan Spirit. Focus on "Powering Silicon Valley" and academic grit.`;
  }

  const prompt = `Simplify this SJSU academic concept. Tone/Level: ${level}. ${styleInstruction} Concept: ${concept}`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
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
  if (isBrowser) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, materials, notes })
    });
    if (!res.ok) throw new Error("Failed to chat via server.");
    return res.text();
  }

  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [...contextToParts(materials, notes), { text: `Question: ${query}` }]
      },
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

