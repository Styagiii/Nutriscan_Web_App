const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rag = require('../backend/rag');

const app = express();

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
  if (!genAI) throw new Error('GEMINI_API_KEY missing');
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
      console.error('OCR: Missing or invalid imageBase64');
      return res.status(400).json({ error: 'Missing or invalid imageBase64' });
    }

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
    res.json({ text });
  } catch (err) {
    console.error('POST /api/ocr error:', err.message);
    res.status(500).json({ error: err.message || 'OCR failed' });
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
Analyze the food/label text provided. Provide structured analysis with these sections:
### 🔥 Calorie Breakdown
### 🧪 Preservatives & Chemicals Detected
### 🎨 Artificial Colors & Additives
### ⚠️ Harmful Substances
### 🍬 Sugar Analysis
### 📋 Ingredient-by-Ingredient Breakdown
### ✅ The Good Stuff
### ⚠️ Things to Watch Out For
### 📝 Personalized Summary

RATING: N (1-10 scale)

Finally, output JSON in <JSON_DATA>...</JSON_DATA> tags with keys: productName, productDescription, alerts, macros, ingredients.`;

    const analysis = await geminiText({
      model: GEMINI_TEXT_MODEL,
      prompt: `${system}\n\nNutrition text:\n\n${text}`,
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

app.post('/api/quick-scan', async (req, res) => {
  try {
    const { imageBase64, mimeType, profile } = req.body || {};
    const normalizedImageBase64 = normalizeBase64Image(imageBase64);

    if (!normalizedImageBase64) {
      return res.status(400).json({ error: 'Missing or invalid imageBase64' });
    }

    const ocrPrompt = 'You are a food and label analyzer. Look at this image carefully. If it is a picture of a nutrition label or ingredient list, extract all the text exactly. If it is a picture of an actual meal or food item without much text, describe exactly what kind of food it is in detail. Return ONLY the text or description.';

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

    const p = profileToString(profile);
    const analyzePrompt = `You are an expert nutritionist. Analyze this food. Output ONLY a JSON in <JSON_DATA>...</JSON_DATA> tags with keys: productName, macros, alerts, ratingLabel, rating.`;

    const analysis = await geminiText({ model: GEMINI_TEXT_MODEL, prompt: analyzePrompt });

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

    const reply = await withRetry(async () => {
      return await rag.chatRAG(message.trim(), history, scanContext, profileToString(profile));
    });

    if (!reply) {
      return res.json({ reply: "I'm having trouble generating a response right now. Please try again." });
    }

    res.json({ reply });
  } catch (err) {
    console.error('POST /api/chat error:', err.message || err);
    res.status(500).json({ error: err.message || 'Chat service error' });
  }
});

module.exports = app;
