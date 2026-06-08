import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { addDiaryEntry, dayKeyFromDate } from '../db';

const OFF_URL = 'https://world.openfoodfacts.org/api/v0/product';

function pickNutriments(n) {
  if (!n || typeof n !== 'object') return {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g != null ? n.energy_100g / 4.184 : undefined) ?? null;
  return {
    kcal: kcal != null ? Number(kcal) : null,
    proteins: n.proteins_100g != null ? Number(n.proteins_100g) : null,
    carbs: n.carbohydrates_100g != null ? Number(n.carbohydrates_100g) : null,
    fat: n.fat_100g != null ? Number(n.fat_100g) : null,
  };
}

export default function BarcodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  
  const scannerRef = useRef(null);
  const [scannerReady, setScannerReady] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState('snack');
  const [dayKey, setDayKey] = useState(() => dayKeyFromDate(new Date()));

  useEffect(() => {
    const id = 'barcode-reader';
    const scanner = new Html5QrcodeScanner(
      id,
      { fps: 8, qrbox: { width: 260, height: 160 }, aspectRatio: 1.777 },
      false
    );

    scanner.render(
      (decodedText) => {
        setCode(String(decodedText).replace(/\s/g, ''));
        scanner.clear().catch(() => {});
        setScannerReady(false);
      },
      () => {}
    );
    scannerRef.current = scanner;
    setScannerReady(true);

    return () => {
      scannerRef.current?.clear?.().catch(() => {});
      scannerRef.current = null;
    };
  }, []);

  const lookup = async () => {
    const c = code.trim();
    if (!c) { setError('Enter a barcode.'); return; }
    setError(''); setLoading(true); setProduct(null);
    try {
      const res = await fetch(`${OFF_URL}/${encodeURIComponent(c)}.json`);
      const data = await res.json();
      if (data.status === 0 || !data.product) throw new Error(data.status_verbose || 'Product not found.');
      setProduct(data.product);
    } catch (e) {
      setError(e.message || 'Lookup failed.');
    } finally { setLoading(false); }
  };

  const n100 = product ? pickNutriments(product.nutriments) : null;
  const g = Math.max(1, parseFloat(grams) || 100);
  const factor = g / 100;
  const scaled = n100 ? {
    calories: n100.kcal != null ? n100.kcal * factor : null,
    protein: n100.proteins != null ? n100.proteins * factor : null,
    carbs: n100.carbs != null ? n100.carbs * factor : null,
    fat: n100.fat != null ? n100.fat * factor : null,
  } : null;

  const saveToDiary = async () => {
    if (!product) return;
    const name = product.product_name || product.product_name_en || 'Unknown product';
    await addDiaryEntry({
      dayKey, mealType, name: `${name} (${g}g)`,
      calories: scaled?.calories ?? 0, protein: scaled?.protein ?? 0,
      carbs: scaled?.carbs ?? 0, fat: scaled?.fat ?? 0,
      source: 'barcode', barcode: code,
    });
    setAddOpen(false);
    navigate('/diary');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold mb-3">
          Barcode <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Lookup</span>
        </h1>
        <p className="text-on-surface-variant font-body text-sm">Look up packaged foods via Open Food Facts.</p>
      </div>

      <div className="bg-surface-container rounded-2xl p-5 mb-6 border border-outline-variant/20 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-secondary">qr_code_scanner</span> Camera Scanner</h3>
        <div id="barcode-reader" className={`w-full overflow-hidden rounded-xl bg-surface-container-low border-2 border-dashed border-outline-variant/30 ${!scannerReady ? 'min-h-[120px]' : ''}`}></div>
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          placeholder="Enter barcode..."
          className="flex-1 bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
        />
        <button onClick={lookup} disabled={loading} className="bg-gradient-to-r from-primary to-secondary text-surface w-24 rounded-xl font-headline font-bold text-sm active:scale-95 transition-transform">
          {loading ? '...' : 'Lookup'}
        </button>
      </div>

      {error && <div className="bg-error/10 text-error p-3 rounded-xl text-sm mb-4 border border-error/20">{error}</div>}

      {product && (
        <div className="bg-surface-container rounded-[24px] overflow-hidden border border-outline-variant/20 shadow-xl mb-8">
          <div className="p-6">
            <h2 className="font-headline font-bold text-xl mb-1">{product.product_name || product.product_name_en || 'Unknown Product'}</h2>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-6 font-headline">{product.brands || 'Unknown Brand'}</p>
            
            {n100 && (
              <div className="grid grid-cols-4 gap-2 mb-6 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                <div className="text-center">
                  <span className="block text-primary font-headline font-bold text-lg">{Math.round(n100.kcal) || '-'}</span>
                  <span className="block text-[8px] text-on-surface-variant tracking-wider uppercase font-headline">Kcal</span>
                </div>
                <div className="text-center">
                  <span className="block text-secondary font-headline font-bold text-lg">{n100.proteins?.toFixed(1) || '-'}</span>
                  <span className="block text-[8px] text-on-surface-variant tracking-wider uppercase font-headline">Pro (g)</span>
                </div>
                <div className="text-center">
                  <span className="block text-[#ffb347] font-headline font-bold text-lg">{n100.carbs?.toFixed(1) || '-'}</span>
                  <span className="block text-[8px] text-on-surface-variant tracking-wider uppercase font-headline">Carbs (g)</span>
                </div>
                <div className="text-center">
                  <span className="block text-tertiary font-headline font-bold text-lg">{n100.fat?.toFixed(1) || '-'}</span>
                  <span className="block text-[8px] text-on-surface-variant tracking-wider uppercase font-headline">Fat (g)</span>
                </div>
              </div>
            )}

            <button onClick={() => setAddOpen(true)} className="w-full bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/30 rounded-xl py-3 font-headline font-bold active:scale-95 transition-transform flex justify-center items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[18px]">add_circle</span> Add to Diary
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-surface-container w-full max-w-sm rounded-[32px] p-6 border border-outline-variant/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h3 className="font-headline font-bold text-lg mb-4">Add Portion</h3>
            <div className="space-y-4">
              <input type="date" value={dayKey} onChange={e => setDayKey(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <select value={mealType} onChange={e => setMealType(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary appearance-none">
                <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
              </select>
              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Serving Size (g/ml)</label>
                <input type="number" value={grams} onChange={e => setGrams(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              </div>
              <p className="text-xs text-secondary bg-secondary/10 p-2 rounded-lg text-center mt-2 font-headline tracking-wide">
                Est: {scaled?.calories ? Math.round(scaled.calories) : 0} kcal per {g}g
              </p>
              <div className="flex gap-2">
                <button onClick={() => setAddOpen(false)} className="flex-1 py-3 text-sm text-on-surface-variant font-bold">Cancel</button>
                <button onClick={saveToDiary} className="flex-1 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-surface font-headline font-bold">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
