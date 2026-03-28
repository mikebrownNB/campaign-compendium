'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { useCampaign } from '@/lib/CampaignContext';
import type { Ship } from '@/lib/types';
import type { ShipConfig, WeaponBayConfig, ComputedStats } from '@/lib/shipyard/types';
import { MODULES, getModuleById } from '@/lib/shipyard/modules';
import { HULL_TYPES, HULL_IMPROVEMENTS } from '@/lib/shipyard/hulls';
import { SAIL_OPTIONS, SAIL_IMPROVEMENTS } from '@/lib/shipyard/sails';
import { WEAPON_TYPES, WEAPON_BAY_IMPROVEMENTS } from '@/lib/shipyard/weapons';
import { BASE_SHIPS } from '@/lib/shipyard/base-ships';
import { computeShipStats, formatGp, calculateUpgradeTime, type UpgradeEstimate } from '@/lib/shipyard/formulas';
import { PageHeader, Button, Input, EmptyState } from '@/components/UI';
import { Icon } from '@/components/Icon';

function emptyConfig(): ShipConfig {
  return {
    hullType: 'wood',
    hullImprovements: [],
    sailsCount: 0,
    sailImprovements: [],
    modules: [{ moduleId: 'spelljamming-helm', quantity: 1, improvements: [] }],
    weaponBays: [],
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core Systems', crew: 'Crew Quarters', combat: 'Combat', utility: 'Utility', special: 'Special',
};
const CATEGORY_ORDER = ['core', 'crew', 'combat', 'utility', 'special'];
const HIDDEN_MODULE_IDS = ['armored-hull', 'sails'];

export default function ShipyardPage() {
  const { isDM } = useCampaign();
  const { items: ships, loading, create, update, remove } = useCampaignCrud<Ship>('ships');

  const [view, setView] = useState<'list' | 'builder' | 'detail'>('list');
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [showBaseShips, setShowBaseShips] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [upgradeConfirm, setUpgradeConfirm] = useState<UpgradeEstimate | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [shipName, setShipName] = useState('');
  const [config, setConfig] = useState<ShipConfig>(emptyConfig());
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const stats = useMemo(() => computeShipStats(config), [config]);

  const updateConfig = useCallback((updater: (c: ShipConfig) => ShipConfig) => {
    setConfig(prev => updater(prev));
  }, []);

  const startNewShip = () => {
    setEditId(null); setShipName(''); setConfig(emptyConfig()); setExpandedModule(null); setView('builder');
  };

  const startFromTemplate = (baseShipId: string) => {
    const base = BASE_SHIPS.find(b => b.id === baseShipId);
    if (!base) return;
    setEditId(null); setShipName(base.name); setConfig({ ...base.config, baseShipId: base.id });
    setShowBaseShips(false); setExpandedModule(null); setView('builder');
  };

  const editShip = (ship: Ship) => {
    setEditId(ship.id); setShipName(ship.name); setConfig(ship.config); setExpandedModule(null); setView('builder');
  };

  const viewShip = (ship: Ship) => { setSelectedShipId(ship.id); setView('detail'); };

  const saveShip = async () => {
    if (!shipName.trim()) return;
    if (editId) {
      const originalShip = ships.find(s => s.id === editId);
      if (originalShip) {
        const estimate = calculateUpgradeTime(originalShip.config, config);
        if (estimate.days > 0) {
          setUpgradeConfirm(estimate);
          return;
        }
      }
    }
    await doSave();
  };

  const doSave = async () => {
    setSaving(true);
    try {
      if (editId) { await update({ id: editId, name: shipName.trim(), config } as unknown as Record<string, unknown> & { id: string }); }
      else { await create({ name: shipName.trim(), config } as unknown as Record<string, unknown> & { id: string }); }
      setView('list');
    } finally { setSaving(false); setUpgradeConfirm(null); }
  };

  const deleteShip = async (id: string) => {
    await remove(id); setDeleteConfirm(null);
    if (selectedShipId === id) setView('list');
  };

  const addModule = (moduleId: string) => {
    updateConfig(c => {
      const existing = c.modules.find(m => m.moduleId === moduleId);
      const moduleDef = getModuleById(moduleId);
      if (existing && moduleDef?.maxQuantity && existing.quantity >= moduleDef.maxQuantity) return c;
      if (existing) {
        const newWeaponBays = moduleId === 'weapon-bay'
          ? [...c.weaponBays, { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] }]
          : c.weaponBays;
        return { ...c, modules: c.modules.map(m => m.moduleId === moduleId ? { ...m, quantity: m.quantity + 1 } : m), weaponBays: newWeaponBays };
      }
      const newModules = [...c.modules, { moduleId, quantity: 1, improvements: [] }];
      const newWeaponBays = moduleId === 'weapon-bay'
        ? [...c.weaponBays, { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] }]
        : c.weaponBays;
      return { ...c, modules: newModules, weaponBays: newWeaponBays };
    });
  };

  const removeModule = (moduleId: string) => {
    if (moduleId === 'spelljamming-helm') return;
    updateConfig(c => {
      const existing = c.modules.find(m => m.moduleId === moduleId);
      if (!existing) return c;
      if (existing.quantity > 1) {
        const newWeaponBays = moduleId === 'weapon-bay' ? c.weaponBays.slice(0, -1) : c.weaponBays;
        return { ...c, modules: c.modules.map(m => m.moduleId === moduleId ? { ...m, quantity: m.quantity - 1 } : m), weaponBays: newWeaponBays };
      }
      const newWeaponBays = moduleId === 'weapon-bay' ? [] : c.weaponBays;
      return { ...c, modules: c.modules.filter(m => m.moduleId !== moduleId), weaponBays: newWeaponBays };
    });
  };

  const toggleModuleImprovement = (moduleId: string, improvementId: string) => {
    updateConfig(c => ({
      ...c,
      modules: c.modules.map(m => {
        if (m.moduleId !== moduleId) return m;
        const has = m.improvements.includes(improvementId);
        return { ...m, improvements: has ? m.improvements.filter(i => i !== improvementId) : [...m.improvements, improvementId] };
      }),
    }));
  };

  const toggleHullImprovement = (improvementId: string) => {
    updateConfig(c => ({
      ...c,
      hullImprovements: c.hullImprovements.includes(improvementId)
        ? c.hullImprovements.filter(i => i !== improvementId)
        : [...c.hullImprovements, improvementId],
    }));
  };

  const toggleSailImprovement = (improvementId: string) => {
    updateConfig(c => ({
      ...c,
      sailImprovements: c.sailImprovements.includes(improvementId)
        ? c.sailImprovements.filter(i => i !== improvementId)
        : [...c.sailImprovements, improvementId],
    }));
  };

  const updateWeaponBay = (bayIndex: number, weaponId: string, count: number) => {
    updateConfig(c => ({
      ...c,
      weaponBays: c.weaponBays.map((wb, i) =>
        i === bayIndex ? { ...wb, weapons: [{ weaponId, count: Math.max(1, Math.min(2, count)) }] } : wb
      ),
    }));
  };

  const toggleWeaponBayImprovement = (bayIndex: number, improvementId: string) => {
    updateConfig(c => ({
      ...c,
      weaponBays: c.weaponBays.map((wb, i) => {
        if (i !== bayIndex) return wb;
        const has = wb.improvements.includes(improvementId);
        return { ...wb, improvements: has ? wb.improvements.filter(imp => imp !== improvementId) : [...wb.improvements, improvementId] };
      }),
    }));
  };

  const installedModuleIds = config.modules.map(m => m.moduleId);

  // ── Ship List View ─────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <PageHeader icon="rocket_launch" title="Shipyard" subtitle="Build and manage your spelljammer fleet">
          <div className="flex gap-2">
            <Button onClick={() => setShowBaseShips(true)}><Icon name="auto_awesome" className="text-sm" /> Base Ships</Button>
            <Button onClick={startNewShip}><Icon name="add" className="text-sm" /> Build New</Button>
          </div>
        </PageHeader>

        {loading ? (
          <p className="text-text-muted font-mono text-sm">Loading ships...</p>
        ) : ships.length === 0 ? (
          <EmptyState icon="rocket_launch" message="No ships yet. Build one from scratch or start from a base ship template." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ships.map(ship => {
              const s = computeShipStats(ship.config);
              const hull = HULL_TYPES.find(h => h.id === ship.config.hullType);
              return (
                <button key={ship.id} onClick={() => viewShip(ship)}
                  className="text-left bg-card border border-border-subtle rounded-xl p-5 hover:border-accent-gold/30 transition-all group">
                  <h3 className="font-display text-accent-gold text-sm tracking-wider uppercase group-hover:text-accent-gold/80">{ship.name}</h3>
                  <p className="font-mono text-[0.6rem] text-text-muted mt-1">
                    {hull?.name ?? 'Wood'} Hull &middot; {ship.config.modules.reduce((sum, m) => sum + m.quantity, 0)} modules
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <StatMini label="AC" value={s.ac} />
                    <StatMini label="HP" value={s.hp} />
                    <StatMini label="Cost" value={formatGp(s.cost)} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {showBaseShips && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70" onClick={() => setShowBaseShips(false)} />
            <div className="relative bg-deep border border-border-subtle rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-accent-gold text-lg tracking-wider uppercase">Base Ship Templates</h2>
                <button onClick={() => setShowBaseShips(false)} className="text-text-muted hover:text-text-primary"><Icon name="close" /></button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {BASE_SHIPS.map(ship => (
                  <button key={ship.id} onClick={() => startFromTemplate(ship.id)}
                    className="text-left bg-card border border-border-subtle rounded-xl p-5 hover:border-accent-gold/30 transition-all">
                    <h3 className="font-display text-accent-gold text-sm tracking-wider uppercase">{ship.name}</h3>
                    <p className="text-text-secondary text-xs mt-2 line-clamp-2">{ship.description}</p>
                    <div className="mt-3 grid grid-cols-4 gap-1">
                      <StatMini label="AC" value={ship.stats.ac} />
                      <StatMini label="HP" value={ship.stats.hp} />
                      <StatMini label="Crew" value={ship.stats.crew} />
                      <StatMini label="Cost" value={formatGp(ship.stats.cost)} />
                    </div>
                    <p className="font-mono text-[0.55rem] text-text-muted mt-2">{ship.stats.speed} &middot; Cargo: {ship.stats.cargo} tons</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && <DeleteModal onCancel={() => setDeleteConfirm(null)} onConfirm={() => deleteShip(deleteConfirm)} />}
      </div>
    );
  }

  // ── Ship Detail View ───────────────────────────────────────────
  if (view === 'detail' && selectedShipId) {
    const ship = ships.find(s => s.id === selectedShipId);
    if (!ship) return null;
    const s = computeShipStats(ship.config);
    const hull = HULL_TYPES.find(h => h.id === ship.config.hullType);

    return (
      <div>
        <PageHeader icon="rocket_launch" title={ship.name} subtitle="Ship Details">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setView('list')}><Icon name="arrow_back" className="text-sm" /> Back</Button>
            <Button size="sm" onClick={() => editShip(ship)}><Icon name="edit" className="text-sm" /> Edit</Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(ship.id)}><Icon name="delete" className="text-sm" /> Delete</Button>
          </div>
        </PageHeader>

        <div className="bg-card border border-border-subtle rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBlock label="Armor Class" value={`${s.ac} (${hull?.material ?? 'wood'})`} />
            <StatBlock label="Hit Points" value={s.hp} />
            <StatBlock label="Damage Threshold" value={s.damageThreshold} />
            <StatBlock label="Speed" value={s.flyingSpeed} sub={[
              s.walkingSpeed ? `walk ${s.walkingSpeed}` : '',
              s.swimmingSpeed ? `swim ${s.swimmingSpeed}` : '',
            ].filter(Boolean).join(', ')} />
            <StatBlock label="Cargo" value={`${s.cargo} ton${s.cargo !== 1 ? 's' : ''}`} />
            <StatBlock label="Crew" value={s.crew} />
            <StatBlock label="Modules" value={s.totalModules} />
            <StatBlock label="Total Cost" value={formatGp(s.cost)} />
          </div>
        </div>

        <h3 className="font-display text-text-primary text-sm tracking-wider uppercase mb-3">Installed Modules</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {ship.config.modules.map((mc, idx) => {
            const mod = getModuleById(mc.moduleId);
            if (!mod) return null;
            return (
              <div key={`${mc.moduleId}-${idx}`} className="bg-card border border-border-subtle rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-accent-gold text-xs tracking-wider uppercase">
                    {mod.name} {mc.quantity > 1 ? `×${mc.quantity}` : ''}
                  </span>
                  <span className="font-mono text-[0.6rem] text-text-muted">{formatGp(mod.cost)}</span>
                </div>
                <p className="text-text-secondary text-xs mt-1">{mod.functionDescription}</p>
                {mc.improvements.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mc.improvements.map(impId => {
                      const imp = mod.improvements.find(i => i.id === impId);
                      return imp ? (
                        <span key={impId} className="inline-block bg-accent-purple/10 text-accent-purple border border-accent-purple/20 rounded px-2 py-0.5 font-mono text-[0.55rem]">
                          {imp.name} ({formatGp(imp.cost)})
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {ship.config.weaponBays.length > 0 && (
          <>
            <h3 className="font-display text-text-primary text-sm tracking-wider uppercase mb-3 mt-6">Weapons</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {ship.config.weaponBays.map((wb, i) => (
                <div key={i} className="bg-card border border-border-subtle rounded-lg p-4">
                  {wb.weapons.map((w, wi) => {
                    const weapon = WEAPON_TYPES.find(wt => wt.id === w.weaponId);
                    if (!weapon) return null;
                    return (
                      <div key={wi}>
                        <span className="font-display text-accent-red text-xs tracking-wider uppercase">
                          {weapon.name} {w.count > 1 ? `×${w.count}` : ''}
                        </span>
                        <p className="font-mono text-[0.6rem] text-text-muted mt-1">
                          +{weapon.attackBonus} to hit &middot; {weapon.damage} {weapon.damageType} &middot; {weapon.normalRange}/{weapon.longRange} ft.
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {deleteConfirm && <DeleteModal onCancel={() => setDeleteConfirm(null)} onConfirm={() => deleteShip(deleteConfirm)} />}
      </div>
    );
  }

  // ── Builder View ───────────────────────────────────────────────
  return (
    <div>
      <PageHeader icon="rocket_launch" title={editId ? 'Edit Ship' : 'Build Ship'} subtitle="Configure your spelljammer">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setView('list')}><Icon name="arrow_back" className="text-sm" /> Cancel</Button>
          <Button size="sm" onClick={saveShip} disabled={saving || !shipName.trim()}>
            <Icon name="save" className="text-sm" /> {saving ? 'Saving...' : 'Save Ship'}
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Ship Name */}
          <BuilderSection title="Ship Identity" icon="badge">
            <Input label="Ship Name" value={shipName} onChange={e => setShipName(e.target.value)} placeholder="Enter ship name..." />
          </BuilderSection>

          {/* Hull Type */}
          <BuilderSection title="Hull Armor" icon="shield">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {HULL_TYPES.map(hull => (
                <button key={hull.id} onClick={() => updateConfig(c => ({ ...c, hullType: hull.id }))}
                  className={`p-3 rounded-lg border text-center transition-all ${config.hullType === hull.id
                    ? 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                    : 'border-border-subtle bg-card text-text-secondary hover:border-border-glow'}`}>
                  <div className="font-display text-xs tracking-wider uppercase">{hull.name}</div>
                  <div className="font-mono text-[0.6rem] mt-1">AC {hull.ac}</div>
                  <div className="font-mono text-[0.55rem] text-text-muted">{hull.cost === 0 ? 'Free' : formatGp(hull.cost)}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {HULL_IMPROVEMENTS.map(imp => (
                <ImprovementCheckbox key={imp.id} label={imp.name} cost={imp.cost} description={imp.description}
                  checked={config.hullImprovements.includes(imp.id)} onChange={() => toggleHullImprovement(imp.id)} />
              ))}
            </div>
          </BuilderSection>

          {/* Sails */}
          <BuilderSection title="Psychic Sails" icon="sailing">
            <div className="grid grid-cols-5 gap-2">
              {SAIL_OPTIONS.map(opt => (
                <button key={opt.count} onClick={() => updateConfig(c => ({ ...c, sailsCount: opt.count }))}
                  className={`p-3 rounded-lg border text-center transition-all ${config.sailsCount === opt.count
                    ? 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                    : 'border-border-subtle bg-card text-text-secondary hover:border-border-glow'}`}>
                  <div className="font-display text-xs tracking-wider">{opt.count === 0 ? 'None' : `${opt.count} Sail${opt.count > 1 ? 's' : ''}`}</div>
                  <div className="font-mono text-[0.6rem] mt-1">{opt.flyingSpeed}</div>
                  <div className="font-mono text-[0.55rem] text-text-muted">{opt.cost === 0 ? 'Free' : formatGp(opt.cost)}</div>
                </button>
              ))}
            </div>
            {config.sailsCount > 0 && (
              <div className="mt-3 space-y-2">
                {SAIL_IMPROVEMENTS.map(imp => (
                  <ImprovementCheckbox key={imp.id} label={imp.name} cost={imp.cost} description={imp.description}
                    checked={config.sailImprovements.includes(imp.id)} onChange={() => toggleSailImprovement(imp.id)} />
                ))}
              </div>
            )}
          </BuilderSection>

          {/* Modules */}
          <BuilderSection title="Modules" icon="widgets">
            {config.modules.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider">Installed</h4>
                {config.modules.map((mc, idx) => {
                  const mod = getModuleById(mc.moduleId);
                  if (!mod) return null;
                  const key = `${mc.moduleId}-${idx}`;
                  const isExpanded = expandedModule === key;
                  const wbStartIdx = config.modules.slice(0, idx).filter(m => m.moduleId === 'weapon-bay').reduce((sum, m) => sum + m.quantity, 0);

                  return (
                    <div key={key} className="bg-card border border-border-subtle rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent-gold/5 transition-colors"
                        onClick={() => setExpandedModule(isExpanded ? null : key)}>
                        <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} className="text-sm text-text-muted" />
                        <div className="flex-1">
                          <span className="font-display text-accent-gold text-xs tracking-wider uppercase">{mod.name}</span>
                          {mc.quantity > 1 && <span className="font-mono text-[0.6rem] text-text-muted ml-2">×{mc.quantity}</span>}
                          <span className="font-mono text-[0.6rem] text-text-muted ml-2">({formatGp(mod.cost * mc.quantity)})</span>
                        </div>
                        {mc.improvements.length > 0 && (
                          <span className="font-mono text-[0.55rem] text-accent-purple">{mc.improvements.length} upgrade{mc.improvements.length > 1 ? 's' : ''}</span>
                        )}
                        <div className="flex items-center gap-1">
                          {mc.moduleId !== 'spelljamming-helm' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); removeModule(mc.moduleId); }}
                                className="text-text-muted hover:text-accent-red p-1" title="Remove one">
                                <Icon name="remove" className="text-sm" />
                              </button>
                              {(!mod.maxQuantity || mc.quantity < mod.maxQuantity) && (
                                <button onClick={e => { e.stopPropagation(); addModule(mc.moduleId); }}
                                  className="text-text-muted hover:text-accent-green p-1" title="Add one more">
                                  <Icon name="add" className="text-sm" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-border-subtle/50 pt-2">
                          <p className="text-text-secondary text-[0.65rem] mb-2">{mod.description}</p>
                          <p className="text-text-muted text-[0.6rem] mb-1"><strong className="text-text-secondary">Function:</strong> {mod.functionName}</p>
                          <p className="text-text-muted text-[0.6rem] mb-3">{mod.functionDescription}</p>
                          {mod.prerequisite && <p className="text-accent-purple text-[0.6rem] mb-3"><em>Prerequisite: {mod.prerequisite}</em></p>}

                          {mc.moduleId === 'weapon-bay' && (
                            <div className="mb-3 space-y-2">
                              {Array.from({ length: mc.quantity }, (_, offset) => {
                                const bayIdx = wbStartIdx + offset;
                                const wb = config.weaponBays[bayIdx];
                                if (!wb) return null;
                                return (
                                  <div key={bayIdx} className="p-2 bg-deep rounded-lg">
                                    <h5 className="font-mono text-[0.6rem] text-text-muted uppercase mb-2">
                                      {mc.quantity > 1 ? `Weapon Bay ${offset + 1}` : 'Weapon Selection'}
                                    </h5>
                                    <div className="flex gap-2 items-center">
                                      <select value={wb.weapons[0]?.weaponId ?? 'ballista'}
                                        onChange={e => updateWeaponBay(bayIdx, e.target.value, wb.weapons[0]?.count ?? 1)}
                                        className="bg-deep border border-border-subtle rounded px-2 py-1 text-text-primary font-body text-xs">
                                        {WEAPON_TYPES.map(w => (
                                          <option key={w.id} value={w.id}>{w.name} ({formatGp(w.cost)})</option>
                                        ))}
                                      </select>
                                      <span className="text-text-muted text-xs">×</span>
                                      <select value={wb.weapons[0]?.count ?? 1}
                                        onChange={e => updateWeaponBay(bayIdx, wb.weapons[0]?.weaponId ?? 'ballista', parseInt(e.target.value))}
                                        className="bg-deep border border-border-subtle rounded px-2 py-1 text-text-primary font-body text-xs">
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                      </select>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      {WEAPON_BAY_IMPROVEMENTS.map(imp => (
                                        <ImprovementCheckbox key={imp.id} label={imp.name} cost={imp.cost} description=""
                                          checked={wb.improvements.includes(imp.id)} onChange={() => toggleWeaponBayImprovement(bayIdx, imp.id)} small />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {mod.improvements.length > 0 && (
                            <div>
                              <h5 className="font-mono text-[0.6rem] text-text-muted uppercase mb-2">Improvements</h5>
                              <div className="space-y-1">
                                {mod.improvements.map(imp => (
                                  <ImprovementCheckbox key={imp.id} label={imp.name} cost={imp.cost} description={imp.description}
                                    checked={mc.improvements.includes(imp.id)} onChange={() => toggleModuleImprovement(mc.moduleId, imp.id)} small />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <h4 className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-2">Add Modules</h4>
            {CATEGORY_ORDER.map(cat => {
              const catModules = MODULES.filter(m =>
                m.category === cat && !HIDDEN_MODULE_IDS.includes(m.id) &&
                (!m.maxQuantity || !(config.modules.find(cm => cm.moduleId === m.id && cm.quantity >= m.maxQuantity!)))
              );
              if (catModules.length === 0) return null;
              return (
                <div key={cat} className="mb-3">
                  <h5 className="font-mono text-[0.55rem] text-text-muted uppercase tracking-widest mb-1">{CATEGORY_LABELS[cat]}</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {catModules.map(mod => (
                      <button key={mod.id} onClick={() => addModule(mod.id)} title={mod.description}
                        className={`px-3 py-1.5 rounded-lg border text-left transition-all text-[0.65rem] ${
                          installedModuleIds.includes(mod.id)
                            ? 'border-accent-gold/20 bg-accent-gold/5 text-accent-gold'
                            : 'border-border-subtle bg-card text-text-secondary hover:border-accent-gold/30 hover:text-accent-gold'}`}>
                        <span className="font-display tracking-wider uppercase">{mod.name}</span>
                        {mod.cost > 0 && <span className="font-mono text-text-muted ml-1.5">{formatGp(mod.cost)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </BuilderSection>
        </div>

        {/* Stats Sidebar */}
        <div className="lg:w-72 lg:sticky lg:top-4 lg:self-start">
          <div className="bg-card border border-border-subtle rounded-xl p-5 space-y-3">
            <h3 className="font-display text-accent-gold text-xs tracking-[0.15em] uppercase border-b border-border-subtle pb-2">Ship Statistics</h3>
            <StatRow label="Armor Class" value={`${stats.ac} (${HULL_TYPES.find(h => h.id === config.hullType)?.material ?? 'wood'})`} />
            <StatRow label="Hit Points" value={stats.hp} />
            <StatRow label="Damage Threshold" value={stats.damageThreshold} />
            <StatRow label="Flying Speed" value={stats.flyingSpeed} />
            {stats.walkingSpeed && <StatRow label="Walking Speed" value={stats.walkingSpeed} />}
            {stats.swimmingSpeed && <StatRow label="Swimming Speed" value={stats.swimmingSpeed} />}
            <StatRow label="Cargo" value={`${stats.cargo} ton${stats.cargo !== 1 ? 's' : ''}`} />
            <StatRow label="Crew" value={stats.crew} />
            <StatRow label="Total Modules" value={stats.totalModules} />
            <div className="border-t border-border-subtle pt-2">
              <StatRow label="Total Cost" value={formatGp(stats.cost)} highlight />
            </div>
          </div>
        </div>
      </div>

      {upgradeConfirm && (
        <UpgradeConfirmModal
          estimate={upgradeConfirm}
          onCancel={() => setUpgradeConfirm(null)}
          onConfirm={doSave}
          saving={saving}
        />
      )}
    </div>
  );
}

// ── Shared small components ─────────────────────────────────────

function BuilderSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-card/50 border border-border-subtle rounded-xl p-5">
      <h3 className="font-display text-text-primary text-xs tracking-[0.12em] uppercase flex items-center gap-2 mb-4">
        <Icon name={icon} className="text-base text-accent-gold" /> {title}
      </h3>
      {children}
    </section>
  );
}

function ImprovementCheckbox({ label, cost, description, checked, onChange, small }: {
  label: string; cost: number; description: string; checked: boolean; onChange: () => void; small?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 accent-accent-gold" />
      <div>
        <span className={`font-display tracking-wider text-text-primary group-hover:text-accent-gold ${small ? 'text-[0.6rem]' : 'text-xs'}`}>{label}</span>
        <span className={`font-mono text-text-muted ml-1 ${small ? 'text-[0.55rem]' : 'text-[0.6rem]'}`}>({formatGp(cost)})</span>
        {description && <p className={`text-text-muted ${small ? 'text-[0.55rem]' : 'text-[0.65rem]'} mt-0.5`}>{description}</p>}
      </div>
    </label>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[0.6rem] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-xs ${highlight ? 'text-accent-gold font-bold' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] text-text-muted uppercase">{label}</div>
      <div className="font-mono text-xs text-text-primary">{value}</div>
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="font-mono text-[0.6rem] text-text-muted uppercase tracking-wider">{label}</div>
      <div className="font-display text-accent-gold text-sm mt-1">{value}</div>
      {sub && <div className="font-mono text-[0.55rem] text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function UpgradeConfirmModal({ estimate, onCancel, onConfirm, saving }: {
  estimate: UpgradeEstimate; onCancel: () => void; onConfirm: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-deep border border-border-subtle rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <Icon name="schedule" className="text-accent-gold text-xl" />
          <h2 className="font-display text-accent-gold text-sm tracking-wider uppercase">Shipyard Work Required</h2>
        </div>
        <p className="font-body text-text-secondary text-sm mb-4">
          These upgrades will require <span className="text-accent-gold font-bold">{estimate.days} day{estimate.days !== 1 ? 's' : ''}</span> of shipyard work to complete.
        </p>
        <ul className="space-y-1 mb-5">
          {estimate.lines.map((line, i) => (
            <li key={i} className="flex items-center gap-2 font-mono text-[0.65rem] text-text-muted">
              <span className="text-accent-gold/50">—</span> {line}
            </li>
          ))}
        </ul>
        <p className="font-body text-text-muted text-xs mb-5">Proceed with these changes?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={onConfirm} disabled={saving}>
            <Icon name="build" className="text-sm" /> {saving ? 'Saving...' : 'Confirm Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-deep border border-border-subtle rounded-2xl p-6 max-w-sm">
        <p className="text-text-primary text-sm mb-4">Delete this ship? This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}
