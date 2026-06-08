import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveScan, addDiaryEntry, dayKeyFromDate } from '../db';
import { parseRatingFromAnalysis, stripRatingLine } from '../analysisUtils';
import { getUserProfile } from '../auth';

const configuredApiBase = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');
// Reject values that aren't valid URLs (e.g. API keys accidentally set as VITE_BACKEND_URL)
const isValidUrl = /^https?:\/\//i.test(configuredApiBase);
const API_BASE = !isValidUrl ? '' : /:11434(?:\/|$)/.test(configuredApiBase) ? 'http://localhost:5000' : configuredApiBase;
function toApiUrl(path) { return `${API_BASE}${path}`; }

function extractJSON(text) {
  const tagMatch = text.match(/<JSON_DATA>([\s\S]*?)<\/JSON_DATA>/i);
  if (tagMatch) { try { return JSON.parse(tagMatch[1].replace(/```json/gi, '').replace(/```/g, '').trim()); } catch (_) { } }
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch (_) { } }
  const braceMatches = text.match(/\{[\s\S]*\}/g);
  if (braceMatches) { for (let i = braceMatches.length - 1; i >= 0; i--) { try { const p = JSON.parse(braceMatches[i]); if (p.macros || p.productName) return p; } catch (_) { } } }
  return null;
}
function parseMacrosFromText(text) {
  const m = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const cal = text.match(/(?:total\s*(?:energy|calories?))[:\s~≈]*(?:approx\w*\s*)?(\d[\d,]*)\s*(?:kcal|cal)/i) || text.match(/(\d[\d,]*)\s*(?:kcal|calories?)/i) || text.match(/calories?[:\s~≈]*(\d[\d,]*)/i);
  if (cal) m.calories = parseFloat(cal[1].replace(/,/g, '')) || 0;
  const pro = text.match(/protein[:\s~≈]*(?:approx\w*\s*)?([\d.]+)\s*g/i);
  if (pro) m.protein = parseFloat(pro[1]) || 0;
  const carb = text.match(/(?:carb(?:ohydrate)?s?|total carb)[:\s~≈]*(?:approx\w*\s*)?([\d.]+)\s*g/i);
  if (carb) m.carbs = parseFloat(carb[1]) || 0;
  const fat = text.match(/(?:total\s*)?fat[:\s~≈]*(?:approx\w*\s*)?([\d.]+)\s*g/i);
  if (fat) m.fat = parseFloat(fat[1]) || 0;
  const fib = text.match(/fib(?:er|re)[:\s~≈]*(?:approx\w*\s*)?([\d.]+)\s*g/i);
  if (fib) m.fiber = parseFloat(fib[1]) || 0;
  return m;
}

/* ── Corner bracket ── */
function Bracket({ pos, size = 32, color = '#00e3fd', animate }) {
  const base = { position: 'absolute', width: size, height: size, pointerEvents: 'none', transition: 'opacity 0.3s' };
  const bw = '2.5px';
  const anim = animate ? { animation: 'bracketPulse 2.5s ease-in-out infinite' } : {};
  const delay = pos === 'tr' ? '0.6s' : pos === 'bl' ? '1.2s' : pos === 'br' ? '1.8s' : '0s';

  const styles = {
    tl: { top: 0, left: 0, borderTop: `${bw} solid ${color}`, borderLeft: `${bw} solid ${color}`, borderRadius: '6px 0 0 0' },
    tr: { top: 0, right: 0, borderTop: `${bw} solid ${color}`, borderRight: `${bw} solid ${color}`, borderRadius: '0 6px 0 0' },
    bl: { bottom: 0, left: 0, borderBottom: `${bw} solid ${color}`, borderLeft: `${bw} solid ${color}`, borderRadius: '0 0 0 6px' },
    br: { bottom: 0, right: 0, borderBottom: `${bw} solid ${color}`, borderRight: `${bw} solid ${color}`, borderRadius: '0 0 6px 0' },
  };
  return <div style={{ ...base, ...styles[pos], ...anim, animationDelay: delay }} />;
}

