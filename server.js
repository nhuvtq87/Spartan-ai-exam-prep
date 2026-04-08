import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. SET THE PORT FOR RENDER
const PORT = process.env.PORT || 10000;

// 2. SERVE YOUR VITE BUILD FILES
// This looks for the 'dist' folder that 'npm run build' creates
app.use(express.static(path.join(__dirname, 'dist')));

// 3. SAMPLE API ROUTE (You can add your Gemini logic here later)
app.get('/api/status', (req, res) => {
  res.json({ status: "Spartan AI is online" });
});

// 4. ROUTE EVERYTHING ELSE TO YOUR FRONTEND
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 5. START THE SERVER ON 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Spartan AI is live on port ${PORT}`);
});