/**
 * RAG (Retrieval-Augmented Generation) for NutriScan chatbot.
 * Uses Gemini for embeddings and generation; knowledge stored in memory + optional JSON file.
 */

const path = require('path');
const fs = require('fs');

const KNOWLEDGE_FILE = path.join(__dirname, 'data', 'knowledge.json');
const EMBEDDING_MODEL = 'gemini-embedding-001';
const TOP_K = 5;

let knowledgeChunks = [];
let geminiKey = null;
let generativeModel = null;

function setGeminiKey(key) {
  if (!key) return;
  const newKey = key.trim();
  if (newKey !== geminiKey) {
    geminiKey = newKey;
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(newKey);
      generativeModel = genAI.getGenerativeModel({ model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite' });
      console.log('RAG: Gemini model initialized successfully with key:', newKey.slice(0, 8) + '...');
    } catch (e) {
      console.warn('RAG: Could not init Gemini model', e.message);
    }
  }
}

function loadKnowledge() {
  try {
    const dir = path.dirname(KNOWLEDGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const raw = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
      knowledgeChunks = JSON.parse(raw);
    }
  } catch (e) {
    knowledgeChunks = [];
  }
}

function saveKnowledge() {
  try {
    const dir = path.dirname(KNOWLEDGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledgeChunks, null, 0), 'utf8');
  } catch (e) {
    console.warn('RAG: Could not save knowledge file', e.message);
  }
}

async function embedWithGemini(texts) {
  if (!geminiKey || !Array.isArray(texts) || texts.length === 0) return [];
  const single = texts.length === 1;
  const input = single ? texts[0] : texts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${geminiKey}`;
  const body = {
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text: single ? input : input.join('\n\n---\n\n') }] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const embedding = data.embedding?.values;
  if (!embedding) throw new Error('No embedding in response');
  return [embedding];
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function retrieve(query, k = TOP_K) {
  if (knowledgeChunks.length === 0) return [];
  const [queryEmb] = await embedWithGemini([query]);
  const withScore = knowledgeChunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(chunk.embedding, queryEmb),
  }));
  withScore.sort((a, b) => b.score - a.score);
  return withScore.slice(0, k).map(({ text }) => text);
}

function buildSystemPrompt(scanContext, profile, retrievedTexts) {
  const { extractedText = '', analysisText = '' } = scanContext || {};
  let prompt = `You are a helpful nutrition assistant. The user has just scanned a product. Use the following context to answer their questions. Be concise and friendly.

--- NUTRITION LABEL (extracted text) ---
${extractedText}

--- PERSONALIZED ANALYSIS OF THIS PRODUCT ---
${analysisText}

--- USER PROFILE ---
${profile || 'Not provided'}`;

  if (retrievedTexts && retrievedTexts.length > 0) {
    prompt += `

--- RELEVANT NUTRITION KNOWLEDGE (use to improve answers) ---
${retrievedTexts.join('\n\n')}`;
  }

  prompt += `

Answer based on this scan, profile, and any relevant knowledge above. If the question is off-topic, briefly say you can only help with this product. Do not use markdown headers; use short paragraphs or bullet points if needed.`;
  return prompt;
}

async function generateWithGemini(history, systemPrompt) {
  if (!generativeModel) throw new Error('Gemini model not initialized');
  const mapped = (history || []).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: m.parts || [{ text: m.text || '' }],
  }));
  const lastMsg = mapped[mapped.length - 1];
  const historyForChat = lastMsg && lastMsg.role === 'user' ? mapped.slice(0, -1) : mapped;
  const chat = generativeModel.startChat({
    history: historyForChat,
    systemInstruction: systemPrompt,
  });
  const toSend = lastMsg && lastMsg.role === 'user' ? (lastMsg.parts[0]?.text || '') : '';
  const result = await chat.sendMessage(toSend || 'Hello');
  const response = result.response;
  const text = response.text();
  return (text || '').trim();
}

async function chatRAG(message, history, scanContext, profile) {
  const currentKey = (process.env.GEMINI_API_KEY || geminiKey || '').trim();
  setGeminiKey(currentKey);
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');
  if (!generativeModel) {
    // Force re-init if model wasn't created
    geminiKey = null;
    setGeminiKey(currentKey);
    if (!generativeModel) throw new Error('Could not initialize Gemini model');
  }

  // RAG retrieval is optional — don't let it crash the chat
  let retrieved = [];
  try {
    retrieved = await retrieve(message, TOP_K);
  } catch (ragErr) {
    console.warn('RAG retrieve failed (non-fatal):', ragErr.message);
  }

  const systemPrompt = buildSystemPrompt(scanContext, profile, retrieved);

  const h = (history || []).slice(-12);
  h.push({ role: 'user', parts: [{ text: message }] });

  try {
    const reply = await generateWithGemini(h, systemPrompt);
    return reply;
  } catch (chatErr) {
    console.error('RAG chat generation failed:', chatErr.message);
    // Fallback: try a simple single prompt without chat history
    try {
      console.log('RAG: Trying simple generation fallback...');
      const fallbackPrompt = `${systemPrompt}\n\nUser question: ${message}`;
      const result = await generativeModel.generateContent(fallbackPrompt);
      const text = result?.response?.text?.() || '';
      if (text.trim()) return text.trim();
    } catch (fallbackErr) {
      console.error('RAG fallback also failed:', fallbackErr.message);
    }
    throw chatErr;
  }
}

function addChunks(texts, embeddings) {
  if (!Array.isArray(texts) || texts.length === 0) return;
  const newChunks = texts.map((text, i) => ({
    text: text.slice(0, 2000),
    embedding: embeddings[i] || embeddings[0],
  }));
  knowledgeChunks.push(...newChunks);
  saveKnowledge();
}

loadKnowledge();

module.exports = {
  setGeminiKey,
  loadKnowledge,
  retrieve,
  chatRAG,
  addChunks,
  embedWithGemini,
  get knowledgeChunks() {
    return knowledgeChunks;
  },
};
