import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = 3000;

// Setup Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// --- API ROUTES ---

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    const { prompt, patientData } = req.body;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePart = {
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    };

    const textPart = {
      text: `
        Analyze this medical image (X-ray or ultrasound). 
        Context: ${patientData}
        
        Provide your response in the following JSON format:
        {
          "diagnosis": "Summary of findings",
          "reasoning": "Scientific explanation of findings",
          "severity": "CRITICAL | MODERATE | STABLE",
          "confidence": number (0-1),
          "guidance": ["Step 1", "Step 2", ...],
          "triage_priority": "Immediate | Urgent | Non-urgent"
        }
        
        User Query: ${prompt || 'Perform a general diagnostic analysis.'}
      `,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedLens Edge server running on http://localhost:${PORT}`);
  });
}

startServer();
