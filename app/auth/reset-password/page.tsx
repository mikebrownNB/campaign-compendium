'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Icon } from '@/components/Icon';

type View = 'loading' | 'form' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  const router  = useRouter();
  const [view,     setView]     = useState<View>('loading');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  // Supabase parses the #access_token from the URL hash on load and fires
  // PASSWORD_RECOVERY once the session is set. We wait for that event before
  // showing the form so the session is guaranteed to be ready.
  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('form');
      }
    });

    // Fallback: if the session is already set (e.g. page was refreshed),
    // check whether we have an active session with recovery type.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setView('form');
      } else {
        // Give the hash-parsing a moment, then mark invalid if still no session
        const timeout = setTimeout(() => {
          setView(v => v === 'loading' ? 'invalid' : v);
        }, 2500);
        return () => clearTimeout(timeout);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const supabase = getSupabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setView('success');
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#0a0a12] flex flex-col items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a3e_0%,_#0a0a12_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <Icon name="anchor" className="text-5xl mb-3 text-accent-gold" />
          <h1 className="font-display text-2xl font-bold text-accent-gold tracking-widest uppercase">
            Campaign Compendium
          </h1>
        </div>

        {/* Loading */}
        {view === 'loading' && (
          <div className="bg-card border border-border-glow rounded-xl p-6 text-center shadow-2xl">
            <p className="font-mono text-[0.65rem] text-text-muted">Verifying reset link…</p>
          </div>
        )}

        {/* Invalid / expired link */}
        {view === 'invalid' && (
          <div className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl text-center">
            <Icon name="link_off" className="text-3xl text-accent-red mx-auto" />
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">
                Link expired or invalid
              </h2>
              <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
                This password reset link has expired or already been used.
                Please request a new one.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors"
            >
              ← Back to login
            </button>
          </div>
        )}

        {/* New password form */}
        {view === 'form' && (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">
                Choose a new password
              </h2>
              <p className="font-mono text-[0.65rem] text-text-muted">
                Must be at least 8 characters.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
                New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
                Confirm Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
                <Icon name="close" className="text-sm align-middle" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent-gold/20 hover:bg-accent-gold/30 border border-accent-gold/40 hover:border-accent-gold/70 text-accent-gold font-display font-bold text-sm rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase"
            >
              {saving ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        )}

        {/* Success */}
        {view === 'success' && (
          <div className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl text-center">
            <Icon name="check_circle" className="text-4xl text-accent-gold mx-auto" />
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">
                Password updated
              </h2>
              <p className="font-mono text-[0.65rem] text-text-muted">
                Redirecting you to login…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