export default function LabScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const hasAutoScanned = useRef(false);
  const doCaptureRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(true);
  const [phase, setPhase] = useState('init'); // init | scanning | processing | result | error
  const [scanLine, setScanLine] = useState(0);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [userProfile, setUserProfile] = useState({ age: '', weight: '', height: '', diet: 'Balanced Diet' });

  useEffect(() => {
    const p = getUserProfile();
    if (p && typeof p === 'object') setUserProfile(prev => ({ ...prev, ...p }));
  }, []);

  /* ── Camera ── */
  useEffect(() => {
    let mounted = true;
    setCameraLoading(true);

    // Timeout: if camera never becomes ready within 10s, show a helpful error
    const cameraTimeout = setTimeout(() => {
      if (mounted && !cameraReady && !cameraError) {
        setCameraLoading(false);
        setCameraError('Camera is taking too long to start. Please check permissions and try again.');
      }
    }, 10000);

    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (mounted) {
            setCameraLoading(false);
            setCameraError('Camera not supported. Please use HTTPS or try a different browser.');
          }
          return;
        }

        // Quick check: does this device even have a camera?
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(d => d.kind === 'videoinput');
          if (!hasCamera) {
            if (mounted) {
              setCameraLoading(false);
              setCameraError('No camera found on this device. Use Photo Scan instead.');
            }
            return;
          }
        } catch (_) { /* enumerateDevices not supported, continue anyway */ }

        // Try rear camera first, then fall back to any camera
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
          });
        } catch (envErr) {
          // Fallback: try front camera (useful on laptops)
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
          });
        }

        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Use multiple events for broader mobile compatibility
          const markReady = () => {
            if (mounted && !cameraReady) {
              setCameraReady(true);
              setCameraLoading(false);
            }
          };
          videoRef.current.onloadeddata = markReady;
          videoRef.current.onplaying = markReady;
          videoRef.current.oncanplay = markReady;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (mounted) {
          setCameraLoading(false);
          const msg = err.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access.' 
            : err.name === 'NotFoundError' ? 'No camera found on this device. Use Photo Scan instead.'
            : err.name === 'NotReadableError' ? 'Camera is in use by another app.'
            : err.name === 'OverconstrainedError' ? 'Camera does not support required settings. Trying Photo Scan may work better.'
            : 'Camera access failed: ' + (err.message || 'Unknown error');
          setCameraError(msg);
        }
      }
    })();
    return () => { mounted = false; clearTimeout(cameraTimeout); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  /* ── Keep capture ref current (placed after doCapture definition via hoisting) ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doCaptureRef.current = doCapture; });

  /* ── Auto-scan as soon as camera is ready ── */
  useEffect(() => {
    if (cameraReady && !hasAutoScanned.current && phase === 'init') {
      hasAutoScanned.current = true;
      // Small delay to let the user see the camera feed briefly
      const t = setTimeout(() => {
        if (doCaptureRef.current) doCaptureRef.current();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [cameraReady, phase]);

  /* ── Scan line ── */
  useEffect(() => {
    if (phase !== 'scanning' && phase !== 'processing') return;
    const id = setInterval(() => setScanLine(p => (p + 1.2) % 100), 25);
    return () => clearInterval(id);
  }, [phase]);

  /* ── Capture & Analyze ── */
  const doCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    // Guard against zero-dimension video (camera not ready yet)
    if (!video.videoWidth || !video.videoHeight) {
      setErrorMsg('Camera not ready yet. Please wait a moment and try again.');
      setPhase('error');
      return;
    }

    setPhase('scanning');
    setResult(null);
    setErrorMsg('');
    // Brief scan animation (reduced from 1500ms for speed)
    await new Promise(r => setTimeout(r, 400));

    const canvas = canvasRef.current;
    // Use smaller resolution for faster upload (800px vs 1200px)
    canvas.width = Math.min(video.videoWidth, 800);
    canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // Lower quality for faster upload
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    const base64 = dataUrl.split(',')[1];

    const thumbC = document.createElement('canvas');
    thumbC.width = 200; thumbC.height = Math.round(200 * (canvas.height / canvas.width));
    thumbC.getContext('2d').drawImage(canvas, 0, 0, thumbC.width, thumbC.height);
    const thumbnail = thumbC.toDataURL('image/jpeg', 0.5);

    setPhase('processing');

    try {
      // Single API call: OCR + Analysis combined for speed
      const scanRes = await fetch(toApiUrl('/api/quick-scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', profile: userProfile })
      });
      if (!scanRes.ok) {
        const errData = await scanRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Scan failed');
      }
      const { analysis } = await scanRes.json();
      if (!analysis) throw new Error('Empty analysis');

      // Parse the quick-scan JSON response
      let data = { productName: 'Unknown Item', macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, alerts: [], rating: 5, ratingLabel: 'MODERATE' };
      const jsonData = extractJSON(analysis);
      if (jsonData) data = { ...data, ...jsonData };

      // Fallback: parse macros from text if JSON had zeros
      if (!(data.macros.calories > 0 || data.macros.protein > 0)) {
        const fb = parseMacrosFromText(analysis);
        data.macros = { calories: fb.calories || data.macros.calories, protein: fb.protein || data.macros.protein, carbs: fb.carbs || data.macros.carbs, fat: fb.fat || data.macros.fat, fiber: fb.fiber || data.macros.fiber };
      }

      const rating = data.rating || parseRatingFromAnalysis(analysis) || 5;
      let ratingLabel = data.ratingLabel || 'MODERATE', ratingColor = '#ffb347';
      if (rating >= 7 || ratingLabel === 'GOOD') { ratingLabel = 'GOOD'; ratingColor = '#3fff8b'; }
      else if (rating <= 3 || ratingLabel === 'POOR') { ratingLabel = 'POOR'; ratingColor = '#ff6b6b'; }

      await saveScan(userProfile, analysis, data.productName, data.macros, thumbnail);
      await addDiaryEntry({ dayKey: dayKeyFromDate(new Date()), mealType: 'snack', name: data.productName, calories: data.macros.calories || 0, protein: data.macros.protein || 0, carbs: data.macros.carbs || 0, fat: data.macros.fat || 0, source: 'lab-scan' });

      setResult({ productName: data.productName, rating, ratingLabel, ratingColor, macros: data.macros });
      setPhase('result');
    } catch (err) {
      console.error('Lab scan error:', err);
      setErrorMsg(err.message);
      setPhase('error');
    }
  }, [userProfile]);

  const handleRescan = () => { setResult(null); setPhase('scanning'); setTimeout(() => doCapture(), 200); };

  /* ── Macro ring helper ── */
  const MacroRing = ({ value, max, label, unit, color, size = 52 }) => {
    const pct = Math.min(100, (value / max) * 100);
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
        </svg>
        <span className="font-headline text-sm font-bold text-white mt-1.5" style={{ marginTop: -size / 2 - 7, position: 'relative' }}>{Math.round(value)}<span className="text-[8px] text-white/50">{unit}</span></span>
        <span className="text-[8px] text-white/40 uppercase tracking-wider font-mono mt-1">{label}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* ═══ TOP BAR ═══ */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-5 pt-[env(safe-area-inset-top,14px)] pb-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-white text-lg">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phase === 'result' ? '#3fff8b' : '#00e3fd', animation: 'dotPulse 1.5s infinite' }} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[3px]" style={{ color: '#00e3fd' }}>Lab Scanner</span>
        </div>
        <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-white/60 text-lg">home</span>
        </button>
      </header>

      {/* ═══ CAMERA ═══ */}
      <div className="absolute inset-0">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-[60] p-8">
            <div className="text-center max-w-sm">
              <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">videocam_off</span>
              <p className="text-white/70 text-sm mb-6">{cameraError}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3.5 bg-white/10 text-white/80 rounded-full text-sm font-bold cursor-pointer active:scale-95 transition-transform relative z-[70] hover:bg-white/20"
                >
                  Retry Camera
                </button>
                <button
                  onClick={() => navigate('/scan')}
                  className="w-full px-6 py-3.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-sm font-bold cursor-pointer active:scale-95 transition-transform relative z-[70] hover:bg-emerald-500/30"
                >
                  Use Photo Scan Instead
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 text-white/40 text-xs cursor-pointer active:scale-95 transition-transform relative z-[70] hover:text-white/60"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            {/* Loading overlay while camera initializes */}
            {cameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
                <div className="w-16 h-16 rounded-full border-[3px] border-slate-700 border-t-cyan-400 animate-spin mb-6"></div>
                <p className="font-mono text-[10px] uppercase tracking-[4px] text-cyan-400 animate-pulse">Initializing Camera...</p>
                <p className="text-white/30 text-[9px] mt-3">Please allow camera permission if prompted</p>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ═══ SCANNING OVERLAYS ═══ */}
      {cameraReady && (
        <div className="absolute inset-0 z-10">
          {/* Vignette */}
          <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 100px 30px rgba(0,0,0,0.55)' }} />

          {/* Main viewfinder */}
          <div className="absolute top-[18%] left-[12%] right-[12%] bottom-[38%]">
            <Bracket pos="tl" animate={phase !== 'result'} />
            <Bracket pos="tr" animate={phase !== 'result'} />
            <Bracket pos="bl" animate={phase !== 'result'} />
            <Bracket pos="br" animate={phase !== 'result'} />

            {/* Scan sweep line */}
            {(phase === 'scanning' || phase === 'processing') && (
              <div className="absolute left-0 right-0 h-[1.5px] pointer-events-none" style={{ top: `${scanLine}%`, background: 'linear-gradient(90deg, transparent 0%, #00e3fd 30%, #3fff8b 50%, #00e3fd 70%, transparent 100%)', boxShadow: '0 0 20px 4px rgba(0,227,253,0.25)' }} />
            )}
          </div>

          {/* Status text */}
          <div className="absolute left-0 right-0 flex justify-center" style={{ top: '13%' }}>
            <span className="font-mono text-[9px] uppercase tracking-[4px]" style={{ color: phase === 'result' ? '#3fff8b' : phase === 'error' ? '#ff6b6b' : '#00e3fd', animation: phase === 'processing' ? 'processingPulse 1.5s infinite' : phase === 'init' ? 'processingPulse 1.5s infinite' : 'none' }}>
              {phase === 'init' ? '◎ Auto-scanning...' : phase === 'scanning' ? '◎ Capturing...' : phase === 'processing' ? '◈ Analyzing with AI...' : phase === 'result' ? '✓ Analysis Complete' : phase === 'error' ? '✕ ' + errorMsg : ''}
            </span>
          </div>

          {/* ═══ TAP TO SCAN button (shown as small fallback during init, or not auto-scanning) ═══ */}
          {phase === 'init' && (
            <div className="absolute left-0 right-0 flex flex-col items-center" style={{ bottom: '10%', animation: 'fadeSlideUp 0.5s ease-out' }}>
              <button onClick={() => { hasAutoScanned.current = true; doCapture(); }} className="h-16 w-16 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: 'radial-gradient(circle, rgba(0,227,253,0.3) 0%, rgba(0,227,253,0.1) 60%, transparent 70%)', border: '2px solid rgba(0,227,253,0.4)', boxShadow: '0 0 20px rgba(0,227,253,0.15)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: '#00e3fd' }}>photo_camera</span>
              </button>
              <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest mt-2">or tap to scan now</span>
            </div>
          )}

          {/* ═══ RESULT OVERLAY ═══ */}
          {result && phase === 'result' && (
            <>
              {/* Product name + rating badge */}
              <div className="absolute left-4 right-4" style={{ top: '7%', animation: 'fadeSlideDown 0.5s ease-out' }}>
                <div className="bg-black/60 backdrop-blur-2xl rounded-2xl px-5 py-4 border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <h2 className="font-headline text-lg font-bold text-white truncate pr-3">{result.productName}</h2>
                    <span className="flex-shrink-0 px-3 py-1 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider" style={{ backgroundColor: `${result.ratingColor}15`, color: result.ratingColor, border: `1px solid ${result.ratingColor}30` }}>{result.ratingLabel}</span>
                  </div>
                </div>
              </div>

              {/* Calorie center display */}
              <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: '42%', animation: 'fadeScaleIn 0.6s ease-out' }}>
                <div className="bg-black/50 backdrop-blur-xl rounded-3xl px-8 py-5 border border-white/[0.06] text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-headline text-5xl font-black text-white" style={{ textShadow: `0 0 30px ${result.ratingColor}30` }}>{Math.round(result.macros.calories)}</span>
                    <span className="text-white/40 text-sm font-headline">kcal</span>
                  </div>
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden w-40 mx-auto">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (result.macros.calories / 600) * 100)}%`, background: `linear-gradient(90deg, ${result.ratingColor}, #00e3fd)`, transition: 'width 1s ease-out' }} />
                  </div>
                  <span className="text-[8px] text-white/30 font-mono uppercase tracking-widest mt-1.5 block">Energy Intake</span>
                </div>
              </div>

              {/* Macro rings row */}
              <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: '22%', animation: 'fadeSlideUp 0.7s ease-out' }}>
                <div className="bg-black/50 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/[0.06] flex gap-5">
                  <MacroRing value={result.macros.protein} max={50} label="Protein" unit="g" color="#00e3fd" />
                  <MacroRing value={result.macros.carbs} max={80} label="Carbs" unit="g" color="#3fff8b" />
                  <MacroRing value={result.macros.fat} max={40} label="Fat" unit="g" color="#ffb347" />
                  <MacroRing value={result.macros.fiber} max={15} label="Fiber" unit="g" color="#a68cff" />
                </div>
              </div>

              {/* Bottom actions */}
              <div className="absolute left-4 right-4 flex gap-3" style={{ bottom: '8%', animation: 'fadeSlideUp 0.8s ease-out' }}>
                <button onClick={handleRescan} className="flex-1 h-14 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-white/70 text-xl">refresh</span>
                  <span className="font-headline text-sm font-bold text-white/70">Scan Again</span>
                </button>
                <button onClick={() => navigate('/')} className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #3fff8b, #00e3fd)', boxShadow: '0 8px 25px rgba(63,255,139,0.2)' }}>
                  <span className="material-symbols-outlined text-slate-900 text-xl">check_circle</span>
                  <span className="font-headline text-sm font-bold text-slate-900">Done</span>
                </button>
              </div>

              {/* Saved indicator */}
              <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: '3%' }}>
                <span className="text-[8px] font-mono text-white/25 uppercase tracking-[2px]">✓ Auto-saved to diary</span>
              </div>
            </>
          )}

          {/* ═══ ERROR state ═══ */}
          {phase === 'error' && (
            <div className="absolute left-4 right-4 bottom-[15%] flex flex-col items-center gap-3" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
              <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl px-6 py-4 border border-red-500/20 text-center w-full">
                <span className="material-symbols-outlined text-red-400 text-2xl mb-2 block">error_outline</span>
                <p className="text-red-300 text-xs font-headline mb-1">Scan Failed</p>
                <p className="text-white/40 text-[10px]">{errorMsg}</p>
              </div>
              <button onClick={handleRescan} className="h-12 px-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-white/70">refresh</span>
                <span className="font-headline text-sm font-bold text-white/70">Try Again</span>
              </button>
            </div>
          )}

          {/* Engine version watermark */}
          <div className="absolute right-3" style={{ bottom: '3%' }}>
            <span className="font-mono text-[7px] text-white/15 uppercase tracking-wider">V-Scan v2.4</span>
          </div>
        </div>
      )}

      {/* ═══ KEYFRAMES ═══ */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes bracketPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes processingPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeSlideDown { 0%{opacity:0;transform:translateY(-16px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlideUp { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes fadeScaleIn { 0%{opacity:0;transform:scale(.85)} 100%{opacity:1;transform:scale(1)} }
      `}} />
    </div>
  );
}
