// ===== Campaign Types =====
export interface Campaign {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  owner_id: string | null;
  settings: CampaignSettings;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignSettings {
  tagline?: string;
  favicon_url?: string;
  calendar?: CalendarConfig;
  widgets?: WidgetConfig[];
}

export interface CalendarConfig {
  months: { name: string; season: string }[];
  daysPerMonth: number;
  weekdays: string[];
}

export interface StatTrackerWidgetConfig {
  id: string;
  type: 'stat-tracker';
  name: string;
  fields: { label: string; value: string }[];
}

export interface SpelljammerWeapon {
  id: string;
  name: string;
  hitModifier: number;   // e.g. 5 means +5
  damage: string;        // e.g. "3d10" or "2d6+4"
}

export interface SpelljammerWidgetConfig {
  id: string;
  type: 'spelljammer';
  name: string;
  currentHp: number;
  maxHp: number;
  ac: number;
  speed: number;
  damageThreshold: number;
  description?: string;
  weapons: SpelljammerWeapon[];
}

export type WidgetConfig = StatTrackerWidgetConfig | SpelljammerWidgetConfig;

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: 'dm' | 'player';
  display_name?: string; // joined from auth metadata
  email?: string;        // joined from auth metadata
  created_at?: string;
}

export interface CampaignMap {
  id: string;
  campaign_id: string;
  slug: string;
  name: string;
  image_url: string;
  description: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// ===== Calendar Types =====
export interface CalendarEvent {
  id: string;
  campaign_id: string;
  year: number;
  month: number;
  day: number;
  title: string;
  type: EventType;
  session: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export type EventType = 'combat' | 'travel' | 'social' | 'quest' | 'loot' | 'faction' | 'festival' | 'downtime';

export const EVENT_TYPES: EventType[] = ['combat', 'travel', 'social', 'quest', 'loot', 'faction', 'festival', 'downtime'];

// ===== NPC Types =====
export type NpcStatus = 'Alive' | 'Deceased' | 'Unknown';

export interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  role: string;
  faction?: string;
  location?: string;
  description: string;
  tags: string[];
  status: NpcStatus;
  dm_only?: boolean;
  dm_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Location Types =====
export interface GameLocation {
  id: string;
  campaign_id: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  dm_only?: boolean;
  dm_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Faction Types =====
export interface Faction {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  description: string;
  tags: string[];
  logo_url?: string;
  dm_only?: boolean;
  dm_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Loot Types =====
export type LootStatus = 'Carried' | 'Known' | 'Sold' | 'Lost';

export const LOOT_STATUSES: LootStatus[] = ['Carried', 'Known', 'Sold', 'Lost'];

export interface LootItem {
  id: string;
  campaign_id: string;
  name: string;
  details: string;
  source: string;
  holder?: string;
  status: LootStatus;
  price?: string;
  sold_by_faction?: string;
  dnd_beyond_url?: string;
  dm_only?: boolean;
  dm_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Session Types =====
export interface Session {
  id: string;
  campaign_id: string;
  number: number;
  title: string;
  real_date: string;
  ingame_date: string;
  summary: string;
  doc_url?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Thread Types =====
export interface Thread {
  id: string;
  campaign_id: string;
  title: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  tags: string[];
  description: string;
  dm_only?: boolean;
  dm_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type ThreadStatus = 'urgent' | 'active' | 'dormant' | 'resolved';
export type ThreadPriority = 'urgent' | 'active' | 'cosmic' | 'personal' | 'mystery';

// ===== Map Marker Types =====
export interface MapMarker {
  id: string;
  campaign_id: string;
  x: number;
  y: number;
  label: string;
  note: string;
  location_id?: string | null;
  map_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Personal Note Types =====
export interface PersonalNote {
  id: string;
  campaign_id: string;
  user_id: string;
  title: string;
  content: string;
  shared_with_all: boolean;
  shared_with: string[];   // user IDs of individual share recipients
  is_owner: boolean;
  owner_name?: string;     // display name of the sharer — set when is_owner=false
  created_at?: string;
  updated_at?: string;
  updated_by?: string;       // user_id of last editor
  updated_by_name?: string;  // resolved display name
}

export interface NoteUser {
  id: string;
  display_name: string;
}

// ===== Initiative Tracker Types =====
export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  type: 'player' | 'monster';
  hp?: number;
  maxHp?: number;
  ac?: number;
  notes?: string;
}

export interface InitiativeState {
  id: string;
  campaign_id: string;
  entries: InitiativeEntry[];
  round: number;
  active_index: number;
  visible_to_players: boolean;
}

// ===== Calendar helpers =====
// Default calendar (standard 12-month)
export const DEFAULT_CALENDAR: CalendarConfig = {
  months: [
    { name: 'January', season: 'winter' },
    { name: 'February', season: 'winter' },
    { name: 'March', season: 'spring' },
    { name: 'April', season: 'spring' },
    { name: 'May', season: 'spring' },
    { name: 'June', season: 'summer' },
    { name: 'July', season: 'summer' },
    { name: 'August', season: 'summer' },
    { name: 'September', season: 'fall' },
    { name: 'October', season: 'fall' },
    { name: 'November', season: 'fall' },
    { name: 'December', season: 'winter' },
  ],
  daysPerMonth: 30,
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export function getCalendarConfig(campaign: Campaign): CalendarConfig {
  return campaign.settings?.calendar ?? DEFAULT_CALENDAR;
}

// Legacy aliases for backward-compat (used by calendar page)
export const MONTHS = DEFAULT_CALENDAR.months;
export const WEEKDAYS = DEFAULT_CALENDAR.weekdays;

// ===== Ship Types =====
export interface Ship {
  id: string;
  campaign_id: string;
  name: string;
  config: import('./shipyard/types').ShipConfig;
  created_at?: string;
  updated_at?: string;
}
