import type { BaseShip } from './types';

export const BASE_SHIPS: BaseShip[] = [
  {
    id: 'bumblebee',
    name: 'Bumblebee Ship',
    description: 'A popular all-purpose hadozee craft. Bulbous abdomen with ample cargo space. Can float on water and land safely via slender legs.',
    config: {
      hullType: 'wood',
      hullImprovements: [],
      sailsCount: 2,
      sailImprovements: [],
      modules: [
        { moduleId: 'spelljamming-helm', quantity: 1, improvements: [] },
        { moduleId: 'landing-legs', quantity: 1, improvements: [] },
        { moduleId: 'cargo-hold', quantity: 2, improvements: [] },
        { moduleId: 'weapon-bay', quantity: 2, improvements: [] },
      ],
      weaponBays: [
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
      ],
    },
    stats: { ac: 15, hp: 250, damageThreshold: 15, speed: 'fly 40 ft. (4\u00bd mph)', cargo: 11, crew: 8, cost: 20000, keelBeam: '70 ft. / 40 ft.' },
  },
  {
    id: 'starfish',
    name: 'Starfish Ship',
    description: 'Unusual craft with five limb-like protrusions around a central bubble. Cuts horizontally through space, rotating as it goes. Can land, sail, and dive underwater.',
    config: {
      hullType: 'iron',
      hullImprovements: [],
      sailsCount: 0,
      sailImprovements: ['aquatic-adaptation'],
      modules: [
        { moduleId: 'spelljamming-helm', quantity: 1, improvements: [] },
        { moduleId: 'landing-legs', quantity: 1, improvements: [] },
        { moduleId: 'cargo-hold', quantity: 3, improvements: [] },
        { moduleId: 'weapon-bay', quantity: 5, improvements: [] },
      ],
      weaponBays: [
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
      ],
    },
    stats: { ac: 19, hp: 300, damageThreshold: 15, speed: 'fly 25 ft. (3 mph), swim 25 ft. (3 mph)', cargo: 15, crew: 17, cost: 30000, keelBeam: '70 ft. / 70 ft.' },
  },
  {
    id: 'kindori-tomb',
    name: 'Kindori Tomb',
    description: 'A dead kindori whale repurposed by astral elves into a huge warship with starlight cannons where its eyes once were. Can float/sail on water and land safely.',
    config: {
      hullType: 'stone',
      hullImprovements: [],
      sailsCount: 2,
      sailImprovements: [],
      modules: [
        { moduleId: 'spelljamming-helm', quantity: 1, improvements: [] },
        { moduleId: 'landing-legs', quantity: 1, improvements: [] },
        { moduleId: 'cargo-hold', quantity: 4, improvements: [] },
        { moduleId: 'weapon-bay', quantity: 4, improvements: [] },
      ],
      weaponBays: [
        { weapons: [{ weaponId: 'starlight-cannon', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'starlight-cannon', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'starlight-cannon', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'starlight-cannon', count: 1 }], improvements: [] },
      ],
    },
    stats: { ac: 17, hp: 450, damageThreshold: 20, speed: 'fly 40 ft. (4\u00bd mph)', cargo: 22, crew: 18, cost: 50000, keelBeam: '90 ft. / 20 ft.' },
  },
  {
    id: 'seahorse',
    name: 'Seahorse Ship',
    description: 'Taller than wide, with vertical gravity plane. Crew lay on their backs. Purely for space travel. The tail is a flexible grasper.',
    config: {
      hullType: 'wood',
      hullImprovements: [],
      sailsCount: 1,
      sailImprovements: [],
      modules: [
        { moduleId: 'spelljamming-helm', quantity: 1, improvements: [] },
        { moduleId: 'grasper', quantity: 1, improvements: [] },
        { moduleId: 'cargo-hold', quantity: 2, improvements: [] },
        { moduleId: 'weapon-bay', quantity: 1, improvements: [] },
      ],
      weaponBays: [
        { weapons: [{ weaponId: 'mangonel', count: 1 }], improvements: [] },
      ],
    },
    stats: { ac: 15, hp: 200, damageThreshold: 15, speed: 'fly 35 ft. (4 mph)', cargo: 11, crew: 8, cost: 20000, keelBeam: '80 ft. / 20 ft.' },
  },
  {
    id: 'iron-urchin',
    name: 'Iron Urchin',
    description: 'Neogi command ship: a sphere covered in huge iron spikes. Ramming it impales the attacker. Ballistae and mangonels fire from tiny portholes.',
    config: {
      hullType: 'iron',
      hullImprovements: [],
      sailsCount: 1,
      sailImprovements: [],
      modules: [
        { moduleId: 'spelljamming-helm', quantity: 1, improvements: [] },
        { moduleId: 'ram', quantity: 1, improvements: [] },
        { moduleId: 'landing-legs', quantity: 1, improvements: [] },
        { moduleId: 'cargo-hold', quantity: 1, improvements: [] },
        { moduleId: 'weapon-bay', quantity: 5, improvements: [] },
      ],
      weaponBays: [
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'ballista', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'mangonel', count: 1 }], improvements: [] },
        { weapons: [{ weaponId: 'mangonel', count: 1 }], improvements: [] },
      ],
    },
    stats: { ac: 19, hp: 350, damageThreshold: 15, speed: 'fly 35 ft. (4 mph)', cargo: 8, crew: 21, cost: 35000, keelBeam: '80 ft. / 80 ft.' },
    specialWeapons: [
      { name: 'Iron Spikes', description: 'Gargantuan creatures grappling take 33 (6d10) piercing. Ships ramming also take 33 (6d10) piercing extra.' },
    ],
  },
];

export function getBaseShipById(id: string): BaseShip | undefined {
  return BASE_SHIPS.find(s => s.id === id);
}
