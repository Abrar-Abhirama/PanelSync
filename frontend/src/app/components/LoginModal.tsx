'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        login(data.token, data.user);
        onClose();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-[#0a0a0c] border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-black text-white mb-6 text-center">
          Welcome Back
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-colors"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
