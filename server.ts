import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

// Standard 1: Top-level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface ContentPart {
  text: string;
}

interface ContentMessage {
  role: string;
  parts: ContentPart[];
}

/**
 * Resilient Gemini Content Generation with automated fallback ladder
 * Catches recoverable errors (503, 429, 404, 500) and advances down the ladder
 */
async function generateContentWithFallback(
  contents: ContentMessage[],
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string }> {
  const ai = getAIClient();
  let lastError: unknown = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: 0.7,
        },
      });

      const responseText = response.text || '';
      if (responseText) {
        return { text: responseText, modelUsed: modelName };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const msg = String(err?.message || '').toLowerCase();

      // Check if error is recoverable (rate limit, unavailable, internal, model not found)
      const isRecoverable =
        status === 429 ||
        status === 503 ||
        status === 500 ||
        status === 404 ||
        msg.includes('resource exhausted') ||
        msg.includes('unavailable') ||
        msg.includes('not found') ||
        msg.includes('quota');

      console.warn(`Attempt with model ${modelName} failed (${status || msg}). Recoverable: ${isRecoverable}`);

      if (!isRecoverable && status === 400 && !msg.includes('model')) {
        // Bad client request not related to model availability
        throw err;
      }
      // Continue to next model in ladder
    }
  }

  throw lastError || new Error('All fallback models in the ladder failed.');
}

// API Routes FIRST
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Gemini Reflections Journal Backend',
  });
});

/**
 * POST /api/gemini/reflect
 * Defensive payload ingestion with sanitization and fallback ladder
 */
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // Defensive payload ingestion with null-safe destructuring
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt : '';
    const prompt = rawPrompt.trim().slice(0, 10000);
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt content is required and cannot be empty.' });
    }

    const systemInstruction = `You are an empathetic, emotionally intelligent journaling companion and reflection guide.
Your purpose is to help the user unpack their thoughts, cultivate clarity, and explore solutions in their personal reflections.
The user has chosen mode: "${mode}".
Mode instructions:
- 'reflect': Provide thoughtful psychological reflections, validate their emotional experience, highlight cognitive patterns, and suggest 1-2 gentle inquiry questions.
- 'summarize': Synthesize the reflection into core themes, key takeaways, and emotional arc with concise bullet points.
- 'brainstorm': Provide constructive perspectives, creative alternatives, and new ways of framing the situation.
- 'action_items': Break down the user's dilemmas into clear, compassionate, bite-sized next steps.

Format your responses with clean Markdown. Use warm, respectful language. Avoid clinical detachment and avoid toxic positivity. Speak with gentle wisdom and clarity.`;

    // Format previous turns defensively
    const contents: ContentMessage[] = [];

    // Include valid history turns (capped at last 10 turns to maintain low latency)
    const recentHistory = history.slice(-10);
    for (const item of recentHistory) {
      if (item && typeof item === 'object' && typeof item.content === 'string' && item.content.trim()) {
        contents.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.content.trim().slice(0, 8000) }],
        });
      }
    }

    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const result = await generateContentWithFallback(contents, systemInstruction);

    // Derive a succinct suggested title if this is an early entry turn
    let suggestedTitle: string | undefined;
    if (history.length <= 1) {
      const words = prompt.split(/\s+/).slice(0, 6).join(' ');
      suggestedTitle = words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Reflection';
      if (suggestedTitle.length > 40) {
        suggestedTitle = suggestedTitle.slice(0, 40) + '...';
      }
    }

    res.json({
      response: result.text,
      modelUsed: result.modelUsed,
      suggestedTitle,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate reflection response from Gemini.',
    });
  }
});

// Vite middleware setup
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
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gemini Reflections Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
