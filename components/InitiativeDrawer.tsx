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
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Per-entry HP input/result state for damage/heal controls
  const [hpInputs, setHpInputs] = useState<Record<string, string>>({});
  const [hpResults, setHpResults] = useState<Record<string, string>>({});
  const suppressRef = useRef(false);

  // ── Draggable panel position ───────────────────────────────────────────
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!panelRef.current) return;
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !panelRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const newX = clientX - dragOffset.current.x;
      const newY = clientY - dragOffset.current.y;
      // Clamp within viewport
      const w = panelRef.current.offsetWidth;
      const h = panelRef.current.offsetHeight;
      setPanelPos({
        x: Math.max(0, Math.min(window.innerWidth - w, newX)),
        y: Math.max(0, Math.min(window.innerHeight - h, newY)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

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

  // ── Realtime via Supabase Broadcast ──────────────────────────────────────
  // More reliable than postgres_changes with RLS — the DM broadcasts a
  // "refresh" event after each persist and all clients (players) listen.
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>['channel']> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`initiative_sync_${campaignId}`)
      .on('broadcast', { event: 'refresh' }, () => {
        if (suppressRef.current) { suppressRef.current = false; return; }
        fetchState();
      })
      .subscribe();
    channelRef.current = channel;
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
    // Broadcast refresh to all other clients on this channel
    channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} });
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

  const updateInitiative = (id: string, value: number) => {
    const updated = entries.map(e => e.id === id ? { ...e, initiative: value } : e);
    const next = sorted(updated);
    setEntries(next);
    // Recalculate activeIndex — find the entry that was active before re-sort
    const activeBefore = sorted(entries)[activeIndex];
    const newIdx = activeBefore ? next.findIndex(e => e.id === activeBefore.id) : 0;
    setActiveIndex(Math.max(0, newIdx));
    persist(next, round, Math.max(0, newIdx), visibleToPlayers);
  };

  const applyHp = (id: string, mode: 'damage' | 'heal') => {
    const amount = parseInt(hpInputs[id] ?? '');
    if (!amount || amount <= 0) return;
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.hp === undefined) return;
    let newHp: number;
    let msg: string;
    if (mode === 'heal') {
      newHp = entry.maxHp != null ? Math.min(entry.maxHp, entry.hp + amount) : entry.hp + amount;
      const actual = newHp - entry.hp;
      msg = actual > 0 ? `+${actual} HP` : 'Already at max';
    } else {
      newHp = Math.max(0, entry.hp - amount);
      msg = `−${entry.hp - newHp} HP`;
    }
    const next = entries.map(e => e.id === id ? { ...e, hp: newHp } : e);
    setEntries(next);
    setHpInputs(prev => ({ ...prev, [id]: '' }));
    setHpResults(prev => ({ ...prev, [id]: msg }));
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

  const addAllPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/players`);
      if (!res.ok) return;
      const players: { id: string; name: string }[] = await res.json();
      const existingNames = new Set(entries.filter(e => e.type === 'player').map(e => e.name));
      const newEntries: InitiativeEntry[] = players
        .filter(p => !existingNames.has(p.name))
        .map(p => ({
          id: crypto.randomUUID(),
          name: p.name,
          initiative: 0,
          type: 'player' as const,
        }));
      if (newEntries.length > 0) {
        const next = sorted([...entries, ...newEntries]);
        setEntries(next);
        persist(next, round, activeIndex, visibleToPlayers);
      }
    } finally {
      setLoadingPlayers(false);
    }
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
        <Icon name="swords" className="text-3xl" />
      </button>

      {/* ── Panel ── */}
      <div
        ref={panelRef}
        style={panelPos ? { left: panelPos.x, top: panelPos.y, right: 'auto', bottom: 'auto' } : {}}
        className={`
          fixed z-[298]
          w-96 max-h-[80vh] overflow-y-auto
          bg-deep/98 backdrop-blur-xl
          border border-border-subtle rounded-2xl
          shadow-2xl
          ${panelPos ? '' : 'bottom-24 right-24'}
          ${open
            ? 'opacity-100 pointer-events-auto' + (panelPos ? '' : ' translate-y-0')
            : 'opacity-0 pointer-events-none' + (panelPos ? '' : ' translate-y-4')
          }
          ${panelPos ? '' : 'transition-all duration-300 ease-in-out'}
        `}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          className="flex items-center justify-between px-4 py-3 border-b border-border-subtle cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <Icon name="swords" className="text-base text-accent-purple" />
            <span className="font-display text-xs tracking-[0.12em] uppercase text-accent-purple">Initiative</span>
            <span className="font-mono text-[0.6rem] text-text-muted ml-1">Round {round}</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            onMouseDown={e => e.stopPropagation()}
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
              <button
                onClick={addAllPlayers}
                disabled={loadingPlayers}
                className="w-full py-1.5 rounded-lg border border-border-subtle font-mono text-[0.6rem] text-text-muted
                         hover:text-accent-purple hover:border-accent-purple/30 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="group_add" className="text-sm align-middle" /> {loadingPlayers ? 'Loading...' : 'Add All Players'}
              </button>
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
                    {isDM ? (
                      <input
                        type="number"
                        value={entry.initiative}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) updateInitiative(entry.id, val);
                        }}
                        className="font-mono text-sm font-bold text-accent-purple w-8 text-center shrink-0 bg-transparent border border-transparent rounded
                                 hover:border-accent-purple/30 focus:border-accent-purple/50 focus:outline-none focus:bg-card transition-colors
                                 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : (
                      <span className="font-mono text-sm font-bold text-accent-purple w-7 text-center shrink-0">
                        {entry.initiative}
                      </span>
                    )}

                    {/* Name + type badge + AC */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-sm truncate ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {entry.name}
                        </span>
                        {isDM && isMonster && (
                          <span className="font-mono text-[0.5rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-1 py-0 shrink-0">
                            M
                          </span>
                        )}
                        {isDM && entry.ac !== undefined && (
                          <span className="font-mono text-[0.55rem] text-sky-400 border border-sky-400/20 rounded px-1 py-0 shrink-0">
                            AC {entry.ac}
                          </span>
                        )}
                      </div>
                      {/* DM: HP tracker */}
                      {isDM && entry.hp !== undefined && (
                        <div className="mt-1.5 flex flex-col gap-1">
                          <span className={`font-mono text-xs font-semibold ${(entry.hp ?? 0) <= 0 ? 'text-accent-red' : 'text-green-400'}`}>
                            {entry.hp}{entry.maxHp != null ? ` / ${entry.maxHp}` : ''} HP
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={hpInputs[entry.id] ?? ''}
                              onChange={e => {
                                setHpInputs(prev => ({ ...prev, [entry.id]: e.target.value }));
                                setHpResults(prev => ({ ...prev, [entry.id]: '' }));
                              }}
                              onKeyDown={e => { if (e.key === 'Enter') applyHp(entry.id, 'damage'); }}
                              placeholder="Amt"
                              className="w-14 bg-[#0a0a12] border border-border-subtle rounded px-1.5 py-1 font-mono text-xs text-text-primary text-center focus:outline-none focus:border-accent-purple/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() => applyHp(entry.id, 'damage')}
                              className="font-mono text-[0.6rem] border border-accent-red/40 text-accent-red/80 hover:bg-accent-red/10 rounded px-2 py-1 transition-colors whitespace-nowrap"
                            >
                              ⚔ Dmg
                            </button>
                            <button
                              onClick={() => applyHp(entry.id, 'heal')}
                              className="font-mono text-[0.6rem] border border-green-500/40 text-green-400 hover:bg-green-500/10 rounded px-2 py-1 transition-colors whitespace-nowrap"
                            >
                              + Heal
                            </button>
                          </div>
                          {hpResults[entry.id] && (
                            <span className={`font-mono text-[0.6rem] ${hpResults[entry.id].startsWith('+') ? 'text-green-400' : 'text-accent-red/80'}`}>
                              {hpResults[entry.id]}
                            </span>
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
