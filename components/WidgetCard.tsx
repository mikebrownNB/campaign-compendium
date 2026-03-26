'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import type {
  WidgetConfig,
  StatTrackerWidgetConfig,
  SpelljammerWidgetConfig,
  SpelljammerWeapon,
} from '@/lib/types';

interface Props {
  widget: WidgetConfig;
  campaignId: string;
  isDM: boolean;
  onSave?: (updated: WidgetConfig) => Promise<void>;
}

// ── Dice helpers ──────────────────────────────────────────────────────────────

function d(sides: number) { return Math.floor(Math.random() * sides) + 1; }

function parseDice(notation: string): { count: number; sides: number; bonus: number } | null {
  const m = notation.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  return { count: +m[1], sides: +m[2], bonus: m[3] ? +m[3] : 0 };
}

function rollDamage(notation: string) {
  const p = parseDice(notation);
  if (!p) return null;
  const rolls = Array.from({ length: p.count }, () => d(p.sides));
  return { total: rolls.reduce((a, b) => a + b, 0) + p.bonus, rolls, bonus: p.bonus, notation };
}

interface AttackResult {
  mode: 'normal' | 'advantage' | 'disadvantage';
  d20s: number[];
  used: number;
  mod: number;
  total: number;
}

function doAttack(mod: number, mode: 'normal' | 'advantage' | 'disadvantage'): AttackResult {
  const r1 = d(20);
  if (mode === 'normal') return { mode, d20s: [r1], used: r1, mod, total: r1 + mod };
  const r2 = d(20);
  const used = mode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2);
  return { mode, d20s: [r1, r2], used, mod, total: used + mod };
}

// ── Stat Tracker card ─────────────────────────────────────────────────────────

