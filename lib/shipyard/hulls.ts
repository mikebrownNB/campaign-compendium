import type { HullType, HullImprovement } from './types';

export const HULL_TYPES: HullType[] = [
  { id: 'wood', name: 'Wood', material: 'wood', cost: 0, ac: 15 },
  { id: 'stone', name: 'Stone', material: 'stone', cost: 1000, ac: 17 },
  { id: 'copper', name: 'Copper', material: 'copper', cost: 2000, ac: 18 },
  { id: 'iron', name: 'Iron or Steel', material: 'iron', cost: 4000, ac: 19 },
  { id: 'mithril', name: 'Mithril', material: 'mithril', cost: 10000, ac: 20 },
];

export const HULL_IMPROVEMENTS: HullImprovement[] = [
  {
    id: 'self-mending',
    name: 'Self-Mending',
    cost: 3500,
    description: 'At the end of each day where the ship is below half its hit point maximum, the ship regains 1 hit point. Cannot repair at 0 HP.',
  },
  {
    id: 'adamantine-struts',
    name: 'Adamantine Struts',
    cost: 8000,
    description: 'Critical hits against the ship become normal hits.',
  },
];
