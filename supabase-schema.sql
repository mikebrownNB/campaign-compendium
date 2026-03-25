-- ============================================
-- Campaign Compendium — Multi-Campaign Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ===== Updated_at trigger function =====
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===== Campaigns =====
create table if not exists campaigns (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  subtitle    text not null default '',
  description text not null default '',
  owner_id    uuid not null references auth.users(id),
  settings    jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Campaign Members =====
create table if not exists campaign_members (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'player' check (role in ('dm', 'player')),
  created_at  timestamptz default now(),
  unique(campaign_id, user_id)
);

-- ===== Campaign Maps =====
create table if not exists campaign_maps (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug        text not null,
  name        text not null,
  image_url   text not null,
  description text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(campaign_id, slug)
);

-- ===== Settings (key-value per campaign) =====
create table if not exists settings (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  key         text not null,
  value       jsonb not null default '{}',
  updated_at  timestamptz default now(),
  primary key (campaign_id, key)
);

-- ===== Calendar Events =====
create table if not exists calendar_events (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  year        integer not null default 1,
  month       integer not null,
  day         integer not null,
  title       text not null,
  type        text not null check (type in ('combat','travel','social','quest','loot','faction','festival','downtime')),
  session     text not null default '',
  description text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== NPCs =====
create table if not exists npcs (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name        text not null,
  role        text not null default '',
  faction     text,
  location    text,
  description text not null default '',
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Locations =====
create table if not exists locations (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name        text not null,
  category    text not null default '',
  tags        text[] default '{}',
  description text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Factions =====
create table if not exists factions (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name        text not null,
  status      text not null default 'Unknown',
  description text not null default '',
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Loot Items =====
create table if not exists loot_items (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name        text not null,
  details     text not null default '',
  source      text not null default '',
  holder      text,
  status      text not null default 'Carried',
  price       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Sessions =====
create table if not exists sessions (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  number      integer not null,
  title       text not null,
  real_date   text not null default '',
  ingame_date text not null default '',
  summary     text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Threads =====
create table if not exists threads (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  title       text not null,
  status      text not null default 'active' check (status in ('urgent','active','dormant','resolved')),
  priority    text not null default 'active' check (priority in ('urgent','active','cosmic','personal','mystery')),
  tags        text[] default '{}',
  description text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Map Markers =====
create table if not exists map_markers (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  x           numeric not null,
  y           numeric not null,
  label       text not null default '',
  note        text not null default '',
  location_id uuid references locations(id) on delete set null,
  map_id      text,
  created_by  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Personal Notes =====
create table if not exists personal_notes (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== Apply updated_at trigger to all tables =====
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'campaigns','campaign_maps','settings',
    'calendar_events','npcs','locations','factions',
    'loot_items','sessions','threads','map_markers','personal_notes'
  ])
  loop
    execute format('
      drop trigger if exists set_updated_at on %I;
      create trigger set_updated_at before update on %I
      for each row execute function update_updated_at();
    ', t, t);
  end loop;
end;
$$;

-- ===== Row Level Security =====
alter table campaigns       enable row level security;
alter table campaign_members enable row level security;
alter table campaign_maps   enable row level security;
alter table settings        enable row level security;
alter table calendar_events enable row level security;
alter table npcs            enable row level security;
alter table locations       enable row level security;
alter table factions        enable row level security;
alter table loot_items      enable row level security;
alter table sessions        enable row level security;
alter table threads         enable row level security;
alter table map_markers     enable row level security;
alter table personal_notes  enable row level security;

-- ===== Campaign RLS policies =====

-- Anyone authenticated can create a campaign
create policy "Authenticated users can create campaigns"
  on campaigns for insert
  with check (auth.uid() = owner_id);

-- Members can view their campaigns
create policy "Members can view campaign"
  on campaigns for select
  using (id in (select campaign_id from campaign_members where user_id = auth.uid()));

-- DMs can update their campaigns
create policy "DMs can update campaign"
  on campaigns for update
  using (id in (select campaign_id from campaign_members where user_id = auth.uid() and role = 'dm'));

-- Owners can delete their campaigns
create policy "Owners can delete campaign"
  on campaigns for delete
  using (owner_id = auth.uid());

-- ===== Campaign Members RLS =====

-- Members can view fellow members
create policy "Members can view membership"
  on campaign_members for select
  using (campaign_id in (select cm.campaign_id from campaign_members cm where cm.user_id = auth.uid()));

-- DMs can insert members
create policy "DMs can add members"
  on campaign_members for insert
  with check (campaign_id in (select cm.campaign_id from campaign_members cm where cm.user_id = auth.uid() and cm.role = 'dm'));

-- DMs can update member roles
create policy "DMs can update members"
  on campaign_members for update
  using (campaign_id in (select cm.campaign_id from campaign_members cm where cm.user_id = auth.uid() and cm.role = 'dm'));

-- DMs can remove members
create policy "DMs can remove members"
  on campaign_members for delete
  using (campaign_id in (select cm.campaign_id from campaign_members cm where cm.user_id = auth.uid() and cm.role = 'dm'));

-- Allow self-insert (for campaign creation flow)
create policy "User can join as member"
  on campaign_members for insert
  with check (user_id = auth.uid());

-- ===== Campaign Maps RLS =====

create policy "Members can view maps"
  on campaign_maps for select
  using (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));

create policy "DMs can manage maps"
  on campaign_maps for insert
  with check (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid() and role = 'dm'));

create policy "DMs can update maps"
  on campaign_maps for update
  using (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid() and role = 'dm'));

create policy "DMs can delete maps"
  on campaign_maps for delete
  using (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid() and role = 'dm'));

-- ===== Entity table RLS (campaign-membership-scoped) =====
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'settings','calendar_events','npcs','locations','factions',
    'loot_items','sessions','threads','map_markers'
  ])
  loop
    execute format('
      create policy "Campaign members can read" on %I for select
      using (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));
    ', t);
    execute format('
      create policy "Campaign members can insert" on %I for insert
      with check (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));
    ', t);
    execute format('
      create policy "Campaign members can update" on %I for update
      using (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));
    ', t);
    execute format('
      create policy "Campaign members can delete" on %I for delete
      using (campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));
    ', t);
  end loop;
end;
$$;

-- ===== Personal Notes RLS (user-scoped within campaign) =====
create policy "User can read own notes"
  on personal_notes for select
  using (user_id = auth.uid() and campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));

create policy "User can create own notes"
  on personal_notes for insert
  with check (user_id = auth.uid() and campaign_id in (select campaign_id from campaign_members where user_id = auth.uid()));

create policy "User can update own notes"
  on personal_notes for update
  using (user_id = auth.uid());

create policy "User can delete own notes"
  on personal_notes for delete
  using (user_id = auth.uid());

-- ===== Indexes =====
create index if not exists idx_campaign_members_campaign on campaign_members(campaign_id);
create index if not exists idx_campaign_members_user     on campaign_members(user_id);
create index if not exists idx_campaign_maps_campaign    on campaign_maps(campaign_id);
create index if not exists idx_npcs_campaign             on npcs(campaign_id);
create index if not exists idx_locations_campaign        on locations(campaign_id);
create index if not exists idx_factions_campaign         on factions(campaign_id);
create index if not exists idx_loot_items_campaign       on loot_items(campaign_id);
create index if not exists idx_sessions_campaign         on sessions(campaign_id);
create index if not exists idx_threads_campaign          on threads(campaign_id);
create index if not exists idx_calendar_events_campaign  on calendar_events(campaign_id);
create index if not exists idx_map_markers_campaign      on map_markers(campaign_id);
create index if not exists idx_personal_notes_campaign   on personal_notes(campaign_id);
create index if not exists idx_calendar_year_month       on calendar_events(year, month);
create index if not exists idx_sessions_number           on sessions(number);
create index if not exists idx_threads_status            on threads(status);
