'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

const inputClass =
  'bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors';
const labelClass = 'font-mono text-[0.65rem] text-text-muted uppercase tracking-widest';
const btnClass =
  'mt-1 bg-accent-gold/20 hover:bg-accent-gold/30 border border-accent-gold/40 hover:border-accent-gold/70 text-accent-gold font-display font-bold text-xs rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase';

function Flash({ msg }: { msg: { type: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`font-mono text-[0.65rem] rounded px-3 py-2 border ${
      msg.type === 'ok'
        ? 'text-green-400 bg-green-400/10 border-green-400/30'
        : 'text-accent-red bg-accent-red/10 border-accent-red/30'
    }`}>
      {msg.type === 'ok' ? '✓' : '✕'} {msg.text}
    </p>
  );
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);

  // Display name state
  const [draftName,   setDraftName]   = useState('');
  const [savingName,  setSavingName]  = useState(false);
  const [nameMsg,     setNameMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [savingPw,    setSavingPw]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setDraftName((data.user?.user_metadata?.display_name as string) ?? '');
    });
  }, []);

  const email   = user?.email ?? '';
  const isAdmin = user?.app_metadata?.role === 'admin';

  // ── Update display name ─────────────────────────────────────────────────
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg(null);
    if (!draftName.trim()) {
      setNameMsg({ type: 'err', text: 'Display name cannot be empty.' });
      return;
    }
    setSavingName(true);
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: draftName.trim() },
    });
    setSavingName(false);
    if (error) {
      setNameMsg({ type: 'err', text: error.message });
    } else {
      setUser(data.user);
      setNameMsg({ type: 'ok', text: 'Display name updated.' });
    }
  };

  // ── Update password ──────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirm) {
      setPwMsg({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    setSavingPw(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) {
      setPwMsg({ type: 'err', text: error.message });
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirm('');
    }
  };

  return (
    <div className="animate-fade-in max-w-md">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text-primary tracking-wide">
          My Account
        </h1>
        <p className="font-mono text-[0.65rem] text-text-muted mt-1 uppercase tracking-widest">
          Manage your credentials
        </p>
      </div>

      {/* ── Display name ── */}
      <div className="bg-card border border-border-subtle rounded-xl p-5 mb-6">
        <h2 className="font-display text-sm font-bold text-text-primary mb-4">Display Name</h2>
        <form onSubmit={handleSaveName} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Name</label>
            <input
              type="text"
              required
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Mike"
            />
            <p className="font-mono text-[0.55rem] text-text-muted">
              This is what you type on the login screen.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Email</label>
            <p className="font-mono text-sm text-text-secondary">{email}</p>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Role</label>
              <span className="font-mono text-[0.65rem] text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded px-2 py-0.5 w-fit">
                Admin
              </span>
            </div>
          )}

          <Flash msg={nameMsg} />

          <button type="submit" disabled={savingName} className={btnClass}>
            {savingName ? 'Saving…' : 'Save Name'}
          </button>
        </form>
      </div>

      {/* ── Change password ── */}
      <div className="bg-card border border-border-subtle rounded-xl p-5">
        <h2 className="font-display text-sm font-bold text-text-primary mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="Min. 8 characters"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Confirm Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="Repeat new password"
            />
          </div>

          <Flash msg={pwMsg} />

          <button type="submit" disabled={savingPw} className={btnClass}>
            {savingPw ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
