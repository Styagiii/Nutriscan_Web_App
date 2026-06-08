import { useEffect, useState, useMemo } from 'react';
import { addDiaryEntry, getDiaryForDay, deleteDiaryEntry, dayKeyFromDate } from '../db';

const MEALS = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅', color: '#ffb347' },
  { value: 'lunch', label: 'Lunch', icon: '☀️', color: '#3fff8b' },
  { value: 'dinner', label: 'Dinner', icon: '🌙', color: '#00e3fd' },
  { value: 'snack', label: 'Snack', icon: '🍿', color: '#a68cff' },
];

export default function DiaryPage() {
  const [dayKey, setDayKey] = useState(() => dayKeyFromDate(new Date()));
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mealType: 'breakfast', name: '', calories: '', protein: '', carbs: '', fat: '' });

  const load = () => getDiaryForDay(dayKey).then(setEntries).catch(console.error);
  useEffect(() => { load(); }, [dayKey]);

  const totals = useMemo(() => ({
    calories: entries.reduce((a, e) => a + (Number(e.calories) || 0), 0),
    protein: entries.reduce((a, e) => a + (Number(e.protein) || 0), 0),
    carbs: entries.reduce((a, e) => a + (Number(e.carbs) || 0), 0),
    fat: entries.reduce((a, e) => a + (Number(e.fat) || 0), 0),
  }), [entries]);

  const grouped = useMemo(() => {
    const g = { breakfast: [], lunch: [], dinner: [], snack: [] };
    entries.forEach((e) => { if (g[e.mealType || 'snack']) g[e.mealType || 'snack'].push(e); });
    return g;
  }, [entries]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addDiaryEntry({
      dayKey, mealType: form.mealType, name: form.name.trim(),
      calories: parseFloat(form.calories) || 0, protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0, source: 'manual'
    });
    setForm({ mealType: form.mealType, name: '', calories: '', protein: '', carbs: '', fat: '' });
    setOpen(false);
    load();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold">Food <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Diary</span></h1>
          <p className="text-on-surface-variant font-body text-sm mt-2">Log meals and track daily energy.</p>
        </div>
        <button onClick={() => setOpen(true)} className="bg-primary/20 text-primary w-12 h-12 rounded-full flex justify-center items-center active:scale-95 transition-transform">
          <span className="material-symbols-outlined font-bold">add</span>
        </button>
      </div>

      <input 
        type="date" 
        value={dayKey} 
        onChange={e => setDayKey(e.target.value)} 
        className="w-full bg-surface-container rounded-xl px-4 py-3 mb-6 text-on-surface font-headline border border-outline-variant/30 focus:outline-none focus:border-primary block"
      />

      {/* Macros Row */}
      <div className="flex gap-3 mb-8 overflow-x-auto scrollbar-hide pb-2">
        {[{ label: 'KCAL', val: totals.calories, color: 'text-primary' }, { label: 'PRO (g)', val: totals.protein, color: 'text-secondary' }, { label: 'CARB (g)', val: totals.carbs, color: 'text-[#ffb347]' }, { label: 'FAT (g)', val: totals.fat, color: 'text-tertiary' }].map(m => (
          <div key={m.label} className="bg-surface-container-low p-4 rounded-2xl flex-1 text-center min-w-[80px]">
            <span className={`block font-headline font-bold text-xl ${m.color}`}>{Math.round(m.val)}</span>
            <span className="block text-[9px] font-headline text-on-surface-variant tracking-wider">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Meals List */}
      <div className="bg-surface-container rounded-[24px] p-6 shadow-[0_20px_40px_-10px_rgba(0,227,253,0.05)] border border-outline-variant/20 mb-8">
        {entries.length === 0 ? (
          <div className="text-center py-10 opacity-60">
            <span className="material-symbols-outlined text-4xl mb-2">restaurant_menu</span>
            <p className="font-headline text-sm font-bold text-on-surface">No entries for this day</p>
          </div>
        ) : (
          MEALS.map(meal => {
            const list = grouped[meal.value];
            if (!list.length) return null;
            return (
              <div key={meal.value} className="mb-6 last:mb-0">
                <h3 className="font-headline font-bold flex items-center gap-2 mb-3 text-sm">
                  <span>{meal.icon}</span> <span style={{ color: meal.color }}>{meal.label}</span>
                </h3>
                <div className="space-y-2">
                  {list.map(e => (
                    <div key={e.id} className="bg-surface-container-high rounded-xl p-3 flex justify-between items-center group">
                      <div>
                        <p className="font-headline font-bold text-sm">{e.name}</p>
                        <p className="text-xs text-on-surface-variant font-headline mt-0.5">
                          {Math.round(e.calories)} kcal · P {Math.round(e.protein)} · C {Math.round(e.carbs)} · F {Math.round(e.fat)}
                        </p>
                      </div>
                      <button onClick={() => { deleteDiaryEntry(e.id); load(); }} className="h-8 w-8 rounded-full bg-error/10 text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Custom Add Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-surface-container w-full max-w-sm rounded-[32px] p-6 border border-outline-variant/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-xl">Add Food</h3>
              <button onClick={() => setOpen(false)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>
            
            <div className="space-y-4">
              <select value={form.mealType} onChange={e => setForm(f => ({ ...f, mealType: e.target.value }))} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-primary">
                {MEALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              
              <input type="text" placeholder="Food name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
              
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Kcal" value={form.calories} onChange={e => setForm(f => ({...f, calories: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
                <input type="number" placeholder="Protein (g)" value={form.protein} onChange={e => setForm(f => ({...f, protein: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
                <input type="number" placeholder="Carbs (g)" value={form.carbs} onChange={e => setForm(f => ({...f, carbs: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
                <input type="number" placeholder="Fat (g)" value={form.fat} onChange={e => setForm(f => ({...f, fat: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>

              <button onClick={handleAdd} className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-on-primary-container font-headline font-bold rounded-full py-3">Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
