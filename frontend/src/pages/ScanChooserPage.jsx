import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export default function ScanChooserPage() {
  return (
    <div className="max-w-md mx-auto relative min-h-[70vh] flex flex-col">
      {/* Background glow */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-[60px] pointer-events-none"></div>

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-4xl font-headline font-bold mb-3 text-on-surface leading-tight tracking-tight">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Scanner</span>
        </h1>
        <p className="text-on-surface-variant font-body text-sm px-4">
          Pick the scanning mode that works best for you.
        </p>
      </div>

      {/* Scanner Cards */}
      <div className="space-y-5 relative z-10 flex-1">

        {/* ── Lab Scanner (Live Camera) ── */}
        <Link to="/lab-scan" className="block group">
          <div className="relative bg-surface-container rounded-[28px] p-6 border border-outline-variant/20 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_50px_rgba(0,227,253,0.1)] active:scale-[0.98]">
            {/* Decorative corner brackets */}
            <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400/40 rounded-tl-md"></div>
            <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400/40 rounded-tr-md"></div>
            <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400/40 rounded-bl-md"></div>
            <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400/40 rounded-br-md"></div>

            {/* Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/8 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-all"></div>

            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-primary/15 flex items-center justify-center group-hover:from-cyan-500/25 group-hover:to-primary/25 transition-all shadow-[0_0_20px_rgba(0,227,253,0.1)]">
                <span className="material-symbols-outlined text-3xl" style={{ color: '#00e3fd' }}>biotech</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight">Lab Scanner</h3>
                  <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ color: '#00e3fd' }}>Live</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                  Real-time AR camera with futuristic HUD overlays. Point at any food and get instant analysis.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-primary">videocam</span>
                    <span className="text-[10px] text-on-surface-variant font-headline">Live Camera</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-secondary">speed</span>
                    <span className="text-[10px] text-on-surface-variant font-headline">Instant</span>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors mt-2">arrow_forward_ios</span>
            </div>
          </div>
        </Link>

        {/* ── Photo Scan (Upload) ── */}
        <Link to="/scan" className="block group">
          <div className="relative bg-surface-container rounded-[28px] p-6 border border-outline-variant/20 overflow-hidden transition-all duration-300 hover:border-secondary/40 hover:shadow-[0_20px_50px_rgba(63,255,139,0.08)] active:scale-[0.98]">
            {/* Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/12 transition-all"></div>

            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center group-hover:from-primary/25 group-hover:to-secondary/25 transition-all shadow-[0_0_20px_rgba(63,255,139,0.08)]">
                <span className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight">Photo Scan</h3>
                  <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full text-[9px] font-bold uppercase tracking-wider text-primary">Upload</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                  Upload or capture a photo for detailed AI analysis with full ingredient breakdown and chat.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-primary">photo_library</span>
                    <span className="text-[10px] text-on-surface-variant font-headline">Gallery / Camera</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-tertiary">chat</span>
                    <span className="text-[10px] text-on-surface-variant font-headline">AI Chat</span>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors mt-2">arrow_forward_ios</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Comparison footer */}
      <div className="mt-8 relative z-10">
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
          <h4 className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] text-center mb-4">Quick Comparison</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div></div>
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-sm mb-1" style={{ color: '#00e3fd' }}>biotech</span>
              <span className="text-[8px] font-headline font-bold uppercase tracking-wider" style={{ color: '#00e3fd' }}>Lab</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-sm text-primary mb-1">add_a_photo</span>
              <span className="text-[8px] font-headline font-bold text-primary uppercase tracking-wider">Photo</span>
            </div>

            {[
              { feature: 'Speed', lab: '⚡ Fast', photo: '🕐 Detailed' },
              { feature: 'AI Chat', lab: '—', photo: '✅ Yes' },
              { feature: 'Ingredients', lab: 'Summary', photo: 'Full List' },
              { feature: 'Input', lab: 'Camera', photo: 'Any Image' },
            ].map(row => (
              <Fragment key={row.feature}>
                <span className="text-[10px] text-on-surface-variant font-headline text-left">{row.feature}</span>
                <span className="text-[10px] text-on-surface font-headline">{row.lab}</span>
                <span className="text-[10px] text-on-surface font-headline">{row.photo}</span>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
