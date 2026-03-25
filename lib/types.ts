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

export interface WidgetConfig {
  id: string;
  type: 'stat-tracker';
  name: string;
  fields: { label: string; value: string }[];
}

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
}

export interface NoteUser {
  id: string;
  display_name: string;
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
