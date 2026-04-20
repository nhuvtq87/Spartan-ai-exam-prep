import { GoogleGenAI, Type, Part, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { Flashcard, QuizQuestion, StudyEvent, FAQItem, SimplifiedConcept, CourseMaterial, Note } from "../types";

let aiInstance: GoogleGenAI | null = null;
let openaiInstance: OpenAI | null = null;

function getGemini() {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY1;
    if (!apiKey) {
      throw new Error("Gemini API key is missing. Please set API_KEY or GEMINI_API_KEY1.");
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
const MAX_ITEM_CONTEXT = 30000; // Increased context window for Gemini 3

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

/**
 * Failover wrapper to handle Gemini errors by falling back to OpenAI.
 */
async function callWithFailover(geminiCall: () => Promise<string>, openaiCall: () => Promise<string>): Promise<string> {
  try {
    return await geminiCall();
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";
    
    // Check for 5xx errors or 429
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
  const prompt = `Generate a deck of ${count} high-yield flashcards. Focus on critical SJSU course terminology, core theories, and complex academic relationships found in the docs.`;
  
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
  const prompt = `Create a rigorous ${count}-question San Jose State University practice exam based strictly on the provided material. Ensure questions mapping to Bloom's Taxonomy levels of understanding, application, and analysis.`;
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts: [...contextToParts(materials, notes), { text: prompt }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
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
  const prompt = "Extract all key academic dates. Identify which course each belongs to. DO NOT guess any due dates—extract ONLY what is written. Leave the 'date' field as empty string if vague.";
  
  const geminiCall = async () => {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
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
  const prompt = "Generate an FAQ based CORE SJSU academic knowledge required for an exam. Include dates found in the syllabus. Return as an array of items with category, question, and answer.";
  
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
    styleInstruction = `TONE: High-energy, gamer-centric. Metaphors: Mastered = Level Up, Boss Battles = Exams, Cheat Codes = Study Tips.`;
  } else if (level === "spartan") {
    styleInstruction = `TONE: SJSU Spartan Spirit. Focus on "Powering Silicon Valley" and academic grit.`;
  }

  const prompt = `Simplify this SJSU academic concept. Tone/Level: ${level}. ${styleInstruction} Concept: ${concept}`;
  
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

