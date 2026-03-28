import type { SailOption, SailImprovement } from './types';

export const SAIL_OPTIONS: SailOption[] = [
  { count: 0, cost: 0, flyingSpeed: '30 ft.', flyingSpeedMph: '3\u00bd mph' },
  { count: 1, cost: 1000, flyingSpeed: '35 ft.', flyingSpeedMph: '4 mph' },
  { count: 2, cost: 2000, flyingSpeed: '40 ft.', flyingSpeedMph: '4\u00bd mph' },
  { count: 3, cost: 4000, flyingSpeed: '50 ft.', flyingSpeedMph: '5\u00bd mph' },
  { count: 4, cost: 8000, flyingSpeed: '70 ft.', flyingSpeedMph: '8 mph' },
];

export const SAIL_IMPROVEMENTS: SailImprovement[] = [
  {
    id: 'aquatic-adaptation',
    name: 'Aquatic Adaptation',
    cost: 1500,
    description: 'The sails grant a swimming speed equal to flying speed. The ship can seal off ports to prevent flooding.',
  },
];
