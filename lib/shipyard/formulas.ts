import type { ShipConfig, ComputedStats } from './types';
import { HULL_TYPES, HULL_IMPROVEMENTS } from './hulls';
import { SAIL_OPTIONS, SAIL_IMPROVEMENTS } from './sails';
import { getModuleById } from './modules';
import { WEAPON_TYPES, WEAPON_BAY_IMPROVEMENTS } from './weapons';

// Re-export for convenience
export { HULL_TYPES, SAIL_OPTIONS };

export function computeShipStats(config: ShipConfig): ComputedStats {
  const hull = HULL_TYPES.find(h => h.id === config.hullType) ?? HULL_TYPES[0];
  const ac = hull.ac;

  const totalModules = config.modules.reduce((sum, m) => sum + m.quantity, 0);
  const hp = Math.min(totalModules * 50, 500);
  const hasWardGenerator = config.modules.some(m => m.moduleId === 'ward-generator' && m.quantity > 0);
  const damageThreshold = hasWardGenerator ? 20 : 15;

  const sailOption = SAIL_OPTIONS.find(s => s.count === config.sailsCount) ?? SAIL_OPTIONS[0];
  const flyingSpeed = sailOption.flyingSpeed;

  const landingLegsModule = config.modules.find(m => m.moduleId === 'landing-legs');
  const hasWalkingLegs = landingLegsModule?.improvements.includes('walking-legs');
  const walkingSpeed = hasWalkingLegs ? '30 ft.' : undefined;

  const hasAquaticAdaptation = config.sailImprovements?.includes('aquatic-adaptation');
  const swimmingSpeed = hasAquaticAdaptation ? sailOption.flyingSpeed : undefined;

  const cargoHoldCount = config.modules
    .filter(m => m.moduleId === 'cargo-hold')
    .reduce((sum, m) => sum + m.quantity, 0);
  const cargo = Math.max(1, Math.floor(totalModules / 5)) + (cargoHoldCount * 5);

  const crew = Math.max(1, totalModules);

  let cost = 0;
  cost += hull.cost;

  for (const impId of (config.hullImprovements || [])) {
    const imp = HULL_IMPROVEMENTS.find(i => i.id === impId);
    if (imp) cost += imp.cost;
  }

  cost += sailOption.cost;

  for (const impId of (config.sailImprovements || [])) {
    const imp = SAIL_IMPROVEMENTS.find(i => i.id === impId);
    if (imp) cost += imp.cost;
  }

  let weaponBayIndex = 0;
  for (const mc of config.modules) {
    const moduleDef = getModuleById(mc.moduleId);
    if (!moduleDef) continue;

    if (mc.moduleId === 'weapon-bay') {
      for (let q = 0; q < mc.quantity; q++) {
        let bayCost = 500;
        const wb = config.weaponBays[weaponBayIndex];
        if (wb) {
          for (const w of wb.weapons) {
            const weaponDef = WEAPON_TYPES.find(wt => wt.id === w.weaponId);
            if (weaponDef) bayCost += weaponDef.cost * w.count;
          }
          for (const impId of wb.improvements) {
            const imp = WEAPON_BAY_IMPROVEMENTS.find(i => i.id === impId);
            if (imp) cost += imp.cost;
          }
        }
        cost += bayCost;
        weaponBayIndex++;
      }
    } else {
      cost += moduleDef.cost * mc.quantity;
    }

    for (const impId of mc.improvements) {
      const imp = moduleDef.improvements.find(i => i.id === impId);
      if (imp) cost += imp.cost * mc.quantity;
    }
  }

  return { ac, hp, damageThreshold, flyingSpeed, walkingSpeed, swimmingSpeed, cargo, crew, cost, totalModules };
}

export function formatGp(amount: number): string {
  return amount.toLocaleString() + ' gp';
}

export interface UpgradeEstimate {
  days: number;
  gold: number;
  lines: string[];
}

