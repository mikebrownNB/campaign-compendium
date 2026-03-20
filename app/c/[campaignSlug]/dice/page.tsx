'use client';

import { useState, useRef } from 'react';
import { PageHeader } from '@/components/UI';

const DICE = [2, 4, 6, 8, 10, 12, 20, 100] as const;
type Die = (typeof DICE)[number];

interface DieResult { die: Die; value: number; }
interface HistoryEntry {
  id: string;
  pool: string;
  modifier: number;
  results: DieResult[];
  subtotal: number;
  total: number;
}

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
  return parts.join(' + ') || '\u2014';
}

export default function DiceRollerPage() {
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
      id:       crypto.randomUUID(),
      pool:     poolLabel(pool, 0),
      modifier,
      results,
      subtotal,
      total:    subtotal + modifier,
    };

    setResult(entry);
    setHistory(h => [entry, ...h].slice(0, 15));

    // flash animation
    if (flashRef.current) clearTimeout(flashRef.current);
    setFlash(true);
    flashRef.current = setTimeout(() => setFlash(false), 400);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader icon="🎲" title="Dice Roller" />

      {/* \u2500\u2500 Die buttons \u2500\u2500 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {DICE.map(die => {
          const count = pool[die] ?? 0;
          return (
            <div key={die} className="bg-card border border-border-subtle rounded-xl p-3 flex flex-col items-center gap-2">
              <button
                onClick={() => add(die)}
                className={`font-display text-lg font-bold leading-none transition-colors hover:scale-105 active:scale-95 ${dieColour(die)}`}
                title={`Add d${die}`}
              >
                d{die}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => remove(die)}
                  disabled={count === 0}
                  className="w-6 h-6 rounded border border-border-subtle font-mono text-sm text-text-muted
                             hover:text-accent-red hover:border-accent-red/40 disabled:opacity-20
                             disabled:cursor-not-allowed transition-colors"
                >−</button>
                <span className="font-mono text-sm text-text-primary w-5 text-center select-none">
                  {count || <span className="text-text-muted">0</span>}
                </span>
                <button
                  onClick={() => add(die)}
                  className="w-6 h-6 rounded border border-border-subtle font-mono text-sm text-text-muted
                             hover:text-accent-gold hover:border-accent-gold/40 transition-colors"
                >+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* \u2500\u2500 Pool bar \u2500\u2500 */}
      <div className="flex items-center gap-3 mb-5">
        {/* Pool label */}
        <div className="flex-1 bg-card border border-border-subtle rounded-lg px-4 py-2 font-mono text-sm min-h-[2.5rem] flex items-center">
          {totalDice === 0
            ? <span className="text-text-muted">Select dice above…</span>
            : <span className="text-text-secondary">{poolLabel(pool, modifier)}</span>
          }
        </div>

        {/* Modifier */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-text-muted">MOD</span>
          <div className="flex items-center">
            <button
              onClick={() => setModifier(m => m - 1)}
              className="w-6 h-8 border border-r-0 border-border-subtle rounded-l font-mono text-sm text-text-muted hover:text-accent-red transition-colors"
            >−</button>
            <input
              type="number"
              value={modifier}
              onChange={e => setModifier(parseInt(e.target.value) || 0)}
              className="w-10 h-8 border-y border-border-subtle bg-card text-center font-mono text-sm text-text-primary focus:outline-none"
            />
            <button
              onClick={() => setModifier(m => m + 1)}
              className="w-6 h-8 border border-l-0 border-border-subtle rounded-r font-mono text-sm text-text-muted hover:text-accent-gold transition-colors"
            >+</button>
          </div>
        </div>

        <button
          onClick={clear}
          disabled={totalDice === 0 && modifier === 0}
          className="font-mono text-xs text-text-muted hover:text-accent-red disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>

        <button
          onClick={roll}
          disabled={totalDice === 0}
          className="px-5 py-2 rounded-lg bg-accent-gold/10 border border-accent-gold/30 font-display text-xs tracking-widest
                     text-accent-gold uppercase hover:bg-accent-gold/20 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all active:scale-95"
        >
          🎲 Roll
        </button>
      </div>

      {/* \u2500\u2500 Result panel \u2500\u2500 */}
      {result && (
        <div
          className={`bg-card border rounded-xl p-5 mb-6 transition-all duration-300
            ${flash ? 'border-accent-gold/60 scale-[1.02]' : 'border-accent-gold/20'}`}
        >
          {/* Total */}
          <div className="text-center mb-4">
            <p className={`font-display font-black leading-none transition-all duration-300 ${flash ? 'text-5xl text-accent-gold' : 'text-4xl text-accent-gold'}`}>
              {result.total}
            </p>
            {result.modifier !== 0 && (
              <p className="font-mono text-xs text-text-muted mt-1">
                {result.subtotal} {result.modifier > 0 ? '+' : '−'} {Math.abs(result.modifier)} modifier
              </p>
            )}
            <p className="font-mono text-[0.6rem] text-text-muted mt-0.5">{result.pool}</p>
          </div>

          {/* Individual dice */}
          <div className="flex flex-wrap gap-2 justify-center">
            {result.results.map((r, i) => {
              const isCrit = r.value === r.die;
              const isFumble = r.value === 1 && r.die === 20;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center rounded-lg border px-2.5 py-1.5 min-w-[2.5rem]
                    ${isCrit   ? 'border-accent-gold/60 bg-accent-gold/10'  : ''}
                    ${isFumble ? 'border-accent-red/60  bg-accent-red/10'   : ''}
                    ${!isCrit && !isFumble ? 'border-border-subtle bg-card-hover' : ''}
                  `}
                  title={isCrit ? 'Critical!' : isFumble ? 'Fumble!' : undefined}
                >
                  <span className={`font-mono text-sm font-bold ${isCrit ? 'text-accent-gold' : isFumble ? 'text-accent-red' : 'text-text-primary'}`}>
                    {r.value}
                    {isCrit && <span className="text-[0.6rem] ml-0.5">★</span>}
                  </span>
                  <span className={`font-mono text-[0.6rem] ${dieColour(r.die)}`}>d{r.die}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* \u2500\u2500 History \u2500\u2500 */}
      {history.length > 1 && (
        <div>
          <h3 className="font-display text-[0.65rem] text-text-muted uppercase tracking-widest mb-2">Roll History</h3>
          <div className="flex flex-col gap-1">
            {history.slice(1).map(h => (
              <div key={h.id} className="bg-card border border-border-subtle rounded-lg px-4 py-2 flex items-center justify-between gap-4">
                <span className="font-mono text-[0.65rem] text-text-muted truncate">{h.pool}{h.modifier !== 0 ? (h.modifier > 0 ? ` +${h.modifier}` : ` ${h.modifier}`) : ''}</span>
                <span className="font-mono text-xs text-text-secondary shrink-0">
                  [{h.results.map(r => r.value).join(', ')}]
                </span>
                <span className="font-mono text-sm font-bold text-accent-purple shrink-0">{h.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
