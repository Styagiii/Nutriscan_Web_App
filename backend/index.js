const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rag = require('./rag');

const app = express();
const PORT = process.env.PORT || 5000;

const LLM_PROVIDER = 'gemini';
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || GEMINI_TEXT_MODEL;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

if (GEMINI_API_KEY) {
  rag.setGeminiKey(GEMINI_API_KEY);
}

function profileToString(profile) {
  if (!profile || typeof profile !== 'object') return 'Not provided';
  return `Age: ${profile.age || 'Not provided'}, Weight: ${profile.weight || 'Not provided'} kg, Height: ${profile.height || 'Not provided'} cm, Diet goal: ${profile.diet || 'Not provided'}`;
}

function normalizeBase64Image(imageBase64) {
  if (typeof imageBase64 !== 'string') return '';

  const trimmed = imageBase64.trim();
  const match = trimmed.match(/^data:[^;]+;base64,(.*)$/i);
  const base64 = match ? match[1] : trimmed;

  return base64.replace(/\s+/g, '');
}

function getGeminiModel(model) {
  if (!genAI) throw new Error('GEMINI_API_KEY missing in backend/.env');
  return genAI.getGenerativeModel({ model });
}

function normalizeMimeType(mimeType) {
  if (typeof mimeType !== 'string') return 'image/jpeg';
  const trimmed = mimeType.trim().toLowerCase();
  return /^image\/[a-z0-9.+-]+$/.test(trimmed) ? trimmed : 'image/jpeg';
}

