import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/scan-choose', label: 'Scan', icon: 'qr_code_scanner' },
  { to: '/diary', label: 'Diary', icon: 'monitoring' },
];

export default function AppLayout() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md rounded-2xl z-50 bg-slate-950/60 backdrop-blur-lg dark:bg-slate-950/60 shadow-[0_20px_40px_-10px_rgba(0,227,253,0.1)] flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined nutriscan-glow" style={{ backgroundImage: 'linear-gradient(90deg, #3fff8b, #00e3fd, #a68cff, #ff6bca, #00e3fd, #3fff8b)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'colorShift 6s linear infinite' }}>biotech</span>
          <span className="text-xl font-bold tracking-widest uppercase font-headline nutriscan-glow" style={{ backgroundImage: 'linear-gradient(90deg, #3fff8b, #00e3fd, #a68cff, #ff6bca, #00e3fd, #3fff8b)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'colorShift 6s linear infinite' }}>NutriScan</span>
        </div>
        <Link to="/profile" className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-5 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform font-headline">
          Get Started
        </Link>
      </nav>

      <main className="pt-28 pb-32 px-6 max-w-md mx-auto">
        <Outlet />
      </main>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md rounded-[32px] z-50 py-2 bg-slate-900/80 backdrop-blur-xl dark:bg-slate-900/80 shadow-[0_-10px_40px_-15px_rgba(0,227,253,0.15)] flex justify-around items-center px-4">
        <Link to="/" className={`flex flex-col items-center justify-center rounded-full transition-all cursor-pointer ${currentPath === '/' || currentPath === '/dashboard' ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 px-5 py-2 scale-110 shadow-lg shadow-emerald-500/20 active:scale-90' : 'text-slate-500 hover:text-emerald-300 py-2 active:scale-90'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/' || currentPath === '/dashboard' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Home</span>
        </Link>
        <Link to="/scan-choose" className={`flex flex-col items-center justify-center rounded-full transition-all cursor-pointer ${currentPath.includes('/scan') || currentPath.includes('/lab-scan') ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 px-5 py-2 scale-110 shadow-lg shadow-emerald-500/20 active:scale-90' : 'text-slate-500 hover:text-emerald-300 py-2 active:scale-90'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath.includes('/scan') || currentPath.includes('/lab-scan') ? "'FILL' 1" : "'FILL' 0" }}>qr_code_scanner</span>
          <span className="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Scan</span>
        </Link>
        <Link to="/diary" className={`flex flex-col items-center justify-center rounded-full transition-all cursor-pointer ${currentPath.includes('/diary') ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 px-5 py-2 scale-110 shadow-lg shadow-emerald-500/20 active:scale-90' : 'text-slate-500 hover:text-emerald-300 py-2 active:scale-90'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath.includes('/diary') ? "'FILL' 1" : "'FILL' 0" }}>monitoring</span>
          <span className="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Diary</span>
        </Link>
      </footer>
    </>
  );
}

/* Injected via a small style tag inside the component would be messy,
   so we inject the keyframes once into <head> on mount. */
if (typeof document !== 'undefined' && !document.getElementById('nutriscan-logo-anim')) {
  const style = document.createElement('style');
  style.id = 'nutriscan-logo-anim';
  style.textContent = `
    @keyframes colorShift {
      0%   { background-position: 0% 50%; }
      100% { background-position: 300% 50%; }
    }
    .nutriscan-glow {
      filter: drop-shadow(0 0 8px rgba(63,255,139,0.3));
    }
  `;
  document.head.appendChild(style);
}