function StatTrackerCard({
  widget, isDM, onSave,
}: { widget: StatTrackerWidgetConfig; isDM: boolean; onSave?: (u: WidgetConfig) => Promise<void> }) {
  const [fields, setFields] = useState(widget.fields);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ ...widget, fields });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-accent-gold/20 rounded-lg p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold/40 to-accent-purple/40" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider">{widget.name}</h3>
        {isDM && (
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors"
          >
            {saving ? 'Saving...' : editing ? 'Save' : 'Edit'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f, i) => (
          <div key={i} className="bg-deep/50 rounded-lg p-3 text-center">
            <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider mb-1">{f.label}</p>
            {editing ? (
              <input
                value={f.value}
                onChange={e => {
                  const u = [...fields];
                  u[i] = { ...f, value: e.target.value };
                  setFields(u);
                }}
                className="w-full bg-transparent text-center font-display text-lg font-bold text-accent-gold border-b border-border-subtle focus:outline-none focus:border-accent-gold"
              />
            ) : (
              <p className="font-display text-lg font-bold text-accent-gold">{f.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Spelljammer card ──────────────────────────────────────────────────────────

interface WeaponRoll {
  attack?: AttackResult;
  damage?: ReturnType<typeof rollDamage>;
}

const INPUT_CLS =
  'w-full bg-deep/50 border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-gold';

function SpelljammerCard({
  widget, isDM, onSave,
}: { widget: SpelljammerWidgetConfig; isDM: boolean; onSave?: (u: WidgetConfig) => Promise<void> }) {
  const [data, setData] = useState<SpelljammerWidgetConfig>({
    ...widget,
    weapons: widget.weapons.map(w => ({ ...w })),
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rolls, setRolls] = useState<Record<string, WeaponRoll>>({});
  const [hpInput, setHpInput] = useState('');
  const [hpResult, setHpResult] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setData({ ...widget, weapons: widget.weapons.map(w => ({ ...w })) });
    setEditing(false);
  };

  const set = <K extends keyof SpelljammerWidgetConfig>(k: K, v: SpelljammerWidgetConfig[K]) =>
    setData(d => ({ ...d, [k]: v }));

  const updateWeapon = (id: string, ch: Partial<SpelljammerWeapon>) =>
    setData(d => ({ ...d, weapons: d.weapons.map(w => w.id === id ? { ...w, ...ch } : w) }));

  const addWeapon = () =>
    setData(d => ({ ...d, weapons: [...d.weapons, { id: crypto.randomUUID(), name: 'New Weapon', hitModifier: 0, damage: '1d6' }] }));

  const removeWeapon = (id: string) =>
    setData(d => ({ ...d, weapons: d.weapons.filter(w => w.id !== id) }));

  const attack = (wId: string, mod: number, mode: 'normal' | 'advantage' | 'disadvantage') => {
    setRolls(r => ({ ...r, [wId]: { attack: doAttack(mod, mode), damage: undefined } }));
  };

  const damage = (wId: string, notation: string) => {
    const result = rollDamage(notation);
    if (result) setRolls(r => ({ ...r, [wId]: { ...r[wId], damage: result } }));
  };

  const applyHp = async (mode: 'damage' | 'heal') => {
    const amount = parseInt(hpInput);
    if (!amount || amount <= 0) return;

    let newHp: number;
    let msg: string;

    if (mode === 'heal') {
      newHp = Math.min(data.maxHp, data.currentHp + amount);
      const healed = newHp - data.currentHp;
      msg = healed > 0 ? `+${healed} HP` : 'Already at max HP';
    } else {
      if (amount <= data.damageThreshold) {
        msg = `${amount} ≤ DT ${data.damageThreshold} — no damage`;
        setHpResult(msg);
        return;
      }
      const effective = amount - data.damageThreshold;
      newHp = Math.max(0, data.currentHp - effective);
      msg = `−${effective} HP (${amount} − ${data.damageThreshold} DT)`;
    }

    const updated = { ...data, currentHp: newHp };
    setData(updated);
    setHpInput('');
    setHpResult(msg);
    onSave?.(updated);
  };

  const hpPct = data.currentHp / Math.max(data.maxHp, 1);
  const hpColor = hpPct <= 0.25 ? 'text-accent-red' : hpPct <= 0.5 ? 'text-yellow-400' : 'text-accent-gold';

  return (
    <div className="bg-card border border-accent-gold/20 rounded-lg p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold/40 to-accent-purple/40" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name="rocket_launch" className="text-base text-accent-gold" />
          <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider">{data.name}</h3>
          <span className="font-mono text-[0.48rem] text-text-muted uppercase tracking-widest border border-border-subtle rounded px-1.5 py-0.5">
            Spelljammer
          </span>
        </div>
        {isDM && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        /* ── Edit mode ── */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">Ship Name</label>
              <input value={data.name} onChange={e => set('name', e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">Current HP</label>
              <input type="number" value={data.currentHp} onChange={e => set('currentHp', +e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">Max HP</label>
              <input type="number" value={data.maxHp} onChange={e => set('maxHp', +e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">AC</label>
              <input type="number" value={data.ac} onChange={e => set('ac', +e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">Speed</label>
              <input type="number" value={data.speed} onChange={e => set('speed', +e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">Damage Threshold</label>
              <input type="number" value={data.damageThreshold} onChange={e => set('damageThreshold', +e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider block mb-1">Description</label>
              <textarea
                value={data.description ?? ''}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className="w-full bg-deep/50 border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-gold resize-none"
              />
            </div>
          </div>

          {/* Weapons editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">Weapons</span>
              <button
                onClick={addWeapon}
                className="font-mono text-[0.6rem] text-accent-gold hover:text-accent-gold/70 transition-colors"
              >
                + Add Weapon
              </button>
            </div>
            {data.weapons.length > 0 && (
              <div className="grid grid-cols-[1fr_58px_80px_24px] gap-1 mb-1">
                {['Name', 'Hit Mod', 'Damage', ''].map((h, i) => (
                  <span key={i} className="font-mono text-[0.48rem] text-text-muted uppercase px-1">{h}</span>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {data.weapons.map(w => (
                <div key={w.id} className="grid grid-cols-[1fr_58px_80px_24px] gap-1 items-center">
                  <input
                    value={w.name}
                    onChange={e => updateWeapon(w.id, { name: e.target.value })}
                    placeholder="Ballista"
                    className="bg-deep/50 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={w.hitModifier}
                    onChange={e => updateWeapon(w.id, { hitModifier: +e.target.value })}
                    className="bg-deep/50 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-gold text-center"
                  />
                  <input
                    value={w.damage}
                    onChange={e => updateWeapon(w.id, { damage: e.target.value })}
                    placeholder="3d10"
                    className="bg-deep/50 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-gold text-center"
                  />
                  <button
                    onClick={() => removeWeapon(w.id)}
                    className="text-text-muted hover:text-accent-red font-mono text-base leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border-subtle">
            <button
              onClick={handleSave}
              disabled={saving}
              className="font-mono text-[0.65rem] bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold border border-accent-gold/30 rounded px-3 py-1.5 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              className="font-mono text-[0.65rem] text-text-muted hover:text-text-primary border border-border-subtle rounded px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── Display mode ── */
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="col-span-2 bg-deep/50 rounded-lg p-3 text-center">
              <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mb-1">Hull Points</p>
              <p className="font-display text-lg font-bold leading-tight">
                <span className={hpColor}>{data.currentHp}</span>
                <span className="text-text-muted text-sm"> / {data.maxHp}</span>
              </p>
            </div>
            <div className="bg-deep/50 rounded-lg p-3 text-center">
              <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mb-1">AC</p>
              <p className="font-display text-lg font-bold text-accent-gold">{data.ac}</p>
            </div>
            <div className="bg-deep/50 rounded-lg p-3 text-center">
              <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mb-1">Speed</p>
              <p className="font-display text-lg font-bold text-accent-gold">{data.speed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">Damage Threshold:</span>
            <span className="font-display text-sm font-bold text-accent-gold">{data.damageThreshold}</span>
          </div>

          {/* HP application */}
          <div className="bg-deep/40 border border-border-subtle rounded-lg px-3 py-2.5 mb-4">
            <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mb-2">Apply Damage / Healing</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={hpInput}
                onChange={e => { setHpInput(e.target.value); setHpResult(null); }}
                onKeyDown={e => { if (e.key === 'Enter') applyHp('damage'); }}
                placeholder="Amount"
                className="w-24 bg-deep/60 border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-gold font-mono text-center"
              />
              <button
                onClick={() => applyHp('damage')}
                className="font-mono text-[0.65rem] border border-accent-red/40 text-accent-red/80 hover:bg-accent-red/10 rounded px-3 py-1.5 transition-colors"
              >
                ⚔ Damage
              </button>
              <button
                onClick={() => applyHp('heal')}
                className="font-mono text-[0.65rem] border border-green-500/40 text-green-400 hover:bg-green-500/10 rounded px-3 py-1.5 transition-colors"
              >
                + Heal
              </button>
            </div>
            {hpResult && (
              <p className={`mt-1.5 font-mono text-[0.6rem] ${hpResult.includes('no damage') ? 'text-text-muted' : hpResult.startsWith('+') ? 'text-green-400' : 'text-accent-red/80'}`}>
                {hpResult}
              </p>
            )}
          </div>

          {data.description && (
            <p className="text-text-secondary text-sm italic mb-4 border-t border-border-subtle pt-3">
              &ldquo;{data.description}&rdquo;
            </p>
          )}

          {/* Weapons */}
          {data.weapons.length > 0 && (
            <div className="border-t border-border-subtle pt-3 space-y-3">
              <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">Weapons</p>
              {data.weapons.map(w => {
                const wr = rolls[w.id];
                const atk = wr?.attack;
                const dmg = wr?.damage;
                const isCrit = atk?.used === 20;
                const isFumble = atk?.used === 1;

                return (
                  <div key={w.id} className="bg-deep/30 rounded-lg p-3">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-display text-sm font-bold text-text-primary">{w.name}</span>
                      <span className="font-mono text-[0.6rem] text-text-muted">
                        {w.hitModifier >= 0 ? '+' : ''}{w.hitModifier} to hit · {w.damage}
                      </span>
                    </div>

                    {/* Roll buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['normal', 'advantage', 'disadvantage'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => attack(w.id, w.hitModifier, mode)}
                          className={`font-mono text-[0.6rem] border rounded px-2 py-1 transition-colors ${
                            mode === 'normal'
                              ? 'border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10'
                              : mode === 'advantage'
                              ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                              : 'border-accent-red/30 text-accent-red/70 hover:bg-accent-red/10'
                          }`}
                        >
                          {mode === 'normal' ? 'Roll' : mode === 'advantage' ? 'Adv ▲' : 'Dis ▼'}
                        </button>
                      ))}
                      {atk && (
                        <button
                          onClick={() => damage(w.id, w.damage)}
                          className="font-mono text-[0.6rem] border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 rounded px-2 py-1 transition-colors ml-1"
                        >
                          Roll {w.damage}
                        </button>
                      )}
                    </div>

                    {/* Roll result */}
                    {atk && (
                      <div className={`mt-2 rounded px-3 py-2 ${
                        isCrit
                          ? 'bg-accent-gold/10 border border-accent-gold/30'
                          : isFumble
                          ? 'bg-accent-red/10 border border-accent-red/30'
                          : 'bg-deep/50'
                      }`}>
                        <span className="font-mono text-sm font-bold">
                          {isCrit ? '✦ CRIT! ' : isFumble ? '💀 FUMBLE! ' : '🎯 '}
                          <span className={isCrit ? 'text-accent-gold' : isFumble ? 'text-accent-red' : 'text-text-primary'}>
                            {atk.total}
                          </span>
                          <span className="text-text-muted font-normal text-[0.65rem] ml-1">
                            to hit (
                            {atk.d20s.length > 1
                              ? `${atk.d20s.join(', ')} → ${atk.used}`
                              : `${atk.used}`}
                            {atk.mod !== 0 && ` ${atk.mod > 0 ? '+' : ''}${atk.mod}`})
                            {atk.mode !== 'normal' && (
                              <span className={`ml-1 ${atk.mode === 'advantage' ? 'text-green-400' : 'text-accent-red/70'}`}>
                                [{atk.mode}]
                              </span>
                            )}
                          </span>
                        </span>
                        {dmg && (
                          <div className="mt-1 font-mono text-[0.65rem] text-accent-purple">
                            💥 {dmg.total} damage ({dmg.rolls.join(' + ')}
                            {dmg.bonus !== 0 && ` ${dmg.bonus > 0 ? '+' : ''}${dmg.bonus}`})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export function WidgetCard({ widget, campaignId, isDM, onSave }: Props) {
  if (widget.type === 'stat-tracker') {
    return <StatTrackerCard widget={widget} isDM={isDM} onSave={onSave} />;
  }
  if (widget.type === 'spelljammer') {
    return <SpelljammerCard widget={widget} isDM={isDM} onSave={onSave} />;
  }
  return null;
}