async function withRetry(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const errStr = String(err.message || err);
      if (i === maxRetries - 1) throw err;
      if (err.status === 503 || err.status === 429 || errStr.includes('503') || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('overloaded')) {
        const wait = 2000 + i * 1000;
        console.warn(`Gemini API busy. Retrying ${i + 1}/${maxRetries} in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      throw err;
    }
  }
}

async function geminiText({ model, prompt }) {
  return await withRetry(async () => {
    const textModel = getGeminiModel(model);
    const result = await textModel.generateContent(prompt);
    const text = result?.response?.text?.() || '';
    return String(text).trim();
  });
}

async function geminiVision({ model, prompt, imageBase64, mimeType }) {
  return await withRetry(async () => {
    const visionModel = getGeminiModel(model);
    const result = await visionModel.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageBase64,
          mimeType: normalizeMimeType(mimeType),
        },
      },
    ]);
    const text = result?.response?.text?.() || '';
    return String(text).trim();
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    rag: true,
    provider: LLM_PROVIDER,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    geminiTextModel: GEMINI_TEXT_MODEL,
    geminiVisionModel: GEMINI_VISION_MODEL,
  });
});

app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body || {};
    const normalizedImageBase64 = normalizeBase64Image(imageBase64);

    if (!normalizedImageBase64) {
      console.error('OCR: Missing or invalid imageBase64, length:', (imageBase64 || '').length);
      return res.status(400).json({ error: 'Missing or invalid imageBase64' });
    }

    console.log(`OCR: Processing image (${Math.round(normalizedImageBase64.length / 1024)}KB base64, mime: ${mimeType || 'none'})`);

    const prompt = 'You are a food and label analyzer. Look at this image carefully. If it is a picture of a nutrition label or ingredient list, extract all the text exactly. If it is a picture of an actual meal or food item without much text, describe exactly what kind of food it is in detail so its macronutrients can be estimated. Return ONLY the text or description.';

    let text = '';
    try {
      text = await geminiVision({
        model: GEMINI_VISION_MODEL,
        prompt,
        imageBase64: normalizedImageBase64,
        mimeType,
      });
    } catch (visionErr) {
      console.warn('OCR: Vision model failed, trying text model as fallback...', visionErr.message);
      // Fallback: try the default model if vision model fails
      if (GEMINI_VISION_MODEL !== GEMINI_TEXT_MODEL) {
        text = await geminiVision({
          model: GEMINI_TEXT_MODEL,
          prompt,
          imageBase64: normalizedImageBase64,
          mimeType,
        });
      } else {
        throw visionErr;
      }
    }

    if (!text) {
      return res.status(500).json({ error: 'OCR returned empty text' });
    }
    console.log(`OCR: Success, extracted ${text.length} chars`);
    res.json({ text });
  } catch (err) {
    console.error('POST /api/ocr error:', err.message);
    const detail = err.message || 'OCR failed';
    res.status(500).json({ error: detail, hint: 'Check that your Gemini API key supports vision models. Try using gemini-2.0-flash or gemini-1.5-flash as GEMINI_VISION_MODEL in .env' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { text, profile } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid text' });
    }

    const p = profileToString(profile);
    const system = `You are an expert personalized nutritionist and food safety analyst. User profile: ${p}
The user has provided either text extracted from a nutrition label OR a visual description of a meal/food item. 

Analyze it thoroughly. Provide a structured analysis using EXACTLY these markdown sections (use ### for headers). Be concise with bullet points (use - for items). Each section must have real content — don't skip any section.

### 🔥 Calorie Breakdown
- If a label, total calories per serving. If a meal, estimate total calories.
- Breakdown: protein calories, carb calories, fat calories (estimate if a meal).
- Whether this is low/moderate/high calorie for this type of product/meal.

### 🧪 Preservatives & Chemicals Detected
- If a label, list each preservative or chemical additive. If a fresh meal, note "Fresh meal - assuming no artificial additives" or comment on likely sauces used.
- For each, briefly note safety concerns.

### 🎨 Artificial Colors & Additives
- List any artificial colors or flavor enhancers.
- If none found or if it's a fresh meal, state "No artificial colors detected"

### ⚠️ Harmful Substances
- Flag any ingredients known to be potentially harmful.
- Rate severity: LOW / MODERATE / HIGH concern.

### 🍬 Sugar Analysis
- Estimated or exact sugar content.
- Types of sugars present.
- Whether sugar level is LOW / MODERATE / HIGH.

### 📋 Ingredient-by-Ingredient Breakdown
- Breakdown of major ingredients (either from the label, or estimated visible components of the meal).
- Format: **Ingredient Name** — role, safety, any concerns.

### ✅ The Good Stuff
- Positive nutritional aspects.
- Any health benefits for the user's profile.

### ⚠️ Things to Watch Out For
- Specific warnings for this user's profile and diet goal.
- Allergen information if present.

### 📝 Personalized Summary
- 2-3 sentence overall verdict personalized to the user's profile.

Finally output exactly one line at the end with the rating:
RATING: N
where N is an integer 1-10 (1 = extremely unhealthy / dangerous, 10 = excellent / clean ingredients).

CRITICAL: You MUST also output a structured JSON block at the very end, wrapped EXACTLY in <JSON_DATA>...</JSON_DATA> tags.
The JSON MUST contain these keys with REAL values (never use 0 unless the actual value is truly zero):
- "productName" (string — the actual product/food name, be specific e.g. "Maggi 2-Minute Noodles" or "Grilled Chicken Salad")
- "productDescription" (string — a short 1-2 sentence health-focused description)
- "alerts" (array of objects: { "type": "error"|"warning"|"success", "text": string })
- "macros" (object: { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number } — these MUST be actual estimated numeric values in kcal and grams, NOT zero. If it's a meal image, provide your best estimate.)
- "ingredients" (array of objects: { "name": string, "description": string, "badge": string, "icon": "restaurant"|"nutrition"|"shutter_speed" })

Example macros for a meal: { "calories": 450, "protein": 22, "carbs": 55, "fat": 18, "fiber": 4 }
Make sure the JSON is valid and all macro numbers are realistic estimates.`;

    const analysis = await geminiText({
      model: GEMINI_TEXT_MODEL,
      prompt: `${system}\n\nNutrition label text:\n\n${text}`,
    });

    if (!analysis) {
      return res.status(500).json({ error: 'Analysis returned empty text' });
    }
    res.json({ analysis });
  } catch (err) {
    console.error('POST /api/analyze error:', err);
    res.status(500).json({ error: err.message || 'Analyze failed' });
  }
});

// Combined OCR + Analyze in a single call (used by Lab Scanner for speed)
app.post('/api/quick-scan', async (req, res) => {
  try {
    const { imageBase64, mimeType, profile } = req.body || {};
    const normalizedImageBase64 = normalizeBase64Image(imageBase64);

    if (!normalizedImageBase64) {
      return res.status(400).json({ error: 'Missing or invalid imageBase64' });
    }

    console.log(`Quick-scan: Processing image (${Math.round(normalizedImageBase64.length / 1024)}KB)`);

    // Step 1: OCR
    const ocrPrompt = 'You are a food and label analyzer. Look at this image carefully. If it is a picture of a nutrition label or ingredient list, extract all the text exactly. If it is a picture of an actual meal or food item without much text, describe exactly what kind of food it is in detail so its macronutrients can be estimated. Return ONLY the text or description.';

    let text = '';
    try {
      text = await geminiVision({ model: GEMINI_VISION_MODEL, prompt: ocrPrompt, imageBase64: normalizedImageBase64, mimeType });
    } catch (visionErr) {
      if (GEMINI_VISION_MODEL !== GEMINI_TEXT_MODEL) {
        text = await geminiVision({ model: GEMINI_TEXT_MODEL, prompt: ocrPrompt, imageBase64: normalizedImageBase64, mimeType });
      } else {
        throw visionErr;
      }
    }

    if (!text) {
      return res.status(500).json({ error: 'Could not read image content' });
    }

    // Step 2: Analyze immediately (no round-trip back to frontend)
    const p = profileToString(profile);
    const analyzePrompt = `You are an expert nutritionist. User profile: ${p}
Analyze the following food/label text. Be concise and fast.

CRITICAL: Output ONLY a JSON block wrapped in <JSON_DATA>...</JSON_DATA> tags with these keys:
- "productName" (string, specific name)
- "macros" (object: { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number })
- "alerts" (array of { "type": "error"|"warning"|"success", "text": string })
- "ratingLabel" (string: "GOOD", "MODERATE", or "POOR")
- "rating" (integer 1-10)

All macro numbers must be realistic estimates, never zero unless truly zero.

Text to analyze:
${text}`;

    const analysis = await geminiText({ model: GEMINI_TEXT_MODEL, prompt: analyzePrompt });

    console.log(`Quick-scan: Success, OCR=${text.length} chars, analysis=${(analysis || '').length} chars`);
    res.json({ text, analysis });
  } catch (err) {
    console.error('POST /api/quick-scan error:', err.message);
    res.status(500).json({ error: err.message || 'Quick scan failed' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], scanContext = {}, profile } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message' });
    }

    console.log(`Chat: Received message "${message.slice(0, 60)}..." with ${(history || []).length} history items`);

    const reply = await withRetry(async () => {
      return await rag.chatRAG(message.trim(), history, scanContext, profileToString(profile));
    });

    if (!reply) {
      console.warn('Chat: Empty reply from chatRAG');
      return res.json({ reply: "I'm having trouble generating a response right now. Please try asking your question again." });
    }

    console.log(`Chat: Success, reply length = ${reply.length} chars`);
    res.json({ reply });
  } catch (err) {
    console.error('POST /api/chat error:', err.message || err);
    // Send a helpful error instead of a generic failure
    const isApiError = (err.message || '').includes('API') || (err.message || '').includes('key');
    const userMessage = isApiError
      ? 'The AI service is temporarily unavailable. Please try again in a moment.'
      : err.message || 'Chat service encountered an error';
    res.status(500).json({ error: userMessage });
  }
});

app.listen(PORT, () => {
  console.log(`NutriScan backend running at http://localhost:${PORT}`);
  console.log(`Provider: ${LLM_PROVIDER}`);
  console.log(`Gemini configured: ${Boolean(GEMINI_API_KEY)}`);
  console.log(`Gemini text model: ${GEMINI_TEXT_MODEL}`);
  console.log(`Gemini vision model: ${GEMINI_VISION_MODEL}`);
  console.log('RAG: knowledge chunks loaded =', rag.knowledgeChunks.length);
});
