'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type ViewState = 'verifying' | 'success' | 'error';

function ConfirmInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [view, setView]       = useState<ViewState>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const tokenHash  = searchParams.get('token_hash');
    const type       = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'email_change' | null;
    const redirectTo = searchParams.get('redirect_to');

    if (!tokenHash || !type) {
      setMessage('Missing verification token. This link may be invalid.');
      setView('error');
      return;
    }

    const supabase = getSupabaseBrowser();

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setMessage(error.message ?? 'Verification failed. The link may have expired.');
        setView('error');
        return;
      }

      setView('success');

      // Password recovery always lands on the reset page
      if (type === 'recovery') {
        router.replace('/auth/reset-password');
        return;
      }

      // Honour redirect_to (must be a relative path) or fall back to home
      router.replace(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/');
    });
  }, [router, searchParams]);

  return (
    <div className="w-full max-w-sm text-center">
      {view === 'verifying' && (
        <>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-accent-gold" />
          <p className="text-text-secondary font-mono text-sm">Verifying your link…</p>
        </>
      )}

      {view === 'success' && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-gold/10 text-accent-gold text-2xl">
            ✓
          </div>
          <p className="text-text-primary font-mono text-sm">Verified! Redirecting…</p>
        </>
      )}

      {view === 'error' && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10 text-accent-red text-2xl">
            ✕
          </div>
          <p className="text-text-primary font-mono text-sm mb-2">Verification failed</p>
          <p className="text-text-secondary font-mono text-xs mb-6">{message}</p>
          <a
            href="/login"
            className="text-accent-gold hover:text-accent-gold/80 font-mono text-sm underline"
          >
            Back to login
          </a>
        </>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-base px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-accent-gold" />
            <p className="text-text-secondary font-mono text-sm">Verifying your link…</p>
          </div>
        }
      >
        <ConfirmInner />
      </Suspense>
    </main>
  );
}
