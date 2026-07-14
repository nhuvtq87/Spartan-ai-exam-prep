import { GoogleGenAI, Type, Part } from "@google/genai";
import OpenAI from "openai";
import crypto from "crypto";
import { logger } from '../src/utils/logger';
import { Flashcard, QuizQuestion, StudyEvent, FAQItem, SimplifiedConcept, CourseMaterial, Note } from "../types";

let aiInstance: GoogleGenAI | null = null;
let openaiInstance: OpenAI | null = null;

const isBrowser = typeof window !== 'undefined';

async function handleResponse(res: Response, defaultMessage: string) {
  if (!res.ok) {
    let errMsg = defaultMessage;
    try {
      const data = await res.json();
      if (data && data.error) {
        errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

async function handleTextResponse(res: Response, defaultMessage: string) {
  if (!res.ok) {
    let errMsg = defaultMessage;
    try {
      const data = await res.json();
      if (data && data.error) {
        errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.text();
}

let currentModel = 'gemini-3.5-flash';

export function getCurrentModel() {
  return currentModel;
}

export function setCurrentModel(model: string) {
  currentModel = model;
}

let activeKeyIndex = 0;

function getGemini(forceNext: boolean = false) {
  const candidateKeys = Array.from(new Set([
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY
  ])).filter((k): k is string => !!k);

  console.log('--- getGemini() called ---');
  console.log('Resolved candidate keys prefixes:', candidateKeys.map(k => k.substring(0, 8)));

  if (candidateKeys.length === 0) {
    console.error("SERVER ERROR: No GEMINI_API_KEY is found in environment.");
    throw new Error("Gemini API key is missing or invalid. Please check your settings.");
  }

  if (activeKeyIndex >= candidateKeys.length) {
    activeKeyIndex = 0;
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
  const candidateKeys = Array.from(new Set([
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY
  ])).filter((k): k is string => !!k);

  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  let modelIndex = 0;
  
  let keyAttempts = 0;
  const maxKeyAttempts = Math.max(1, candidateKeys.length);

  while (modelIndex < modelsToTry.length && keyAttempts < maxKeyAttempts) {
    // Dynamically update the currentModel for this iteration
    currentModel = modelsToTry[modelIndex];

    try {
      logger.debug(`Initiating API request`, { model: currentModel, attempt: modelIndex + keyAttempts });
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

      // Robust check for 503/429 or UNAVAILABLE error representation
      const errStr = (error?.message || "") + " " + String(error) + " " + JSON.stringify(error);
      const isUnavailable = errStr.includes("high demand") ||
                            errStr.includes("UNAVAILABLE") ||
                            errStr.includes("503") ||
                            errStr.includes("429") ||
                            status === 503 ||
                            status === 429;

      if (isUnavailable) {
        const previousModel = currentModel;
        modelIndex++;
        if (modelIndex < modelsToTry.length) {
          currentModel = modelsToTry[modelIndex];
          logger.info(`Upstream model demand spike detected. Activating fallback pathway.`, {
            sourceModel: previousModel,
            nextModel: currentModel,
            statusCode: status,
            reason: "Model unavailable or rate limited"
          });
          continue;
        } else {
          logger.error(`Failover pipeline exhausted. All fallback pathways failed.`, {
            initialModel: modelsToTry[0],
            exhaustedModels: modelsToTry
          });
          if (errStr.includes("429") || errStr.includes("quota") || status === 429) {
            throw new Error("AI API Quota exceeded. Please check your API key billing details and limits.");
          }
        }
      }

      if (isKeyError && candidateKeys.length > 1 && keyAttempts < maxKeyAttempts - 1) {
        logger.warn(`Gemini API key error detected: ${message}. Rotating key...`);
        getGemini(true); // Rotate to the next key and recreate aiInstance
        keyAttempts++;
      } else {
        logger.error(`Unmanageable API exception encountered`, { statusCode: status, error: message });
        if (errStr.includes("429") || errStr.includes("quota") || status === 429) {
          throw new Error("AI API Quota exceeded. Please check your API key billing details and limits.");
        }
        throw error;
      }
    }
  }

  // Final fallback try using the last stable model if we somehow loop through
  currentModel = modelsToTry[modelsToTry.length - 1];
  try {
    return await apiCall();
  } catch (e: any) {
    if (String(e).includes("429") || String(e).includes("quota")) {
      throw new Error("AI API Quota exceeded. Please check your API key billing details and limits.");
    }
    throw e;
  }
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

const SYSTEM_INSTRUCTION = `You are "Spartan AI," an academic assistant. 

STRICT RULES FOR DATA PROCESSING:
1. KNOWLEDGE AND CITATION BOUNDARIES: Ground all conceptual explanations strictly in the provided material. Do not reference textbook chapters, page numbers, or specific terms (like 'Virtual Method Table') unless you have explicitly verified they exist in the provided text. If information is missing, state "This information is not present in your local coursework." However, if the user explicitly asks you to generate something new (like a C++ program demonstrating a concept), you MUST fulfill that request fully and provide the code/implementation, rather than just a conceptual explanation.
2. DIRECT ANSWERS & NO FLUFF: Answer the prompt directly and completely. Do NOT include conversational filler, Spartan AI introductions, tutoring recommendations, or unsolicited Socratic follow-up questions. When acting as a tutor, provide deep-knowledge, rigorous answers appropriate for college students.
3. NOISE FILTERING: Automatically identify and ignore repetitive headers, footers, page numbers, and university UI boilerplate. focus on syllabi, lecture notes, and assignment prompts.
4. MAIN CONTENT ONLY: Ignore navigation menus and ads from pasted web links. For books and any other uploaded material, skip the content from the preface, table of contents, or any unrelated context from the lesson.
5. ERROR HANDLING: If the provided context is empty or states 'Failed to parse', return a JSON error object: { "error": "No academic data available" }.
6. NO AUTOMATIC TASK CREATION: All dates, deadlines, and times found in the documents must be presented ONLY as informational text.
7. FORMATTING: Use clear, scannable structures. Forbidden from using ALL CAPS for headers. Use simple hyphens (-) for lists. DO NOT USE LaTeX formatting for math or any other text. Always use plain text, standard numbers, and simple keyboard characters (e.g., use "x^2" instead of LaTeX "$x^2$", and "degrees" instead of "^\\circ$").

CRITICAL BEHAVIOR RULE:
Never generate LaTeX or markdown math blocks. All math and formulas must be written in plain text format that is readable without a math renderer.
Here are examples of correct formatting:
User: Solve for x: x^2 - 4 = 0
Model: To solve x^2 - 4 = 0, we can factor it as (x-2)(x+2) = 0. Therefore, x = 2 or x = -2.
User: What is the formula for the area of a circle?
Model: The area is given by the formula A = pi * r^2, where pi is approximately 3.14 and r is the radius.

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
      throw new Error(`Gemini Error: ${error.message}. OpenAI Failover Error: ${openaiErr.message}`); // throw both errors
    }
  }
}

function parseJSON(str: string) {
  try {
    let cleaned = str.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      cleaned = match[1].trim();
    }
    return JSON.parse(cleaned);
  } catch (e: any) {
    throw new Error(`Failed to parse JSON response: ${e.message}. Raw output: ${str.substring(0, 100)}...`);
  }
}

export const generateFlashcards = async (materials: CourseMaterial[], notes: Note[] = [], count: number = 50): Promise<Flashcard[]> => {
  if (isBrowser) {
    const res = await fetch('/api/ai/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, notes, count })
    });
    return handleResponse(res, "Failed to generate flashcards via server.");
  }

  const prompt = `Generate a deck of ${count} high-yield flashcards. Focus on critical SJSU course terminology, core theories, and complex academic relationships found in the docs.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: getCurrentModel(),
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

  const data = parseJSON(await callWithFailover(geminiCall, openaiCall));
  if (data.error) throw new Error(data.error);
  return data.flashcards || [];
};

export const generateQuiz = async (materials: CourseMaterial[], notes: Note[] = [], count: number = 50): Promise<QuizQuestion[]> => {
  if (isBrowser) {
    const res = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, notes, count })
    });
    return handleResponse(res, "Failed to generate quiz via server.");
  }

  const prompt = `Create a rigorous ${count}-question San Jose State University practice exam based strictly on the provided material. Ensure questions mapping to Bloom's Taxonomy levels of understanding, application, and analysis.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: getCurrentModel(),
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

  const data = parseJSON(await callWithFailover(geminiCall, openaiCall));
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
    return handleResponse(res, "Failed to extract study plan via server.");
  }

  const prompt = "Extract all key academic dates. Identify which course each belongs to. DO NOT guess any due dates—extract ONLY what is written. Leave the 'date' field as empty string if vague.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: getCurrentModel(),
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
    const parsed = parseJSON(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : (parsed.events || parsed.studyPlan || []));
  };

  const data = parseJSON(await callWithFailover(geminiCall, openaiCall));
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
    return handleResponse(res, "Failed to generate FAQ Matrix via server.");
  }

  const prompt = "Generate an FAQ based CORE SJSU academic knowledge required for an exam. Include dates found in the syllabus. Return as an array of items with category, question, and answer.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: getCurrentModel(),
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
    const parsed = parseJSON(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : (parsed.faqs || []));
  };

  return parseJSON(await callWithFailover(geminiCall, openaiCall));
};

export const simplifyConcept = async (concept: string, level: string = "simple"): Promise<SimplifiedConcept> => {
  if (isBrowser) {
    const res = await fetch('/api/ai/simplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept, level })
    });
    return handleResponse(res, "Failed to simplify concept via server.");
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
      model: getCurrentModel(),
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

  return parseJSON(await callWithFailover(geminiCall, openaiCall));
};

export const chatWithContext = async (query: string, materials: CourseMaterial[], notes: Note[] = []) => {
  if (isBrowser) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, materials, notes })
    });
    return handleTextResponse(res, "Failed to chat via server.");
  }

  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: getCurrentModel(),
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

