const DB_NAME = 'NutriScanDB';
const DB_VERSION = 2;
const STORE_SCANS = 'scans';
const STORE_DIARY = 'diaryEntries';

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SCANS)) {
        const store = db.createObjectStore(STORE_SCANS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_DIARY)) {
        const d = db.createObjectStore(STORE_DIARY, { keyPath: 'id', autoIncrement: true });
        d.createIndex('dayKey', 'dayKey', { unique: false });
        d.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function saveScan(profile, analysisText, productName = '', macros = null, thumbnail = '') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_SCANS);
    const summary = productName ||
      analysisText.replace(/#+/g, '').trim().slice(0, 120) + (analysisText.length > 120 ? '…' : '');
    const record = {
      createdAt: Date.now(),
      profile: { ...profile },
      analysisText,
      summary,
      macros: macros || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      thumbnail: thumbnail || '',
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllScans() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCANS, 'readonly');
    const store = tx.objectStore(STORE_SCANS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function addDiaryEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DIARY, 'readwrite');
    const store = tx.objectStore(STORE_DIARY);
    const record = {
      createdAt: Date.now(),
      ...entry,
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDiaryForDay(dayKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DIARY, 'readonly');
    const store = tx.objectStore(STORE_DIARY);
    const idx = store.index('dayKey');
    const req = idx.getAll(dayKey);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDiaryEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DIARY, 'readwrite');
    const store = tx.objectStore(STORE_DIARY);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function dayKeyFromDate(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
