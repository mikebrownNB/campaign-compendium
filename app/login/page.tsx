'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Icon } from '@/components/Icon';

type View = 'login' | 'forgot' | 'sent';

export default function LoginPage() {
  const router = useRouter();
  const [view,     setView]     = useState<View>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  // -- Login --
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError('Incorrect email or password.');
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.app_metadata?.role;
      const dest = role === 'super_admin' || role === 'admin' ? '/admin/users' : '/';
      router.push(dest);
      router.refresh();
    }
  };

  // -- Forgot password --
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase  = getSupabaseBrowser();
    const redirectTo = `${window.location.origin}/auth/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setView('sent');
    }
  };

  const switchToForgot = () => {
    setError(null);
    setView('forgot');
  };

  const switchToLogin = () => {
    setError(null);
    setView('login');
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
          <p className="font-mono text-[0.65rem] text-text-muted mt-1 tracking-widest uppercase">
            Your TTRPG Campaign Dossier
          </p>
        </div>

        {/* ── Login form ── */}
        {view === 'login' && (
          <form
            onSubmit={handleLogin}
            className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
                  Password
                </label>
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors"
                >
                  Forgot password?
                </button>
              </div>
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
                <Icon name="close" className="text-sm align-middle" /> {error}
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
        )}

        {/* ── Forgot password form ── */}
        {view === 'forgot' && (
          <form
            onSubmit={handleForgot}
            className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">
                Reset your password
              </h2>
              <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
                Enter your email and we&apos;ll send you a link to choose a new password.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
                <Icon name="close" className="text-sm align-middle" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-gold/20 hover:bg-accent-gold/30 border border-accent-gold/40 hover:border-accent-gold/70 text-accent-gold font-display font-bold text-sm rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={switchToLogin}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors text-center"
            >
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Email sent confirmation ── */}
        {view === 'sent' && (
          <div className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl text-center">
            <Icon name="mark_email_read" className="text-4xl text-accent-gold mx-auto" />
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">
                Check your inbox
              </h2>
              <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
                A password reset link has been sent to{' '}
                <span className="text-text-secondary">{email}</span>.
                The link expires in 1 hour.
              </p>
            </div>
            <button
              type="button"
              onClick={switchToLogin}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors"
            >
              ← Back to login
            </button>
          </div>
        )}

        <p className="text-center font-mono text-[0.6rem] text-text-muted mt-6">
          Contact your DM if you need an account.
        </p>
      </div>
    </div>
  );
}