export function calculateUpgradeTime(oldConfig: ShipConfig, newConfig: ShipConfig): UpgradeEstimate {
  const lines: string[] = [];
  let days = 0;
  let gold = 0;
  const engineers = Math.max(1, newConfig.engineers ?? 1);
  const daysPerModule = Math.round((10 / engineers) * 2) / 2; // rounds to nearest 0.5

  // Hull change
  if (oldConfig.hullType !== newConfig.hullType) {
    const oldHull = HULL_TYPES.find(h => h.id === oldConfig.hullType);
    const newHull = HULL_TYPES.find(h => h.id === newConfig.hullType);
    const gp = Math.max(0, (newHull?.cost ?? 0) - (oldHull?.cost ?? 0));
    days += 7;
    gold += gp;
    lines.push(`Hull replacement: 7 days${gp > 0 ? `, ${formatGp(gp)}` : ''}`);
  }

  // Hull improvements added
  const addedHullImps = newConfig.hullImprovements.filter(i => !oldConfig.hullImprovements.includes(i));
  if (addedHullImps.length > 0) {
    const d = addedHullImps.length * 2;
    const gp = addedHullImps.reduce((sum, id) => sum + (HULL_IMPROVEMENTS.find(h => h.id === id)?.cost ?? 0), 0);
    days += d; gold += gp;
    lines.push(`${addedHullImps.length} hull improvement${addedHullImps.length > 1 ? 's' : ''}: ${d} days, ${formatGp(gp)}`);
  }

  // Sails added
  const sailDiff = newConfig.sailsCount - oldConfig.sailsCount;
  if (sailDiff > 0) {
    const oldSail = SAIL_OPTIONS.find(s => s.count === oldConfig.sailsCount);
    const newSail = SAIL_OPTIONS.find(s => s.count === newConfig.sailsCount);
    const d = sailDiff * 3;
    const gp = Math.max(0, (newSail?.cost ?? 0) - (oldSail?.cost ?? 0));
    days += d; gold += gp;
    lines.push(`+${sailDiff} sail${sailDiff > 1 ? 's' : ''}: ${d} days, ${formatGp(gp)}`);
  }

  // Sail improvements added
  const addedSailImps = newConfig.sailImprovements.filter(i => !oldConfig.sailImprovements.includes(i));
  if (addedSailImps.length > 0) {
    const d = addedSailImps.length * 2;
    const gp = addedSailImps.reduce((sum, id) => sum + (SAIL_IMPROVEMENTS.find(s => s.id === id)?.cost ?? 0), 0);
    days += d; gold += gp;
    lines.push(`${addedSailImps.length} sail improvement${addedSailImps.length > 1 ? 's' : ''}: ${d} days, ${formatGp(gp)}`);
  }

  // Modules added / improvements added
  for (const newMod of newConfig.modules) {
    const modDef = getModuleById(newMod.moduleId);
    const oldMod = oldConfig.modules.find(m => m.moduleId === newMod.moduleId);
    const added = oldMod ? Math.max(0, newMod.quantity - oldMod.quantity) : newMod.quantity;
    if (added > 0) {
      const d = added * daysPerModule;
      const gp = added * (modDef?.cost ?? 0);
      days += d; gold += gp;
      const label = modDef?.name ?? newMod.moduleId.replace(/-/g, ' ');
      lines.push(`+${added} ${label}: ${d} day${d !== 1 ? 's' : ''}, ${formatGp(gp)} (${engineers} engineer${engineers !== 1 ? 's' : ''})`);
    }
    const oldImps = oldMod?.improvements ?? [];
    const addedImps = newMod.improvements.filter(i => !oldImps.includes(i));
    if (addedImps.length > 0) {
      const d = addedImps.length * 2;
      const gp = addedImps.reduce((sum, id) => sum + (modDef?.improvements.find(i => i.id === id)?.cost ?? 0), 0);
      days += d; gold += gp;
      const label = modDef?.name ?? newMod.moduleId.replace(/-/g, ' ');
      lines.push(`${addedImps.length} ${label} upgrade${addedImps.length > 1 ? 's' : ''}: ${d} days, ${formatGp(gp)}`);
    }
  }

  return { days, gold, lines };
}
