'use client';

import { useState, useRef } from 'react';
import { Icon } from '@/components/Icon';

// ── Types ──────────────────────────────────────────────────────────────────────
const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
type Die = (typeof DICE)[number];

interface DieResult   { die: Die; value: number }
interface HistoryEntry {
  id: string;
  pool: string;
  modifier: number;
  results: DieResult[];
  subtotal: number;
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function dieColour(die: Die) {
  const map: Partial<Record<Die, string>> = {
    4:   'text-accent-red',
    6:   'text-amber-400',
    8:   'text-green-400',
    10:  'text-sky-400',
    12:  'text-violet-400',
    20:  'text-accent-gold',
    100: 'text-pink-400',
  };
  return map[die] ?? 'text-text-secondary';
}

function poolLabel(pool: Partial<Record<Die, number>>, modifier: number) {
  const parts = Object.entries(pool)
    .filter(([, n]) => n && n > 0)
    .map(([d, n]) => `${n}d${d}`);
  if (modifier !== 0) parts.push(modifier > 0 ? `+${modifier}` : String(modifier));
  return parts.join(' + ') || '—';
}

// ── D20 SVG icon ──────────────────────────────────────────────────────────────
function D20Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
      {/* Outer icosahedron silhouette */}
      <polygon points="50,5 95,30 95,70 50,95 5,70 5,30" strokeWidth="4" />
      {/* Top face lines */}
      <line x1="50" y1="5"  x2="50" y2="38" />
      <line x1="5"  y1="30" x2="50" y2="38" />
      <line x1="95" y1="30" x2="50" y2="38" />
      {/* Bottom face lines */}
      <line x1="50" y1="95" x2="50" y2="62" />
      <line x1="5"  y1="70" x2="50" y2="62" />
      <line x1="95" y1="70" x2="50" y2="62" />
      {/* Middle belt */}
      <line x1="50" y1="38" x2="50" y2="62" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DiceRollerDrawer() {
  const [open,     setOpen]     = useState(false);
  const [pool,     setPool]     = useState<Partial<Record<Die, number>>>({});
  const [modifier, setModifier] = useState(0);
  const [result,   setResult]   = useState<HistoryEntry | null>(null);
  const [history,  setHistory]  = useState<HistoryEntry[]>([]);
  const [flash,    setFlash]    = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalDice = Object.values(pool).reduce((s, n) => s + (n ?? 0), 0);

  const add    = (d: Die) => setPool(p => ({ ...p, [d]: (p[d] ?? 0) + 1 }));
  const remove = (d: Die) => setPool(p => {
    const n = (p[d] ?? 0) - 1;
    if (n <= 0) { const { [d]: _, ...rest } = p; return rest; }
    return { ...p, [d]: n };
  });
  const clear = () => { setPool({}); setModifier(0); };

  const roll = () => {
    if (totalDice === 0) return;
    const results: DieResult[] = [];
    for (const [d, count] of Object.entries(pool)) {
      const die = parseInt(d) as Die;
      for (let i = 0; i < (count ?? 0); i++) {
        results.push({ die, value: Math.floor(Math.random() * die) + 1 });
      }
    }
    const subtotal = results.reduce((s, r) => s + r.value, 0);
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      pool: poolLabel(pool, 0),
      modifier,
      results,
      subtotal,
      total: subtotal + modifier,
    };
    setResult(entry);
    setHistory(h => [entry, ...h].slice(0, 10));

    if (flashRef.current) clearTimeout(flashRef.current);
    setFlash(true);
    flashRef.current = setTimeout(() => setFlash(false), 400);
  };

