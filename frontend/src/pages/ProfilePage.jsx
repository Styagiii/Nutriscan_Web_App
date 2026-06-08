import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, setUserProfile } from '../auth';

const defaultProfile = {
  age: '',
  weight: '',
  height: '',
  diet: 'Balanced Diet',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...(getUserProfile() || {}) }));

  const handleSave = () => {
    setUserProfile(profile);
    navigate('/scan', { replace: true });
  };

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold mb-3">
          Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Profile</span>
        </h1>
        <p className="text-on-surface-variant text-sm font-body">Save your details once. NutriScan uses this profile to generate personalized reports.</p>
      </div>

      <div className="bg-surface-container rounded-2xl p-6 shadow-[0_20px_40px_-10px_rgba(0,227,253,0.05)] border border-outline-variant/30">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-headline text-on-surface-variant mb-2 uppercase tracking-widest">Age</label>
            <input 
              type="number" 
              value={profile.age} 
              onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} 
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-headline text-on-surface-variant mb-2 uppercase tracking-widest">Weight (kg)</label>
              <input 
                type="number" 
                value={profile.weight} 
                onChange={(e) => setProfile((p) => ({ ...p, weight: e.target.value }))} 
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-headline text-on-surface-variant mb-2 uppercase tracking-widest">Height (cm)</label>
              <input 
                type="number" 
                value={profile.height} 
                onChange={(e) => setProfile((p) => ({ ...p, height: e.target.value }))} 
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-headline text-on-surface-variant mb-2 uppercase tracking-widest">Diet Goal</label>
            <select 
              value={profile.diet} 
              onChange={(e) => setProfile((p) => ({ ...p, diet: e.target.value }))} 
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors text-sm appearance-none"
            >
              {['Balanced Diet', 'Weight Loss', 'Muscle Gain (High Protein)', 'Low-Carb', 'Vegan'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleSave} 
            className="mt-6 w-full rounded-full py-4 font-headline font-bold transition-all bg-gradient-to-br from-primary to-primary-container text-on-primary-container active:scale-95 shadow-[0_4px_20px_rgba(63,255,139,0.3)]"
          >
            Save & Start Scanning
          </button>
        </div>
      </div>
    </div>
  );
}
