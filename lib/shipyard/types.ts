export interface ModuleImprovement {
  id: string;
  name: string;
  cost: number;
  description: string;
  repeatable?: boolean;
}

export interface ShipModule {
  id: string;
  name: string;
  cost: number;
  description: string;
  functionName: string;
  functionDescription: string;
  prerequisite?: string;
  improvements: ModuleImprovement[];
  maxQuantity?: number;
  category: 'core' | 'crew' | 'combat' | 'utility' | 'special';
}

export interface HullType {
  id: string;
  name: string;
  material: string;
  cost: number;
  ac: number;
}

export interface HullImprovement {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export interface SailOption {
  count: number;
  cost: number;
  flyingSpeed: string;
  flyingSpeedMph: string;
}

export interface SailImprovement {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export interface WeaponType {
  id: string;
  name: string;
  cost: number;
  ac: number;
  hp: number;
  crew: number;
  actionsToLoad: number;
  actionsToAim: number;
  actionsToFire: number;
  attackName: string;
  attackBonus: number;
  normalRange: number;
  longRange: number;
  damage: string;
  damageType: string;
}

export interface WeaponBayImprovement {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export interface ShipModuleConfig {
  moduleId: string;
  quantity: number;
  improvements: string[];
}

export interface WeaponBayConfig {
  weapons: { weaponId: string; count: number }[];
  improvements: string[];
}

export interface ShipConfig {
  hullType: string;
  hullImprovements: string[];
  sailsCount: number;
  sailImprovements: string[];
  modules: ShipModuleConfig[];
  weaponBays: WeaponBayConfig[];
  baseShipId?: string;
}

export interface ComputedStats {
  ac: number;
  hp: number;
  damageThreshold: number;
  flyingSpeed: string;
  walkingSpeed?: string;
  swimmingSpeed?: string;
  cargo: number;
  crew: number;
  cost: number;
  totalModules: number;
}

export interface BaseShip {
  id: string;
  name: string;
  description: string;
  config: ShipConfig;
  stats: {
    ac: number;
    hp: number;
    damageThreshold: number;
    speed: string;
    cargo: number;
    crew: number;
    cost: number;
    keelBeam: string;
  };
  specialWeapons?: {
    name: string;
    description: string;
  }[];
}