  return (
    <>
      {/* ── Floating tab button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close dice roller' : 'Open dice roller'}
        className={`
          fixed bottom-6 right-6 z-[300]
          w-14 h-14 rounded-2xl
          flex items-center justify-center
          shadow-lg border transition-all duration-200
          ${open
            ? 'bg-accent-gold/20 border-accent-gold/60 text-accent-gold scale-95'
            : 'bg-deep border-accent-gold/30 text-accent-gold/70 hover:text-accent-gold hover:border-accent-gold/60 hover:bg-accent-gold/10 hover:scale-105'
          }
        `}
      >
        <D20Icon className="w-8 h-8" />
      </button>

      {/* ── Slide-up panel ── */}
      <div
        className={`
          fixed bottom-24 right-6 z-[299]
          w-80 max-h-[80vh] overflow-y-auto
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
            <D20Icon className="w-4 h-4 text-accent-gold" />
            <span className="font-display text-xs tracking-[0.12em] uppercase text-accent-gold">Dice Roller</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none"
          ><Icon name="close" className="text-lg" /></button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* ── Die buttons ── */}
          <div className="grid grid-cols-4 gap-2">
            {DICE.map(die => {
              const count = pool[die] ?? 0;
              return (
                <div
                  key={die}
                  className="bg-card border border-border-subtle rounded-xl p-2 flex flex-col items-center gap-1.5"
                >
                  <button
                    onClick={() => add(die)}
                    className={`font-display text-sm font-bold leading-none transition-transform hover:scale-110 active:scale-95 ${dieColour(die)}`}
                    title={`Add d${die}`}
                  >
                    d{die}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => remove(die)}
                      disabled={count === 0}
                      className="w-5 h-5 rounded border border-border-subtle font-mono text-xs text-text-muted
                                 hover:text-accent-red hover:border-accent-red/40 disabled:opacity-20
                                 disabled:cursor-not-allowed transition-colors"
                    >−</button>
                    <span className="font-mono text-xs text-text-primary w-4 text-center select-none">
                      {count || <span className="text-text-muted">0</span>}
                    </span>
                    <button
                      onClick={() => add(die)}
                      className="w-5 h-5 rounded border border-border-subtle font-mono text-xs text-text-muted
                                 hover:text-accent-gold hover:border-accent-gold/40 transition-colors"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pool bar ── */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-card border border-border-subtle rounded-lg px-3 py-1.5 font-mono text-xs min-h-[2rem] flex items-center">
              {totalDice === 0
                ? <span className="text-text-muted">Select dice…</span>
                : <span className="text-text-secondary">{poolLabel(pool, modifier)}</span>
              }
            </div>

            {/* Modifier */}
            <div className="flex items-center gap-1">
              <span className="font-mono text-[0.6rem] text-text-muted">MOD</span>
              <div className="flex items-center">
                <button
                  onClick={() => setModifier(m => m - 1)}
                  className="w-5 h-7 border border-r-0 border-border-subtle rounded-l font-mono text-xs text-text-muted hover:text-accent-red transition-colors"
                >−</button>
                <input
                  type="number"
                  value={modifier}
                  onChange={e => setModifier(parseInt(e.target.value) || 0)}
                  className="w-8 h-7 border-y border-border-subtle bg-card text-center font-mono text-xs text-text-primary focus:outline-none"
                />
                <button
                  onClick={() => setModifier(m => m + 1)}
                  className="w-5 h-7 border border-l-0 border-border-subtle rounded-r font-mono text-xs text-text-muted hover:text-accent-gold transition-colors"
                >+</button>
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            <button
              onClick={clear}
              disabled={totalDice === 0 && modifier === 0}
              className="font-mono text-xs text-text-muted hover:text-accent-red disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-2 rounded-lg border border-border-subtle"
            >
              Clear
            </button>
            <button
              onClick={roll}
              disabled={totalDice === 0}
              className="flex-1 py-2 rounded-lg bg-accent-gold/10 border border-accent-gold/30 font-display text-xs
                         tracking-widest text-accent-gold uppercase hover:bg-accent-gold/20
                         disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Icon name="casino" className="text-sm align-middle" /> Roll
            </button>
          </div>

          {/* ── Result ── */}
          {result && (
            <div className={`bg-card border rounded-xl p-4 transition-all duration-300 ${flash ? 'border-accent-gold/60 scale-[1.02]' : 'border-accent-gold/20'}`}>
              <div className="text-center mb-3">
                <p className={`font-display font-black leading-none transition-all duration-300 ${flash ? 'text-5xl text-accent-gold' : 'text-4xl text-accent-gold'}`}>
                  {result.total}
                </p>
                {result.modifier !== 0 && (
                  <p className="font-mono text-[0.6rem] text-text-muted mt-1">
                    {result.subtotal} {result.modifier > 0 ? '+' : '−'} {Math.abs(result.modifier)} mod
                  </p>
                )}
                <p className="font-mono text-[0.55rem] text-text-muted mt-0.5">{result.pool}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {result.results.map((r, i) => {
                  const isCrit   = r.value === r.die;
                  const isFumble = r.value === 1 && r.die === 20;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center rounded-lg border px-2 py-1 min-w-[2rem]
                        ${isCrit   ? 'border-accent-gold/60 bg-accent-gold/10' : ''}
                        ${isFumble ? 'border-accent-red/60  bg-accent-red/10'  : ''}
                        ${!isCrit && !isFumble ? 'border-border-subtle bg-card-hover' : ''}
                      `}
                      title={isCrit ? 'Critical!' : isFumble ? 'Fumble!' : undefined}
                    >
                      <span className={`font-mono text-xs font-bold ${isCrit ? 'text-accent-gold' : isFumble ? 'text-accent-red' : 'text-text-primary'}`}>
                        {r.value}{isCrit && <span className="text-[0.5rem] ml-0.5">★</span>}
                      </span>
                      <span className={`font-mono text-[0.55rem] ${dieColour(r.die)}`}>d{r.die}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── History ── */}
          {history.length > 1 && (
            <div>
              <h3 className="font-display text-[0.6rem] text-text-muted uppercase tracking-widest mb-1.5">History</h3>
              <div className="flex flex-col gap-1">
                {history.slice(1).map(h => (
                  <div key={h.id} className="bg-card border border-border-subtle rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.6rem] text-text-muted truncate">
                      {h.pool}{h.modifier !== 0 ? (h.modifier > 0 ? ` +${h.modifier}` : ` ${h.modifier}`) : ''}
                    </span>
                    <span className="font-mono text-[0.6rem] text-text-secondary shrink-0">
                      [{h.results.map(r => r.value).join(', ')}]
                    </span>
                    <span className="font-mono text-xs font-bold text-accent-gold shrink-0">{h.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
