/**
 * Ingest PDF or text files into the RAG knowledge base.
 * Usage: node ingest.js <file-or-folder> [--chunk-size=500] [--overlap=50]
 * Example: node ingest.js ./knowledge
 *          node ingest.js ./docs/nutrition-guide.pdf
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const rag = require('./rag');

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '500', 10);
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '50', 10);

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  while (start < clean.length) {
    let end = start + size;
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(clean.slice(start, end).trim());
    if (chunks[chunks.length - 1]) start = end - overlap;
    else start = end;
  }
  return chunks.filter(Boolean);
}

async function extractPdfText(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (e) {
    console.warn('pdf-parse failed for', filePath, e.message);
    return '';
  }
}

function getAllFiles(dir, exts = ['.txt', '.pdf']) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return exts.some((e) => dir.toLowerCase().endsWith(e)) ? [dir] : [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...getAllFiles(full, exts));
    else if (exts.some((ext) => e.name.toLowerCase().endsWith(ext))) out.push(full);
  }
  return out;
}

async function main() {
  const input = process.argv[2] || path.join(__dirname, 'knowledge');
  if (!input) {
    console.log('Usage: node ingest.js <file-or-folder>');
    process.exit(1);
  }

  rag.setGeminiKey(process.env.GEMINI_API_KEY);
  if (!process.env.GEMINI_API_KEY) {
    console.error('Set GEMINI_API_KEY in .env');
    process.exit(1);
  }

  const files = fs.existsSync(input) && fs.statSync(input).isFile() ? [input] : getAllFiles(input);
  if (files.length === 0) {
    console.log('No .txt or .pdf files found at', input);
    process.exit(0);
  }

  let allChunks = [];
  for (const file of files) {
    let text = '';
    const ext = path.extname(file).toLowerCase();
    if (ext === '.pdf') text = await extractPdfText(file);
    else if (ext === '.txt') text = fs.readFileSync(file, 'utf8');
    if (text) {
      const chunks = chunkText(text);
      allChunks.push(...chunks);
      console.log(file, '->', chunks.length, 'chunks');
    }
  }

  if (allChunks.length === 0) {
    console.log('No text extracted.');
    process.exit(0);
  }

  console.log('Embedding', allChunks.length, 'chunks...');
  const embeddings = [];
  for (let i = 0; i < allChunks.length; i++) {
    const [emb] = await rag.embedWithGemini([allChunks[i]]);
    embeddings.push(emb);
    if ((i + 1) % 10 === 0) console.log(i + 1, '/', allChunks.length);
  }
  rag.addChunks(allChunks, embeddings);
  console.log('Done. Total chunks in knowledge base:', rag.knowledgeChunks.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
