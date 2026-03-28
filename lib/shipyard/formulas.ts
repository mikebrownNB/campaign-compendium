import type { ShipConfig, ComputedStats } from './types';
import { HULL_TYPES, HULL_IMPROVEMENTS } from './hulls';
import { SAIL_OPTIONS, SAIL_IMPROVEMENTS } from './sails';
import { getModuleById } from './modules';
import { WEAPON_TYPES, WEAPON_BAY_IMPROVEMENTS } from './weapons';

export function computeShipStats(config: ShipConfig): ComputedStats {
  const hull = HULL_TYPES.find(h => h.id === config.hullType) ?? HULL_TYPES[0];
  const ac = hull.ac;

  const totalModules = config.modules.reduce((sum, m) => sum + m.quantity, 0);
  const hp = Math.min(totalModules * 50, 500);
  const damageThreshold = 15;

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
