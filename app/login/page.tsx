'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Step 1: resolve display name → email
    const lookup = await fetch(
      `/api/auth/lookup?name=${encodeURIComponent(name.trim())}`,
    );

    if (!lookup.ok) {
      setError('Name not recognised. Contact your DM.');
      setLoading(false);
      return;
    }

    const { email } = await lookup.json();

    // Step 2: sign in with the resolved email + supplied password
    const supabase = getSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Incorrect password.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#0a0a12] flex flex-col items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a3e_0%,_#0a0a12_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚓</div>
          <h1 className="font-display text-2xl font-bold text-accent-gold tracking-widest uppercase">
            Campaign Compendium
          </h1>
          <p className="font-mono text-[0.65rem] text-text-muted mt-1 tracking-widest uppercase">
            Your TTRPG Campaign Dossier
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl"
        >
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
              Your Name
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
              placeholder="e.g. Mike"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
              ✕ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-accent-gold/20 hover:bg-accent-gold/30 border border-accent-gold/40 hover:border-accent-gold/70 text-accent-gold font-display font-bold text-sm rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase"
          >
            {loading ? 'Entering…' : 'Enter the Tavern'}
          </button>
        </form>

        <p className="text-center font-mono text-[0.6rem] text-text-muted mt-6">
          Contact your DM if you need access.
        </p>
      </div>
    </div>
  );
}
