const backupEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_API_KEY1: process.env.GEMINI_API_KEY1,
  NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};

console.log('SERVER STARTUP - Initial environment keys:', {
  GEMINI_API_KEY: !!backupEnv.GEMINI_API_KEY,
  GEMINI_API_KEY_prefix: backupEnv.GEMINI_API_KEY?.substring(0, 8),
  VITE_GEMINI_API_KEY: !!backupEnv.VITE_GEMINI_API_KEY,
  VITE_GEMINI_API_KEY_prefix: backupEnv.VITE_GEMINI_API_KEY?.substring(0, 8),
});

import dotenv from 'dotenv';
dotenv.config({ override: true });

import fs from 'fs';
if (fs.existsSync('/app/.dev.env.json')) {
  try {
    const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
    for (const key in devEnv) {
      process.env[key] = devEnv[key];
    }
    console.log('Loaded fresh environment variables from /app/.dev.env.json');
  } catch (e) {
    console.error('Failed to load /app/.dev.env.json', e);
  }
}

console.log('SERVER STARTUP - After dotenv load:', {
  GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
  GEMINI_API_KEY_prefix: process.env.GEMINI_API_KEY?.substring(0, 8),
});

// Restore backed up keys if they are missing or empty strings after dotenv loads
for (const key of Object.keys(backupEnv) as (keyof typeof backupEnv)[]) {
  if (backupEnv[key] && (!process.env[key] || process.env[key] === '')) {
    process.env[key] = backupEnv[key];
  }
}

console.log('SERVER STARTUP - After backup restore:', {
  GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
  GEMINI_API_KEY_prefix: process.env.GEMINI_API_KEY?.substring(0, 8),
});

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import * as geminiService from './services/geminiService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // CRITICAL: Port must be 3000 for the AI Studio environment
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // AI Generation Routes
  app.post('/api/ai/flashcards', async (req, res) => {
    try {
      const { materials, notes, count } = req.body;
      const flashcards = await geminiService.generateFlashcards(materials, notes, count);
      res.json(flashcards);
    } catch (error: any) {
      console.error("AI Flashcards Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/quiz', async (req, res) => {
    try {
      const { materials, notes, count } = req.body;
      const quiz = await geminiService.generateQuiz(materials, notes, count);
      res.json(quiz);
    } catch (error: any) {
      console.error("AI Quiz Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/faq', async (req, res) => {
    try {
      const { materials, notes } = req.body;
      const faqs = await geminiService.generateFAQMatrix(materials, notes);
      res.json(faqs);
    } catch (error: any) {
      console.error("AI FAQ Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/study-plan', async (req, res) => {
    try {
      const { materials, notes } = req.body;
      const plan = await geminiService.extractStudyPlan(materials, notes);
      res.json(plan);
    } catch (error: any) {
      console.error("AI Study Plan Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/simplify', async (req, res) => {
    try {
      const { concept, level } = req.body;
      const result = await geminiService.simplifyConcept(concept, level);
      res.json(result);
    } catch (error: any) {
      console.error("AI Simplify Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { query, materials, notes } = req.body;
      const response = await geminiService.chatWithContext(query, materials, notes);
      res.send(response);
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API routes go here
  app.get('/api/status', (req, res) => {
    res.json({ 
      status: "Spartan AI is online",
      environment: process.env.NODE_ENV || 'development',
      campus: "San Jose State University",
      version: "1.2.0",
      keys: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GEMINI_API_KEY_len: process.env.GEMINI_API_KEY?.length || 0,
        GEMINI_API_KEY_prefix: process.env.GEMINI_API_KEY?.substring(0, 8),
        GEMINI_API_KEY1: !!process.env.GEMINI_API_KEY1,
        NEXT_PUBLIC_GEMINI_API_KEY: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
      }
    });
  });

  // SJSU Academic Resources Endpoint
  app.get('/api/resources', (req, res) => {
    res.json({
      links: [
        { name: "SJSU King Library", url: "https://library.sjsu.edu/", description: "Research databases and academic journals." },
        { name: "SJSU Writing Center", url: "https://www.sjsu.edu/writingcenter/", description: "Help with academic writing and citations." },
        { name: "SJSU Peer Connections", url: "https://www.sjsu.edu/peerconnections/", description: "Tutoring and mentoring services." },
        { name: "SJSU Canvas", url: "https://sjsu.instructure.com/", description: "Official SJSU learning management system." },
        { name: "Spartan Study Room Booking", url: "https://sjsu.libcal.com/", description: "Book study spaces in the King Library." }
      ]
    });
  });

  // Placeholder for Study Analytics (Front-end currently handles state)
  app.get('/api/analytics/summary', (req, res) => {
    res.json({
      message: "Analytics are currently stored locally. Connect Firestore for cloud syncing.",
      features: ["Flashcard Mastery", "Quiz Performance", "Study Duration", "Topic Concentration"]
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Development mode: Use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve static files and handle SPA routing
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
