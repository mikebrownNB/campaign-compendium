'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Icon } from '@/components/Icon';

type View = 'login' | 'signup' | 'signup-sent' | 'forgot' | 'reset-sent';

// Shared input class
const inputCls = 'bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors';
const labelCls = 'font-mono text-[0.65rem] text-text-muted uppercase tracking-widest';
const btnCls   = 'w-full bg-accent-gold/20 hover:bg-accent-gold/30 border border-accent-gold/40 hover:border-accent-gold/70 text-accent-gold font-display font-bold text-sm rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase';
const backCls  = 'font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors text-center';

export default function LoginPage() {
  const router = useRouter();
  const [view,        setView]        = useState<View>('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const go = (v: View) => { setError(null); setView(v); };

  // ── Login ────────────────────────────────────────────────────────────────
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
      router.push(role === 'super_admin' || role === 'admin' ? '/admin/users' : '/');
      router.refresh();
    }
  };

  // ── Sign up ──────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) { setError('Please enter a display name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { error: signupError } = await supabase.auth.signUp({
      email:    email.trim(),
      password,
      options:  {
        data:        { display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);
    if (signupError) {
      setError(signupError.message);
    } else {
      setView('signup-sent');
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/reset-password` },
    );

    setLoading(false);
    if (resetError) setError(resetError.message);
    else setView('reset-sent');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[999] bg-[#0a0a12] flex flex-col items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a3e_0%,_#0a0a12_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Icon name="anchor" className="text-5xl mb-3 text-accent-gold" />
          <h1 className="font-display text-2xl font-bold text-accent-gold tracking-widest uppercase">
            Campaign Compendium
          </h1>
          <p className="font-mono text-[0.65rem] text-text-muted mt-1 tracking-widest uppercase">
            Your TTRPG Campaign Dossier
          </p>
        </div>

        {/* ── Login ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Email</label>
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Password</label>
                <button type="button" onClick={() => go('forgot')}
                  className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors">
                  Forgot password?
                </button>
              </div>
              <input type="password" required autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            </div>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? 'Entering…' : 'Enter the Tavern'}
            </button>

            <div className="border-t border-border-subtle pt-3 text-center">
              <span className="font-mono text-[0.6rem] text-text-muted">New here? </span>
              <button type="button" onClick={() => go('signup')}
                className="font-mono text-[0.6rem] text-accent-gold hover:text-accent-gold/70 transition-colors">
                Create an account →
              </button>
            </div>
          </form>
        )}

        {/* ── Sign up ── */}
        {view === 'signup' && (
          <form onSubmit={handleSignup} className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-0.5">Create an account</h2>
              <p className="font-mono text-[0.65rem] text-text-muted">
                You&apos;ll need to confirm your email before logging in.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Display Name</label>
              <input type="text" required autoComplete="name" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} className={inputCls}
                placeholder="How you'll appear to your party" />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Email</label>
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Password</label>
              <input type="password" required autoComplete="new-password" value={password}
                onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="•••••••• (min 8 chars)" />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Confirm Password</label>
              <input type="password" required autoComplete="new-password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} className={inputCls} placeholder="••••••••" />
            </div>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <button type="button" onClick={() => go('login')} className={backCls}>
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Signup confirmation sent ── */}
        {view === 'signup-sent' && (
          <div className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl text-center">
            <Icon name="mark_email_read" className="text-4xl text-accent-gold mx-auto" />
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">Check your inbox</h2>
              <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
                A confirmation link has been sent to{' '}
                <span className="text-text-secondary">{email}</span>.
                Click it to activate your account.
              </p>
            </div>
            <button type="button" onClick={() => go('login')} className={backCls}>
              ← Back to login
            </button>
          </div>
        )}

        {/* ── Forgot password ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">Reset your password</h2>
              <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
                Enter your email and we&apos;ll send you a link to choose a new password.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Email</label>
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            </div>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => go('login')} className={backCls}>
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Reset email sent ── */}
        {view === 'reset-sent' && (
          <div className="bg-card border border-border-glow rounded-xl p-6 flex flex-col gap-4 shadow-2xl text-center">
            <Icon name="mark_email_read" className="text-4xl text-accent-gold mx-auto" />
            <div>
              <h2 className="font-display text-base font-bold text-text-primary mb-1">Check your inbox</h2>
              <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
                A password reset link has been sent to{' '}
                <span className="text-text-secondary">{email}</span>.
                The link expires in 1 hour.
              </p>
            </div>
            <button type="button" onClick={() => go('login')} className={backCls}>
              ← Back to login
            </button>
          </div>
        )}

        <p className="text-center font-mono text-[0.6rem] text-text-muted mt-6">
          {view === 'login' ? 'Contact your DM if you need an account.' : '\u00a0'}
        </p>
      </div>
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
      <Icon name="close" className="text-sm align-middle" /> {children}
    </p>
  );
}
