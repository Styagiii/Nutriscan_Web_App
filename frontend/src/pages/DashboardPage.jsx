import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAllScans } from '../db';
import { getDiaryForDay, dayKeyFromDate } from '../db';

/* ───────────────────── Scroll-reveal hook ───────────────────── */
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

/* ───────────────────── Parallax Y offset hook ───────────────── */
function useParallax(speed = 0.15) {
  const [offset, setOffset] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      setOffset((window.innerHeight / 2 - center) * speed);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);

  return [ref, offset];
}

/* ────────── Floating particle component ────────── */
function FloatingParticle({ size, left, delay, duration, color }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left, top: '-10%',
        background: color || 'rgba(63,255,139,0.15)',
        animation: `floatDown ${duration || '18s'} ${delay || '0s'} linear infinite`,
        filter: 'blur(1px)',
      }}
    />
  );
}

export default function DashboardPage() {
  const location = useLocation();
  const [scans, setScans] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  /* Scroll-reveal refs */
  const [heroRef, heroVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();
  const [macroRef, macroVisible] = useScrollReveal();
  const [featureRef, featureVisible] = useScrollReveal();
  const [howRef, howVisible] = useScrollReveal();
  const [scansRef, scansVisible] = useScrollReveal();
  const [superfoodRef, superfoodVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  /* Parallax refs */
  const [heroImgRef, heroImgOffset] = useParallax(0.12);
  const [featureImgRef, featureImgOffset] = useParallax(0.1);
  const [superfoodImgRef, superfoodImgOffset] = useParallax(0.08);

  useEffect(() => {
    const loadData = () => {
      getAllScans().then(setScans).catch(console.error);
      const dayKey = dayKeyFromDate(new Date());
      getDiaryForDay(dayKey).then(entries => {
        let cal = 0, p = 0, c = 0, f = 0;
        entries.forEach(e => {
          cal += Number(e.calories) || 0;
          p += Number(e.protein) || 0;
          c += Number(e.carbs) || 0;
          f += Number(e.fat) || 0;
        });
        setTotals({ calories: cal, protein: p, carbs: c, fat: f });
      }).catch(console.error);
    };

    loadData();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', loadData);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', loadData);
    };
  }, [location.key]);

  const totalCals = 2400;
  const exceeded = totals.calories >= totalCals;
  const progressPct = Math.min(100, Math.max(0, (totals.calories / totalCals) * 100));
  const sortedScans = [...scans].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  const reveal = (v) =>
    `transition-all duration-[900ms] ease-out ${v ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`;
  const revealLeft = (v) =>
    `transition-all duration-[900ms] ease-out ${v ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`;
  const revealRight = (v) =>
    `transition-all duration-[900ms] ease-out ${v ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`;
  const scaleIn = (v) =>
    `transition-all duration-[800ms] ease-out ${v ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`;

  return (
    <div className="relative overflow-hidden">
      {/* ═══════ Animated blurred background blobs ═══════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Large drifting orbs */}
        <div className="absolute w-72 h-72 rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #3fff8b, transparent 70%)', filter: 'blur(60px)', animation: 'blobDrift1 20s ease-in-out infinite', top: '10%', left: '-5%' }} />
        <div className="absolute w-96 h-96 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #00e3fd, transparent 70%)', filter: 'blur(80px)', animation: 'blobDrift2 25s ease-in-out infinite', top: '30%', right: '-10%' }} />
        <div className="absolute w-64 h-64 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #a68cff, transparent 70%)', filter: 'blur(70px)', animation: 'blobDrift3 22s ease-in-out infinite', bottom: '20%', left: '10%' }} />
        <div className="absolute w-80 h-80 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #ff6bca, transparent 70%)', filter: 'blur(90px)', animation: 'blobDrift4 28s ease-in-out infinite', top: '60%', right: '5%' }} />
        <div className="absolute w-56 h-56 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #3fff8b, transparent 70%)', filter: 'blur(50px)', animation: 'blobDrift5 18s ease-in-out infinite', top: '80%', left: '40%' }} />
      </div>

      {/* ═══════ Floating micro-particles ═══════ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <FloatingParticle size="6px" left="10%" delay="0s" duration="22s" color="rgba(63,255,139,0.12)" />
        <FloatingParticle size="4px" left="25%" delay="3s" duration="18s" color="rgba(0,227,253,0.10)" />
        <FloatingParticle size="8px" left="55%" delay="6s" duration="25s" color="rgba(63,255,139,0.08)" />
        <FloatingParticle size="5px" left="75%" delay="2s" duration="20s" color="rgba(0,227,253,0.12)" />
        <FloatingParticle size="3px" left="90%" delay="8s" duration="16s" color="rgba(63,255,139,0.15)" />
        <FloatingParticle size="7px" left="40%" delay="10s" duration="24s" color="rgba(166,140,255,0.08)" />
      </div>

      {/* ═══════ HERO SECTION ═══════ */}
      <header ref={heroRef} className={`mb-6 relative z-10 ${reveal(heroVisible)}`}>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>
        <h1 className="text-5xl font-headline font-bold leading-none tracking-tighter mb-4 text-on-surface relative">
          Scan Your Food.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Understand Health.</span>
        </h1>
        <p className="text-on-surface-variant font-body text-lg leading-relaxed mb-6 relative">
          Harness bioluminescent data insights to track your daily nutrition with surgical precision.
        </p>

        <div className="flex gap-3 relative z-20">
          <Link to="/scan-choose" className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-6 py-3 rounded-full font-headline font-bold uppercase tracking-[0.1em] text-xs shadow-[0_10px_30px_rgba(63,255,139,0.2)] hover:shadow-[0_10px_40px_rgba(63,255,139,0.35)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            Start Scanning
          </Link>
          <Link to="/lab-scan" className="flex items-center gap-2 bg-primary/10 border border-primary/40 px-6 py-3 rounded-full text-primary font-headline font-bold uppercase tracking-[0.1em] text-xs hover:bg-primary/20 active:scale-95 transition-all">
            <span className="material-symbols-outlined animate-pulse text-[18px]">sensors</span>
            Live Tracker
          </Link>
        </div>
      </header>

      {/* ═══════ HERO IMAGE with parallax ═══════ */}
      <div ref={heroImgRef} className={`relative z-10 mb-12 rounded-3xl overflow-hidden ${scaleIn(heroVisible)}`} style={{ transitionDelay: '200ms' }}>
        <div style={{ transform: `translateY(${heroImgOffset}px)` }} className="transition-transform duration-100">
          <img
            src="/images/hero-food.png"
            alt="Healthy food arrangement"
            className="w-full h-56 object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"></div>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2 bg-surface/70 backdrop-blur-lg rounded-2xl px-4 py-3 border border-outline-variant/20">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">eco</span>
            </div>
            <div>
              <p className="font-headline text-xs font-bold text-on-surface">AI-Powered Nutrition Analysis</p>
              <p className="text-[10px] text-on-surface-variant">Scan any food label or meal for instant insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ CALORIE TRACKER CARD ═══════ */}
      <section ref={statsRef} className={`mb-10 relative z-10 ${reveal(statsVisible)}`}>
        <div className="bg-surface-container rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-primary/10"></div>
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className={`font-headline text-[10px] uppercase tracking-[0.2em] block mb-2 ${exceeded ? 'text-red-400' : 'text-primary'}`}>{exceeded ? '⚠ Daily Limit Exceeded' : 'Calories Tracked Today'}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-headline font-bold text-on-surface">{Math.round(totals.calories).toLocaleString()}</span>
                <span className="text-on-surface-variant font-headline text-xl">/ {totalCals.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-surface-container-highest p-3 rounded-xl">
              <span className="material-symbols-outlined text-secondary">monitoring</span>
            </div>
          </div>
          
          <div className="h-4 bg-surface-container-lowest rounded-full overflow-hidden p-[2px]">
            <div className={`h-full rounded-full transition-all duration-1000 ${exceeded ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-primary to-secondary shadow-[0_0_15px_rgba(63,255,139,0.4)]'}`} style={{ width: `${progressPct}%` }}></div>
          </div>
          
          <div className="flex justify-between mt-4">
            <span className="text-xs font-headline text-on-surface-variant uppercase tracking-widest">{Math.round(progressPct)}% of daily goal</span>
            <span className={`text-xs font-headline font-bold ${exceeded ? 'text-red-400' : 'text-primary'}`}>{exceeded ? `${Math.round(totals.calories - totalCals)} kcal over!` : `${Math.max(0, totalCals - Math.round(totals.calories))} kcal left`}</span>
          </div>
        </div>
      </section>

      {/* ═══════ MACROS ROW ═══════ */}
      <section ref={macroRef} className={`mb-12 relative z-10 ${reveal(macroVisible)}`}>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Protein', value: totals.protein, goal: 150, unit: 'g', color: 'bg-primary', textColor: 'text-primary', delay: '0ms' },
            { label: 'Carbs', value: totals.carbs, goal: 300, unit: 'g', color: 'bg-secondary', textColor: 'text-secondary', delay: '100ms' },
            { label: 'Fats', value: totals.fat, goal: 80, unit: 'g', color: 'bg-tertiary', textColor: 'text-tertiary', delay: '200ms' },
          ].map(m => (
            <div key={m.label} className={`bg-surface-container-low rounded-xl p-4 text-center ${scaleIn(macroVisible)}`} style={{ transitionDelay: m.delay }}>
              <span className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant block mb-2">{m.label}</span>
              <span className={`text-xl font-headline font-bold text-on-surface block`}>{Math.round(m.value)}{m.unit}</span>
              <div className="w-full h-1 bg-surface-container-highest mt-3 rounded-full overflow-hidden">
                <div className={`h-full ${m.color} rounded-full transition-all duration-1000`} style={{width: `${Math.min(100, (m.value/m.goal)*100)}%`}}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section ref={howRef} className="mb-16 relative z-10">
        <h3 className={`font-headline text-2xl font-bold text-on-surface mb-8 text-center ${reveal(howVisible)}`}>
          How <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">NutriScan</span> Works
        </h3>
        
        <div className="space-y-6">
          {[
            { step: '01', icon: 'photo_camera', title: 'Snap a Photo', desc: 'Take a picture of any food label, meal, or packaged product.', delay: '100ms' },
            { step: '02', icon: 'smart_toy', title: 'AI Analyzes', desc: 'Our Gemini-powered AI extracts nutrition data, detects harmful additives, and rates health quality.', delay: '250ms' },
            { step: '03', icon: 'analytics', title: 'Get Insights', desc: 'Receive a personalized health score, macro breakdown, and actionable dietary recommendations.', delay: '400ms' },
          ].map(item => (
            <div
              key={item.step}
              className={`flex gap-5 items-start p-5 bg-surface-container rounded-2xl border border-outline-variant/10 group hover:border-primary/30 transition-all duration-300 ${revealLeft(howVisible)}`}
              style={{ transitionDelay: item.delay }}
            >
              <div className="flex-shrink-0 relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center group-hover:from-primary/25 group-hover:to-secondary/25 transition-all">
                  <span className="material-symbols-outlined text-primary text-2xl">{item.icon}</span>
                </div>
                <span className="absolute -top-2 -right-2 font-headline text-[10px] font-bold text-secondary bg-surface-container-highest rounded-full w-6 h-6 flex items-center justify-center border border-secondary/30">{item.step}</span>
              </div>
              <div>
                <h4 className="font-headline text-sm font-bold text-on-surface mb-1">{item.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ AI FEATURE SHOWCASE + IMAGE ═══════ */}
      <section ref={featureRef} className="mb-16 relative z-10">
        <div className={`relative rounded-3xl overflow-hidden mb-6 ${scaleIn(featureVisible)}`}>
          <div ref={featureImgRef} style={{ transform: `translateY(${featureImgOffset}px)` }} className="transition-transform duration-100">
            <img
              src="/images/scan-preview.png"
              alt="AI scanning interface preview"
              className="w-full h-64 object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent"></div>
          
          {/* Animated scan line */}
          <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" style={{ animation: 'scanLine 3s ease-in-out infinite' }}></div>
          </div>
        </div>

        <div className={`${revealRight(featureVisible)}`} style={{ transitionDelay: '200ms' }}>
          <span className="font-headline text-[10px] uppercase tracking-[0.25em] text-secondary block mb-2">Powered by Gemini AI</span>
          <h3 className="font-headline text-2xl font-bold text-on-surface mb-3 tracking-tight">
            More Than Just Calories
          </h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            NutriScan identifies harmful preservatives, artificial colors, hidden sugars, and rates every product with a personalized health score based on your unique profile.
          </p>
        </div>

        <div className={`grid grid-cols-2 gap-3 ${reveal(featureVisible)}`} style={{ transitionDelay: '400ms' }}>
          {[
            { icon: 'shield', label: 'Additive Detection', color: 'text-error' },
            { icon: 'nutrition', label: 'Macro Tracking', color: 'text-primary' },
            { icon: 'psychology', label: 'AI Health Score', color: 'text-secondary' },
            { icon: 'person', label: 'Diet Personalized', color: 'text-tertiary' },
          ].map(f => (
            <div key={f.label} className="bg-surface-container-low rounded-xl p-4 flex items-center gap-3 group hover:bg-surface-container transition-colors">
              <span className={`material-symbols-outlined text-lg ${f.color}`}>{f.icon}</span>
              <span className="font-headline text-[11px] font-bold text-on-surface">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ RECENT SCANS ═══════ */}
      <section ref={scansRef} className={`mb-16 relative z-10 ${reveal(scansVisible)}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline text-xl font-bold text-on-surface">Recent Scans</h3>
          <span className="text-primary font-headline text-xs uppercase tracking-widest font-bold cursor-pointer">View History</span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {sortedScans.length === 0 ? (
            <div className="text-center w-full py-8 text-on-surface-variant bg-surface-container-low rounded-xl">
              No recent scans. <Link to="/scan-choose" className="text-primary font-bold">Start scanning.</Link>
            </div>
          ) : (
            sortedScans.map((scan, idx) => (
              <div
                key={scan.id}
                className={`flex-shrink-0 w-44 bg-surface-container rounded-xl overflow-hidden group ${scaleIn(scansVisible)}`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="h-28 relative">
                  {scan.thumbnail ? (
                    <img src={scan.thumbnail} alt={scan.summary || 'Scanned food'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">restaurant</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent"></div>
                </div>
                <div className="p-4">
                  <span className="font-headline text-sm font-bold text-on-surface block truncate">{scan.summary || "Product Scan"}</span>
                  <span className="font-body text-xs text-on-surface-variant">{new Date(scan.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ═══════ SUPERFOODS SECTION + IMAGE ═══════ */}
      <section ref={superfoodRef} className="mb-16 relative z-10">
        <div className={`relative rounded-3xl overflow-hidden mb-6 ${scaleIn(superfoodVisible)}`}>
          <div ref={superfoodImgRef} style={{ transform: `translateY(${superfoodImgOffset}px)` }} className="transition-transform duration-100">
            <img
              src="/images/superfoods.png"
              alt="Superfoods arrangement"
              className="w-full h-52 object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-headline text-2xl font-bold text-on-surface tracking-tight mb-1">
              Know Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-tertiary">Superfoods</span>
            </h3>
            <p className="text-xs text-on-surface-variant/80">Discover what makes each ingredient a nutritional powerhouse</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { name: 'Antioxidants', icon: 'spa', desc: 'Combat cellular damage and slow aging processes', color: 'tertiary', delay: '100ms' },
            { name: 'Omega-3 Fatty Acids', icon: 'wb_sunny', desc: 'Essential for brain function and heart health', color: 'secondary', delay: '200ms' },
            { name: 'Dietary Fiber', icon: 'grass', desc: 'Supports digestive health and blood sugar control', color: 'primary', delay: '300ms' },
          ].map(nutrient => (
            <div
              key={nutrient.name}
              className={`bg-surface-container-low rounded-xl p-5 flex gap-4 items-start relative overflow-hidden group hover:bg-surface-container transition-colors ${revealRight(superfoodVisible)}`}
              style={{ transitionDelay: nutrient.delay }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${nutrient.color}`}></div>
              <div className={`bg-${nutrient.color}/10 p-3 rounded-lg flex-shrink-0`}>
                <span className={`material-symbols-outlined text-${nutrient.color}`}>{nutrient.icon}</span>
              </div>
              <div>
                <h4 className="font-headline text-sm font-bold text-on-surface mb-1">{nutrient.name}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{nutrient.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ STATS COUNTERS ═══════ */}
      <section className={`mb-16 relative z-10`}>
        <div className="bg-gradient-to-br from-surface-container to-surface-container-high rounded-3xl p-8 border border-outline-variant/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl"></div>

          <h3 className="font-headline text-sm font-bold text-center text-on-surface-variant uppercase tracking-[0.2em] mb-8">Your NutriScan Journey</h3>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block font-headline text-3xl font-bold text-primary">{scans.length}</span>
              <span className="block text-[10px] font-headline text-on-surface-variant uppercase tracking-widest mt-1">Total Scans</span>
            </div>
            <div>
              <span className="block font-headline text-3xl font-bold text-secondary">{Math.round(totals.calories)}</span>
              <span className="block text-[10px] font-headline text-on-surface-variant uppercase tracking-widest mt-1">Kcal Today</span>
            </div>
            <div>
              <span className="block font-headline text-3xl font-bold text-tertiary">
                {scans.length > 0 ? Math.round(scans.reduce((acc, s) => acc + (s.macros?.calories || 0), 0) / scans.length) : 0}
              </span>
              <span className="block text-[10px] font-headline text-on-surface-variant uppercase tracking-widest mt-1">Avg Cal/Scan</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HEALTH INSIGHTS ═══════ */}
      <section className="mb-12 relative z-10">
        <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Health Insights</h3>
        <div className="space-y-4">
          <div className="bg-surface-container-low rounded-xl p-6 flex gap-4 items-start relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary"></div>
            <div className="bg-tertiary/10 p-3 rounded-lg">
              <span className="material-symbols-outlined text-tertiary">psychology</span>
            </div>
            <div>
              <h4 className="font-headline text-sm font-bold text-on-surface mb-1">Why Nutrition Matters</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">Understanding micronutrients is key to cognitive performance and metabolic health.</p>
            </div>
          </div>
          
          <div className="bg-surface-container-low rounded-xl p-6 flex gap-4 items-start relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <span className="material-symbols-outlined text-secondary">restaurant_menu</span>
            </div>
            <div>
              <h4 className="font-headline text-sm font-bold text-on-surface mb-1">Balanced Diet Tips</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">A 40/30/30 macro split is recommended for your current weight-loss phase.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA BANNER ═══════ */}
      <section ref={ctaRef} className={`mb-8 relative z-10 ${scaleIn(ctaVisible)}`}>
        <div className="relative bg-gradient-to-br from-primary/15 via-surface-container to-secondary/15 rounded-3xl p-8 text-center border border-primary/20 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/10 rounded-full blur-[60px]"></div>
          
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(63,255,139,0.25)]">
            <span className="material-symbols-outlined text-on-primary text-3xl">qr_code_scanner</span>
          </div>
          
          <h3 className="font-headline text-xl font-bold text-on-surface mb-2 tracking-tight">Ready to Scan?</h3>
          <p className="text-xs text-on-surface-variant mb-6 max-w-[250px] mx-auto leading-relaxed">Point your camera at any food label or meal and let AI do the rest.</p>
          
          <Link to="/scan-choose" className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-8 py-3.5 rounded-full font-headline font-bold text-sm shadow-[0_15px_30px_rgba(63,255,139,0.2)] hover:shadow-[0_15px_40px_rgba(63,255,139,0.35)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            Scan Now
          </Link>
        </div>
      </section>

      {/* ═══════ Keyframe animations ═══════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatDown {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes scanLine {
          0% { transform: translateY(0); }
          50% { transform: translateY(16rem); }
          100% { transform: translateY(0); }
        }
        @keyframes blobDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(80px, 60px) scale(1.15); }
          50% { transform: translate(30px, 120px) scale(0.9); }
          75% { transform: translate(-40px, 50px) scale(1.1); }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-70px, 80px) scale(1.1); }
          50% { transform: translate(-120px, 20px) scale(0.85); }
          75% { transform: translate(-30px, -60px) scale(1.2); }
        }
        @keyframes blobDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(60px, -70px) scale(1.2); }
          50% { transform: translate(100px, 30px) scale(0.9); }
          75% { transform: translate(20px, -40px) scale(1.05); }
        }
        @keyframes blobDrift4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-50px, -90px) scale(0.95); }
          50% { transform: translate(40px, -40px) scale(1.15); }
          75% { transform: translate(-80px, 30px) scale(1); }
        }
        @keyframes blobDrift5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(70px, -50px) scale(1.1); }
          66% { transform: translate(-50px, 40px) scale(0.95); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
