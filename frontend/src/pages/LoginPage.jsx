import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthUser } from '../auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const canContinue = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);

  const handleContinue = () => {
    if (!canContinue) return;
    setAuthUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      loginAt: Date.now(),
    });
    navigate('/profile', { replace: true });
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-headline font-bold mb-4">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">NutriScan</span>
        </h1>
        <p className="text-on-surface-variant font-body">Sign in to get personalized nutrition recommendations.</p>
      </div>

      <div className="bg-surface-container rounded-2xl p-8 shadow-[0_20px_40px_-10px_rgba(0,227,253,0.05)] border border-outline-variant/30">
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-headline text-on-surface-variant mb-2">Full name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-headline text-on-surface-variant mb-2">Email address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
              placeholder="name@example.com"
            />
          </div>
          <button 
            onClick={handleContinue} 
            disabled={!canContinue}
            className={`mt-4 w-full rounded-full py-4 font-headline font-bold transition-all ${
              canContinue 
                ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container active:scale-95 shadow-[0_4px_20px_rgba(63,255,139,0.3)]' 
                : 'bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
