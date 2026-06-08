# NutriScan Backend (RAG Chat)

Backend for the NutriScan chatbot with **RAG (Retrieval-Augmented Generation)** so answers use both the current scan and a knowledge base (nutrition guidelines, PDFs, etc.).

## Setup

1. Copy `.env.example` to `.env` and set your Gemini API key:
   ```bash
   cp .env.example .env
   # Edit .env and set GEMINI_API_KEY=your_key
   ```

2. (Optional) Ingest documents into the knowledge base for better answers:
   ```bash
   npm run ingest ./knowledge
   ```
   Put `.txt` or `.pdf` files in a `knowledge` folder (or pass any folder path). The script chunks and embeds them and stores in `data/knowledge.json`.

## Run

```bash
npm start
```

Server runs at `http://localhost:5000`. The frontend will use it for the summary-page chatbot when available; if the backend is down, chat falls back to direct Gemini.

## API

- **GET /api/health** – Returns `{ ok: true, rag: true }`.
- **POST /api/chat** – RAG-backed chat.
  - Body: `{ message, history?, scanContext?, profile? }`
  - `scanContext`: `{ extractedText, analysisText }` from the current scan.
  - `profile`: `{ age, weight, height, diet }`.
  - Response: `{ reply }`

## How RAG works

1. User question is embedded with Gemini (`text-embedding-004`).
2. Top-k similar chunks are retrieved from the knowledge base (in-memory + `data/knowledge.json`).
3. Gemini is called with: scan context + user profile + retrieved chunks + chat history.
4. Reply is returned to the frontend.

No separate Chroma server is required; embeddings are stored in a JSON file. You can switch to ChromaDB later by changing `rag.js` to use the Chroma client.
