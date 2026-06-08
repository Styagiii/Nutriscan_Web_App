import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveScan, addDiaryEntry, dayKeyFromDate } from '../db';
import { parseRatingFromAnalysis, stripRatingLine } from '../analysisUtils';
import { getUserProfile } from '../auth';

/**
 * Robustly extract JSON from an analysis string.
 * Handles <JSON_DATA>...</JSON_DATA>, ```json...```, or bare {...}.
 */
function extractJSON(text) {
  // 1. Try <JSON_DATA> tags
  const tagMatch = text.match(/<JSON_DATA>([\s\S]*?)<\/JSON_DATA>/i);
  if (tagMatch) {
    const raw = tagMatch[1].replace(/```json/gi, '').replace(/```/g, '').trim();
    try { return JSON.parse(raw); } catch (_) {}
  }

  // 2. Try ```json code fences
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {}
  }

  // 3. Try last {...} block in the text (Gemini sometimes just outputs JSON)
  const braceMatches = text.match(/\{[\s\S]*\}/g);
  if (braceMatches) {
    for (let i = braceMatches.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(braceMatches[i]);
        if (parsed.macros || parsed.productName) return parsed;
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Fallback: Parse macro values from the analysis text using regex.
 * Looks for patterns like "Calories: 250", "Protein: 12g", etc.
 */
function parseMacrosFromText(text) {
  const macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  // Calories patterns
  const calMatch = text.match(/(?:total\s*(?:energy|calories?))[:\s~≈]*(?:approximately?\s*)?([\d,]+)\s*(?:kcal|cal)/i)
    || text.match(/([\d,]+)\s*(?:kcal|calories?)(?:\s*(?:per|\/)\s*serving)?/i)
    || text.match(/calories?[:\s~≈]*(?:approximately?\s*)?([\d,]+)/i);
  if (calMatch) macros.calories = parseFloat(calMatch[1].replace(/,/g, '')) || 0;

  // Protein patterns
  const proMatch = text.match(/protein[:\s~≈]*(?:approximately?\s*)?([\d.]+)\s*g/i);
  if (proMatch) macros.protein = parseFloat(proMatch[1]) || 0;

  // Carbs patterns
  const carbMatch = text.match(/(?:carb(?:ohydrate)?s?|total carb)[:\s~≈]*(?:approximately?\s*)?([\d.]+)\s*g/i);
  if (carbMatch) macros.carbs = parseFloat(carbMatch[1]) || 0;

  // Fat patterns
  const fatMatch = text.match(/(?:total\s*)?fat[:\s~≈]*(?:approximately?\s*)?([\d.]+)\s*g/i);
  if (fatMatch) macros.fat = parseFloat(fatMatch[1]) || 0;

  // Fiber patterns
  const fiberMatch = text.match(/(?:dietary\s*)?fib(?:er|re)[:\s~≈]*(?:approximately?\s*)?([\d.]+)\s*g/i);
  if (fiberMatch) macros.fiber = parseFloat(fiberMatch[1]) || 0;

  return macros;
}

/**
 * Extract product name from analysis text as fallback.
 */
function parseProductNameFromText(text) {
  const m = text.match(/(?:product\s*name|product|item)[:\s]*["']?([^"'\n]{3,60})["']?/i);
  if (m) return m[1].trim();
  // Try the first ### heading
  const headingMatch = text.match(/###\s*(.+)/m);
  if (headingMatch) {
    const h = headingMatch[1].replace(/[🔥🧪🎨⚠️🍬📋✅📝]/g, '').trim();
    if (h.length < 60 && !h.toLowerCase().includes('calorie') && !h.toLowerCase().includes('ingredient')) return h;
  }
  return 'Scanned Food';
}

const configuredApiBase = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');
// Reject values that aren't valid URLs (e.g. API keys accidentally set as VITE_BACKEND_URL)
const isValidUrl = /^https?:\/\//i.test(configuredApiBase);
const API_BASE = !isValidUrl ? '' : /:11434(?:\/|$)/.test(configuredApiBase) ? 'http://localhost:5000' : configuredApiBase;
function toApiUrl(path) { return `${API_BASE}${path}`; }

export default function ScanPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('upload');
  const [userProfile, setUserProfile] = useState({ age: '', weight: '', height: '', diet: 'Balanced Diet' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [loadingText, setLoadingText] = useState('');
  
  const [rating, setRating] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [savedToLog, setSavedToLog] = useState(false);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatContextRef = useRef({ extractedText: '', analysisText: '' });
  const chatHistoryRef = useRef([]);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const thumbnailRef = useRef('');

  useEffect(() => {
    const profile = getUserProfile();
    if (profile && typeof profile === 'object') setUserProfile((p) => ({ ...p, ...profile }));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPreviewUrl(URL.createObjectURL(file));
    setView('processing');
    setError('');

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1200;
      
      if (width > height && width > MAX_SIZE) {
        height = Math.round(height * (MAX_SIZE / width));
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = Math.round(width * (MAX_SIZE / height));
        height = MAX_SIZE;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const comma = dataUrl.indexOf(',');
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;

      // Create a small thumbnail for IndexedDB storage (200px max)
      const thumbSize = 200;
      const thumbCanvas = document.createElement('canvas');
      let tw = width, th = height;
      if (tw > th && tw > thumbSize) { th = Math.round(th * (thumbSize / tw)); tw = thumbSize; }
      else if (th > thumbSize) { tw = Math.round(tw * (thumbSize / th)); th = thumbSize; }
      thumbCanvas.width = tw;
      thumbCanvas.height = th;
      thumbCanvas.getContext('2d').drawImage(img, 0, 0, tw, th);
      thumbnailRef.current = thumbCanvas.toDataURL('image/jpeg', 0.5);
      
      extractTextFromImage(base64, 'image/jpeg');
    };
    img.onerror = () => {
      setError('Failed to process image');
      setView('upload');
    };
    img.src = URL.createObjectURL(file);
  };

  const extractTextFromImage = async (base64ImageData, mimeType) => {
    setLoadingText('Analyzing image content...');
    try {
      const response = await fetch(toApiUrl('/api/ocr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64ImageData, mimeType }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Network error ${response.status}`);
      }
      const result = await response.json();
      if (!result.text) throw new Error('Could not extract any text');
      await analyzeIngredients(result.text);
    } catch (err) {
      setError('OCR Failed: ' + err.message + '. Try taking a clearer photo.');
      setView('upload');
    }
  };

  const analyzeIngredients = async (text) => {
    setLoadingText('Creating personalized analysis...');
    try {
      const response = await fetch(toApiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, profile: userProfile }),
      });
      if (!response.ok) throw new Error(`Analysis failed`);
      const result = await response.json();
      if (!result.analysis) throw new Error('Empty analysis');
      
      const analysisText = result.analysis.trim();
      const r = parseRatingFromAnalysis(analysisText) || 5;
      let cleaned = stripRatingLine(analysisText);
      
      let data = { 
        productName: 'Scanned Food', 
        alerts: [{ type: 'success', text: 'Scan Complete' }], 
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, 
        ingredients: [] 
      };
      
      // --- Robust JSON extraction ---
      const jsonData = extractJSON(cleaned);
      if (jsonData) {
        data = { ...data, ...jsonData };
        // Remove the JSON block from the displayed text
        cleaned = cleaned
          .replace(/<JSON_DATA>[\s\S]*?<\/JSON_DATA>/gi, '')
          .replace(/```json[\s\S]*?```/gi, '')
          .trim();
      }
      
      // --- Fallback: parse macros from analysis text if JSON had zeros ---
      const m = data.macros;
      const hasMacros = (m.calories > 0 || m.protein > 0 || m.carbs > 0 || m.fat > 0);
      if (!hasMacros) {
        console.log('JSON macros were empty, falling back to text parsing');
        const fallback = parseMacrosFromText(analysisText);
        data.macros = {
          calories: fallback.calories || m.calories,
          protein: fallback.protein || m.protein,
          carbs: fallback.carbs || m.carbs,
          fat: fallback.fat || m.fat,
          fiber: fallback.fiber || m.fiber,
        };
      }

      // --- Fallback: product name ---
      if (!data.productName || data.productName === 'Scanned Food' || data.productName === 'Analyzed Product') {
        data.productName = parseProductNameFromText(analysisText) || 'Scanned Food';
      }
      
      chatContextRef.current = { extractedText: text, analysisText: cleaned };
      chatHistoryRef.current = [];
      await saveScan(userProfile, cleaned, data.productName, data.macros, thumbnailRef.current);

      // --- Auto-save to diary so it reflects on dashboard immediately ---
      setSavedToLog(false);
      try {
        await addDiaryEntry({
          dayKey: dayKeyFromDate(new Date()),
          mealType: 'snack',
          name: data.productName || 'Scanned Item',
          calories: data.macros?.calories || 0,
          protein: data.macros?.protein || 0,
          carbs: data.macros?.carbs || 0,
          fat: data.macros?.fat || 0,
          source: 'scan'
        });
        setSavedToLog(true);
      } catch (diaryErr) {
        console.error('Auto diary save failed', diaryErr);
      }

      setRating(r);
      setParsedData(data);
      setView('result');
    } catch (err) {
      setError(err.message);
      setView('result');
    }
  };

  const sendChat = async (overrideText) => {
    const text = (typeof overrideText === 'string' ? overrideText : chatInput).trim();
    if (!text) return;
    if (typeof overrideText !== 'string') setChatInput('');
    setChatMessages(m => [...m, { role: 'user', text }]);
    chatHistoryRef.current.push({ role: 'user', parts: [{ text }] });
    setChatLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(toApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistoryRef.current.slice(0, -1),
          scanContext: chatContextRef.current,
          profile: userProfile,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: data.reply }] });
      setChatMessages(m => [...m, { role: 'bot', text: data.reply }]);
    } catch (err) {
      chatHistoryRef.current.pop();
      const isTimeout = err.name === 'AbortError';
      const isNetwork = err.message === 'Failed to fetch' || err.message?.includes('NetworkError');
      let msg;
      if (isTimeout) {
        msg = '⏱️ The AI server is still waking up (free tier cold start). Please wait ~30 seconds and try again.';
      } else if (isNetwork) {
        msg = '🔌 Could not connect to the backend server. Make sure the backend is running on port 5000.';
      } else {
        msg = '⚠️ ' + (err.message || 'Sorry, I couldn\'t process that. Please try again in a moment.');
      }
      setChatMessages(m => [...m, { role: 'bot', text: msg }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveToLog = async () => {
    if (!parsedData) return;
    if (savedToLog) {
      // Already auto-saved, just navigate
      navigate('/diary');
      return;
    }
    try {
      await addDiaryEntry({
        dayKey: dayKeyFromDate(new Date()),
        mealType: 'snack',
        name: parsedData.productName || 'Scanned Item',
        calories: parsedData.macros?.calories || 0,
        protein: parsedData.macros?.protein || 0,
        carbs: parsedData.macros?.carbs || 0,
        fat: parsedData.macros?.fat || 0,
        source: 'scan'
      });
      setSavedToLog(true);
      navigate('/diary');
    } catch (err) {
      console.error('Failed to save to diary', err);
    }
  };
  
  const getAlertColor = (type) => {
    if (type === 'error') return 'bg-error/10 border-error/20 text-error';
    if (type === 'warning') return 'bg-secondary/10 border-secondary/20 text-secondary';
    return 'bg-primary/10 border-primary/20 text-primary';
  };

  const getAlertIcon = (type) => {
    if (type === 'error') return 'warning';
    if (type === 'warning') return 'eco';
    return 'check_circle';
  };

  const circumference = 628;
  const score = rating * 10;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <>
      <div className="max-w-md mx-auto relative min-h-[70vh]">
        {/* Background glow effects for upload views */}
        {view !== 'result' && (
          <>
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="text-center mb-8 relative z-10">
              <h1 className="text-4xl font-headline font-bold mb-3 text-on-surface leading-tight tracking-tight">
                AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Insights</span>
              </h1>
              <p className="text-on-surface-variant font-body text-sm px-4">
                Scan a label to detect hidden sugars, harmful additives, and get a personalized score.
              </p>
            </div>
          </>
        )}

        {view === 'upload' && (
          <div className="bg-surface-container rounded-[32px] p-8 shadow-[0_20px_40px_-10px_rgba(0,227,253,0.05)] border border-outline-variant/20 relative z-10 text-center">
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-2xl text-left animate-pulse">
                <p className="text-error font-bold text-sm mb-1">Upload Issue</p>
                <p className="text-error/80 text-xs leading-relaxed">{error}</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" hidden id="scan-file" onChange={handleImage} />
            <label htmlFor="scan-file" className="block cursor-pointer group">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(63,255,139,0.1)] group-hover:shadow-[0_0_40px_rgba(63,255,139,0.2)]">
                <span className="material-symbols-outlined text-4xl text-primary">camera</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Scan with Camera</h3>
              <p className="text-xs text-on-surface-variant max-w-[200px] mx-auto">Tap to capture or select a nutrition label image</p>
            </label>
          </div>
        )}

        {view === 'processing' && (
          <div className="bg-surface-container rounded-[32px] p-8 text-center relative z-10 overflow-hidden">
            {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl mb-6 opacity-60 mix-blend-screen" />}
            <div className="w-16 h-16 mx-auto rounded-full border-[3px] border-surface-container-low border-t-primary border-r-secondary animate-spin mb-6"></div>
            <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-primary to-secondary w-full" style={{ animation: 'shimmer 1.5s infinite linear', backgroundSize: '200% 100%' }}></div>
            </div>
            <p className="text-on-surface-variant text-sm font-headline tracking-wide uppercase">{loadingText}</p>
          </div>
        )}

        {view === 'result' && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-surface">
            {/* Override main header */}
            <header className="fixed top-0 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[60] flex items-center px-6 h-16 bg-[#0a0e14]/60 backdrop-blur-lg rounded-2xl mt-4 shadow-[0_10px_30px_-15px_rgba(0,227,253,0.15)]">
              <button onClick={() => { setView('upload'); setPreviewUrl(''); }} className="flex items-center justify-center p-2 text-[#3fff8b] hover:bg-[#151a21] transition-all active:scale-95 duration-200">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="ml-4 text-[#3fff8b] font-headline font-bold tracking-tight text-lg">Analysis Results</h1>
            </header>
            
            <div className="pt-24 pb-8">
              {error ? (
                <div className="bg-error/10 border border-error/30 rounded-2xl p-5 mb-8">
                  <p className="text-error font-bold mb-1">Failed to analyze</p>
                  <p className="text-sm text-error/80">{error}</p>
                </div>
              ) : (
                <>
                  <section className="flex flex-col items-center justify-center mb-12">
                    <div className="relative w-56 h-56 flex items-center justify-center">
                      <svg className="absolute w-full h-full -rotate-90">
                        <circle cx="112" cy="112" fill="transparent" r="100" stroke="#151a21" strokeWidth="12"></circle>
                        <circle className="shadow-[0_0_25px_rgba(63,255,139,0.25)]" style={{ filter: 'drop-shadow(0 0 10px rgba(63,255,139,0.5))' }} cx="112" cy="112" fill="transparent" r="100" stroke="#3fff8b" strokeDasharray="628" strokeDashoffset={strokeDashoffset} strokeLinecap="round" strokeWidth="12"></circle>
                      </svg>
                      <div className="text-center z-10">
                        <span className="block font-headline text-6xl font-bold tracking-tighter text-on-surface leading-none">{score}</span>
                        <span className="block font-label text-sm uppercase tracking-[0.2em] text-[#3fff8b] mt-1 font-bold">Health Score</span>
                      </div>
                    </div>
                    <div className="mt-8 text-center max-w-[80%] mx-auto">
                      <h2 className="font-headline text-3xl font-bold tracking-tight mb-2 truncate">{parsedData?.productName || "Analyzed Product"}</h2>
                      <p className="font-body text-on-surface-variant text-sm px-2 text-balance leading-relaxed">
                        {parsedData?.productDescription || "Scan completed for your profile."}
                      </p>
                    </div>
                  </section>

                  {parsedData?.alerts?.length > 0 && (
                    <section className="mb-10 -mx-6 px-6 overflow-x-auto scrollbar-hide flex space-x-3">
                      {parsedData.alerts.map((al, idx) => (
                        <div key={idx} className={`flex-shrink-0 flex items-center px-4 py-2 border rounded-full ${getAlertColor(al.type)}`}>
                          <span className="material-symbols-outlined text-sm mr-2">{getAlertIcon(al.type)}</span>
                          <span className="font-label text-xs font-bold uppercase tracking-wider">{al.text}</span>
                        </div>
                      ))}
                    </section>
                  )}

                  <section className="grid grid-cols-2 gap-4 mb-12">
                    <div className="col-span-2 bg-surface-container rounded-xl p-6 flex items-center justify-between">
                      <div>
                        <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-1">Total Energy</p>
                        <h3 className="font-headline text-4xl font-bold text-primary">{parsedData?.macros?.calories || 0} <span className="text-xl font-medium">kcal</span></h3>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-3xl">local_fire_department</span>
                      </div>
                    </div>

                    <div className="bg-surface-container rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Protein</p>
                        <span className="text-tertiary font-bold text-xs">{parsedData?.macros?.protein || 0}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary rounded-full" style={{width: `${Math.min(100, (parsedData?.macros?.protein / 50) * 100)}%`}}></div>
                      </div>
                    </div>

                    <div className="bg-surface-container rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Carbs</p>
                        <span className="text-secondary font-bold text-xs">{parsedData?.macros?.carbs || 0}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{width: `${Math.min(100, (parsedData?.macros?.carbs / 100) * 100)}%`}}></div>
                      </div>
                    </div>

                    <div className="bg-surface-container rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Fats</p>
                        <span className="text-error font-bold text-xs">{parsedData?.macros?.fat || 0}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-error rounded-full" style={{width: `${Math.min(100, (parsedData?.macros?.fat / 65) * 100)}%`}}></div>
                      </div>
                    </div>

                    <div className="bg-surface-container rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Fiber</p>
                        <span className="text-primary font-bold text-xs">{parsedData?.macros?.fiber || 0}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{width: `${Math.min(100, (parsedData?.macros?.fiber / 25) * 100)}%`}}></div>
                      </div>
                    </div>
                  </section>

                  {parsedData?.ingredients?.length > 0 && (
                    <section className="mb-12">
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-8">
                        {previewUrl && <img src={previewUrl} className="w-full h-full object-cover opacity-80" alt="Scanned product" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
                      </div>
                      <div className="flex justify-between items-end mb-6">
                        <h3 className="font-headline text-2xl font-bold">Ingredients</h3>
                        <span className="font-label text-xs text-secondary uppercase tracking-widest">{parsedData.ingredients.length} Elements</span>
                      </div>
                      <div className="space-y-4">
                        {parsedData.ingredients.map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center mr-4">
                                <span className="material-symbols-outlined text-on-surface-variant">{ing.icon || 'restaurant'}</span>
                              </div>
                              <div>
                                <p className="font-body font-medium">{ing.name}</p>
                                <p className="text-xs text-on-surface-variant">{ing.description}</p>
                              </div>
                            </div>
                            {ing.badge && (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">{ing.badge}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="mt-8 mb-6">
                    {savedToLog && (
                      <div className="flex items-center justify-center gap-2 mb-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                        <span className="text-primary text-xs font-headline font-bold uppercase tracking-wider">Auto-saved to Daily Log</span>
                      </div>
                    )}
                    <button onClick={handleSaveToLog} className={`w-full h-16 rounded-full flex items-center justify-center active:scale-95 transition-all ${savedToLog ? 'bg-surface-container-highest/60 border border-outline-variant/30' : 'bg-gradient-to-r from-primary to-primary-container shadow-[0_15px_30px_rgba(63,255,139,0.2)]'}`}>
                      <span className={`font-headline font-bold tracking-tight text-lg ${savedToLog ? 'text-on-surface' : 'text-on-primary'}`}>{savedToLog ? 'View in Diary' : 'Save to Daily Log'}</span>
                    </button>

                    {/* Healthy Alternatives - Google Search Link */}
                    <a 
                      href={`https://www.google.com/search?q=healthy+alternatives+to+${encodeURIComponent(parsedData?.productName || 'this food')}+nutritious+options`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-14 mt-4 bg-surface-container-highest/40 border border-outline-variant/10 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all outline-none"
                    >
                      <span className="material-symbols-outlined text-secondary text-xl">search</span>
                      <span className="font-headline font-medium text-on-surface tracking-tight">Find Healthier Alternatives</span>
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">open_in_new</span>
                    </a>
                  </section>

                  {/* ═══ Health & Nutrition Articles ═══ */}
                  <section className="mb-8">
                    <h3 className="text-sm font-headline font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">article</span> Learn More
                    </h3>
                    <div className="space-y-3">
                      {[
                        { title: 'How to Read Nutrition Labels', desc: 'FDA guide to understanding food labels', url: 'https://www.google.com/search?q=how+to+read+nutrition+labels+guide', icon: 'menu_book', color: '#3fff8b' },
                        { title: `Is ${parsedData?.productName || 'this food'} healthy?`, desc: 'Expert analysis and health impact', url: `https://www.google.com/search?q=is+${encodeURIComponent(parsedData?.productName || 'this food')}+healthy+nutrition+facts`, icon: 'health_and_safety', color: '#00e3fd' },
                        { title: 'Daily Nutrition Requirements', desc: 'Recommended daily intake for your age', url: 'https://www.google.com/search?q=daily+nutrition+requirements+recommended+dietary+allowance', icon: 'monitoring', color: '#ffb347' },
                        { title: 'Hidden Sugars in Food', desc: 'How to spot hidden sugars in packaged food', url: 'https://www.google.com/search?q=hidden+sugars+in+packaged+food+health+risks', icon: 'warning', color: '#a68cff' },
                      ].map((article, idx) => (
                        <a
                          key={idx}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl group hover:bg-surface-container transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${article.color}15` }}>
                            <span className="material-symbols-outlined" style={{ color: article.color }}>{article.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-headline text-sm font-bold text-on-surface truncate">{article.title}</p>
                            <p className="text-xs text-on-surface-variant truncate">{article.desc}</p>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors text-sm">open_in_new</span>
                        </a>
                      ))}
                    </div>
                  </section>

                  {/* Ask AI Section */}
                  <div className="bg-surface-container rounded-3xl p-6 mt-8 mb-12 border border-outline-variant/20">
                    <h3 className="text-sm font-headline font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">chat</span> Ask AI About This
                    </h3>
                    
                    <div className="h-64 overflow-y-auto mb-4 space-y-3 pr-2 scrollbar-hide">
                      {chatMessages.length === 0 && <p className="text-center text-on-surface-variant/50 text-xs italic mt-10">Have diet specific questions? Ask Lumina AI.</p>}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`max-w-[85%] p-3 text-sm rounded-2xl ${msg.role === 'user' ? 'bg-primary/10 text-on-surface ml-auto rounded-br-sm border-r-2 border-primary/40' : 'bg-surface-container-high text-on-surface-variant rounded-bl-sm'}`}>
                          <div dangerouslySetInnerHTML={{__html: msg.text}} />
                        </div>
                      ))}
                      {chatLoading && <div className="bg-surface-container-high py-3 px-4 rounded-2xl w-16 text-center text-on-surface-variant animate-pulse">...</div>}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="flex gap-2 bg-surface-container-lowest p-1 pl-4 rounded-full border border-outline-variant/30 focus-within:border-primary/50 transition-colors">
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && sendChat()}
                        placeholder="Ask a question..." 
                        className="bg-transparent flex-1 outline-none text-sm text-on-surface"
                      />
                      <button onClick={sendChat} disabled={chatLoading} className="bg-gradient-to-r from-primary to-secondary rounded-full w-10 h-10 flex items-center justify-center active:scale-95 text-on-primary">
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Added spacer to prevent bottom navigation overlap */}
            <div className="h-24"></div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </div>
    </>
  );
}
