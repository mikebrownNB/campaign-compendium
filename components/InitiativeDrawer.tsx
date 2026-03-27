'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCampaign } from '@/lib/CampaignContext';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Icon } from '@/components/Icon';
import type { InitiativeEntry } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function sorted(entries: InitiativeEntry[]) {
  return [...entries].sort((a, b) => b.initiative - a.initiative);
}

function SwordsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6.92 5H5l5.5 5.5-1.5 1.5L3.5 6.5V5l3.42 0zM2 2l4 4 4-4h2l-5 5 2 2-1 1-2-2-4 4V10l4-4-4-4V2zm18 0l-4 4-4-4h-2l5 5-2 2 1 1 2-2 4 4v-2l-4-4 4-4V2zM17.08 5H19l-5.5 5.5 1.5 1.5 5.5-5.5V5l-3.42 0zM12 14l-1-1-1 1 1 1 1-1zm-3 3l-1-1-3 3v2h2l3-3-1-1zm6 0l1-1 3 3v2h-2l-3-3 1-1z"/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function InitiativeDrawer() {
  const { campaign, isDM } = useCampaign();
  const campaignId = campaign.id;

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [round, setRound] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleToPlayers, setVisibleToPlayers] = useState(false);
  const [hidden, setHidden] = useState(false); // player view: DM hasn't shared

  // Add form state
  const [addName, setAddName] = useState('');
  const [addInit, setAddInit] = useState('');
  const [addType, setAddType] = useState<'player' | 'monster'>('player');
  const [addHp, setAddHp] = useState('');
  const [addAc, setAddAc] = useState('');

  const [saving, setSaving] = useState(false);
  const suppressRef = useRef(false);

  // ── Fetch state ──────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/initiative`);
    if (!res.ok) return;
    const data = await res.json();
    setEntries(data.entries ?? []);
    setRound(data.round ?? 1);
    setActiveIndex(data.active_index ?? 0);
    setVisibleToPlayers(data.visible_to_players ?? false);
    setHidden(!!data.hidden);
  }, [campaignId]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`initiative_${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'initiative_tracker', filter: `campaign_id=eq.${campaignId}` },
        () => {
          if (suppressRef.current) { suppressRef.current = false; return; }
          fetchState();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [campaignId, fetchState]);

  // ── Persist helper ───────────────────────────────────────────────────────
  const persist = useCallback(async (
    newEntries: InitiativeEntry[],
    newRound: number,
    newActiveIndex: number,
    newVisible: boolean,
  ) => {
    setSaving(true);
    suppressRef.current = true;
    await fetch(`/api/campaigns/${campaignId}/initiative`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: newEntries,
        round: newRound,
        active_index: newActiveIndex,
        visible_to_players: newVisible,
      }),
    });
    setSaving(false);
  }, [campaignId]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const addEntry = () => {
    const name = addName.trim();
    if (!name) return;
    const init = parseInt(addInit) || 0;
    const entry: InitiativeEntry = {
      id: crypto.randomUUID(),
      name,
      initiative: init,
      type: addType,
    };
    const hp = parseInt(addHp);
    const ac = parseInt(addAc);
    if (hp > 0) { entry.hp = hp; entry.maxHp = hp; }
    if (ac > 0) entry.ac = ac;

    const next = sorted([...entries, entry]);
    setEntries(next);
    setAddName(''); setAddInit(''); setAddHp(''); setAddAc('');
    persist(next, round, activeIndex, visibleToPlayers);
  };

  const removeEntry = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    const idx = Math.min(activeIndex, Math.max(0, next.length - 1));
    setEntries(next);
    setActiveIndex(idx);
    persist(next, round, idx, visibleToPlayers);
  };

  const updateHp = (id: string, delta: number) => {
    const next = entries.map(e =>
      e.id === id ? { ...e, hp: Math.max(0, (e.hp ?? 0) + delta) } : e,
    );
    setEntries(next);
    persist(next, round, activeIndex, visibleToPlayers);
  };

  const nextTurn = () => {
    if (entries.length === 0) return;
    const sortedEntries = sorted(entries);
    let nextIdx = activeIndex + 1;
    let nextRound = round;
    if (nextIdx >= sortedEntries.length) {
      nextIdx = 0;
      nextRound = round + 1;
    }
    setActiveIndex(nextIdx);
    setRound(nextRound);
    persist(sortedEntries, nextRound, nextIdx, visibleToPlayers);
  };

  const prevTurn = () => {
    if (entries.length === 0) return;
    const sortedEntries = sorted(entries);
    let prevIdx = activeIndex - 1;
    let prevRound = round;
    if (prevIdx < 0) {
      prevIdx = sortedEntries.length - 1;
      prevRound = Math.max(1, round - 1);
    }
    setActiveIndex(prevIdx);
    setRound(prevRound);
    persist(sortedEntries, prevRound, prevIdx, visibleToPlayers);
  };

  const clearAll = () => {
    setEntries([]);
    setRound(1);
    setActiveIndex(0);
    persist([], 1, 0, visibleToPlayers);
  };

  const toggleVisible = () => {
    const next = !visibleToPlayers;
    setVisibleToPlayers(next);
    persist(entries, round, activeIndex, next);
  };

  // ── Player: hide button entirely when DM hasn't shared ──────────────────
  if (!isDM && (hidden || !visibleToPlayers)) return null;

  const sortedEntries = sorted(entries);

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close initiative tracker' : 'Open initiative tracker'}
        className={`
          fixed bottom-6 right-24 z-[300]
          w-14 h-14 rounded-2xl
          flex items-center justify-center
          shadow-lg border transition-all duration-200
          ${open
            ? 'bg-accent-purple/20 border-accent-purple/60 text-accent-purple scale-95'
            : 'bg-deep border-accent-purple/30 text-accent-purple/70 hover:text-accent-purple hover:border-accent-purple/60 hover:bg-accent-purple/10 hover:scale-105'
          }
        `}
      >
        <SwordsIcon className="w-7 h-7" />
      </button>

      {/* ── Slide-up panel ── */}
      <div
        className={`
          fixed bottom-24 right-24 z-[298]
          w-96 max-h-[80vh] overflow-y-auto
          bg-deep/98 backdrop-blur-xl
          border border-border-subtle rounded-2xl
          shadow-2xl
          transition-all duration-300 ease-in-out
          ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <SwordsIcon className="w-4 h-4 text-accent-purple" />
            <span className="font-display text-xs tracking-[0.12em] uppercase text-accent-purple">Initiative</span>
            <span className="font-mono text-[0.6rem] text-text-muted ml-1">Round {round}</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* ── DM: Visibility toggle ── */}
          {isDM && (
            <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border-subtle bg-accent-purple/5">
              <div className="flex items-center gap-2">
                <Icon name={visibleToPlayers ? 'visibility' : 'visibility_off'} className="text-sm text-accent-purple" />
                <span className="font-mono text-xs text-text-primary">
                  {visibleToPlayers ? 'Visible to players' : 'DM only'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={visibleToPlayers}
                onClick={toggleVisible}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                           transition-colors duration-200 ease-in-out focus:outline-none
                           ${visibleToPlayers ? 'bg-accent-purple' : 'bg-border-subtle'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
                               transform transition duration-200 ease-in-out
                               ${visibleToPlayers ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

          {/* ── DM: Add entry form ── */}
          {isDM && (
            <div className="bg-card border border-border-subtle rounded-xl p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#0a0a12] border border-border-subtle rounded-lg px-2 py-1.5 text-sm text-text-primary font-mono placeholder:text-text-muted/50 focus:outline-none focus:border-accent-purple/50"
                  placeholder="Name"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEntry()}
                />
                <input
                  type="number"
                  className="w-14 bg-[#0a0a12] border border-border-subtle rounded-lg px-2 py-1.5 text-sm text-text-primary font-mono text-center placeholder:text-text-muted/50 focus:outline-none focus:border-accent-purple/50"
                  placeholder="Init"
                  value={addInit}
                  onChange={e => setAddInit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEntry()}
                />
              </div>
              <div className="flex gap-2 items-center">
                {/* Type toggle */}
                <div className="flex rounded-lg border border-border-subtle overflow-hidden">
                  <button
                    onClick={() => setAddType('player')}
                    className={`px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider transition-colors
                      ${addType === 'player' ? 'bg-green-400/20 text-green-400' : 'text-text-muted hover:text-text-primary'}`}
                  >Player</button>
                  <button
                    onClick={() => setAddType('monster')}
                    className={`px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider transition-colors
                      ${addType === 'monster' ? 'bg-accent-red/20 text-accent-red' : 'text-text-muted hover:text-text-primary'}`}
                  >Monster</button>
                </div>
                <input
                  type="number"
                  className="w-14 bg-[#0a0a12] border border-border-subtle rounded-lg px-2 py-1.5 text-[0.65rem] text-text-primary font-mono text-center placeholder:text-text-muted/50 focus:outline-none focus:border-accent-purple/50"
                  placeholder="HP"
                  value={addHp}
                  onChange={e => setAddHp(e.target.value)}
                />
                <input
                  type="number"
                  className="w-14 bg-[#0a0a12] border border-border-subtle rounded-lg px-2 py-1.5 text-[0.65rem] text-text-primary font-mono text-center placeholder:text-text-muted/50 focus:outline-none focus:border-accent-purple/50"
                  placeholder="AC"
                  value={addAc}
                  onChange={e => setAddAc(e.target.value)}
                />
                <button
                  onClick={addEntry}
                  disabled={!addName.trim()}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/30 font-display text-[0.6rem]
                           tracking-widest text-accent-purple uppercase hover:bg-accent-purple/20
                           disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >Add</button>
              </div>
            </div>
          )}

          {/* ── Initiative list ── */}
          {sortedEntries.length === 0 ? (
            <p className="text-text-muted font-mono text-xs text-center py-4">
              {isDM ? 'Add combatants to begin.' : 'No active encounter.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {sortedEntries.map((entry, i) => {
                const isActive = i === activeIndex;
                const isMonster = entry.type === 'monster';
                return (
                  <div
                    key={entry.id}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                      ${isActive
                        ? 'border-accent-purple/60 bg-accent-purple/10 shadow-sm shadow-accent-purple/20'
                        : 'border-border-subtle bg-card/50 hover:bg-card'}
                    `}
                  >
                    {/* Turn indicator */}
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-accent-purple animate-pulse' : 'bg-transparent'}`} />

                    {/* Initiative number */}
                    <span className="font-mono text-sm font-bold text-accent-purple w-7 text-center shrink-0">
                      {entry.initiative}
                    </span>

                    {/* Name + type badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-sm truncate ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {entry.name}
                        </span>
                        {isDM && isMonster && (
                          <span className="font-mono text-[0.5rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-1 py-0 shrink-0">
                            M
                          </span>
                        )}
                      </div>
                      {/* DM: HP + AC display */}
                      {isDM && (entry.hp !== undefined || entry.ac !== undefined) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.hp !== undefined && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateHp(entry.id, -1)} className="text-accent-red text-[0.6rem] font-mono hover:text-accent-red/80">-</button>
                              <span className={`font-mono text-[0.6rem] ${(entry.hp ?? 0) <= 0 ? 'text-accent-red' : 'text-green-400'}`}>
                                {entry.hp}{entry.maxHp ? `/${entry.maxHp}` : ''} HP
                              </span>
                              <button onClick={() => updateHp(entry.id, 1)} className="text-green-400 text-[0.6rem] font-mono hover:text-green-400/80">+</button>
                            </div>
                          )}
                          {entry.ac !== undefined && (
                            <span className="font-mono text-[0.6rem] text-sky-400">AC {entry.ac}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* DM: remove button */}
                    {isDM && (
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="text-text-muted/30 hover:text-accent-red text-xs transition-colors shrink-0"
                      >
                        <Icon name="close" className="text-sm" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Turn controls (DM) ── */}
          {isDM && sortedEntries.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={prevTurn}
                className="px-3 py-2 rounded-lg border border-border-subtle font-mono text-xs text-text-muted hover:text-text-primary hover:border-border-glow transition-colors"
              >
                <Icon name="skip_previous" className="text-sm align-middle" /> Prev
              </button>
              <button
                onClick={nextTurn}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-accent-purple/10 border border-accent-purple/30 font-display text-xs
                         tracking-widest text-accent-purple uppercase hover:bg-accent-purple/20
                         disabled:opacity-50 transition-all active:scale-95"
              >
                Next Turn <Icon name="skip_next" className="text-sm align-middle" />
              </button>
            </div>
          )}

          {/* ── Clear (DM) ── */}
          {isDM && sortedEntries.length > 0 && (
            <button
              onClick={clearAll}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors text-center py-1"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </>
  );
}
