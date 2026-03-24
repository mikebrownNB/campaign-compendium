/**
 * migrate-pf-dossier.mjs
 *
 * One-off migration: copies all campaign data from the pf-dossier Supabase
 * project into a new "Volitaire Petrius" campaign in campaign-compendium.
 *
 * Usage:
 *   1. Copy scripts/.env.migrate.example → scripts/.env.migrate and fill in values
 *   2. node scripts/migrate-pf-dossier.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Load .env.migrate ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = join(__dirname, '.env.migrate');

let envVars = {};
try {
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    envVars[key] = val;
  }
} catch {
  console.error('❌  Could not read scripts/.env.migrate — copy .env.migrate.example and fill in your credentials.');
  process.exit(1);
}

const {
  PF_SUPABASE_URL,
  PF_SUPABASE_ANON_KEY,
  CC_SUPABASE_URL,
  CC_SERVICE_ROLE_KEY,
  CC_OWNER_USER_ID,
} = envVars;

for (const [k, v] of Object.entries({ PF_SUPABASE_URL, PF_SUPABASE_ANON_KEY, CC_SUPABASE_URL, CC_SERVICE_ROLE_KEY, CC_OWNER_USER_ID })) {
  if (!v) { console.error(`❌  Missing required env var: ${k}`); process.exit(1); }
}

// ── Supabase clients ───────────────────────────────────────────────────────────
const pf = createClient(PF_SUPABASE_URL, PF_SUPABASE_ANON_KEY);
const cc = createClient(CC_SUPABASE_URL, CC_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function strip(rows, ...keys) {
  return rows.map(row => {
    const r = { ...row };
    for (const k of ['created_at', 'updated_at', ...keys]) delete r[k];
    return r;
  });
}

async function readAll(client, table) {
  const { data, error } = await client.from(table).select('*');
  if (error) throw new Error(`Reading ${table}: ${error.message}`);
  return data ?? [];
}

async function insertAll(table, rows) {
  if (!rows.length) { console.log(`  ↳ ${table}: 0 rows (skipped)`); return; }
  const { error } = await cc.from(table).insert(rows);
  if (error) throw new Error(`Inserting into ${table}: ${error.message}`);
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Starting migration: pf-dossier → campaign-compendium\n');

  // 1. Create the campaign
  console.log('Creating campaign "Volitaire Petrius" (slug: volitaire)…');
  const { data: existingCampaign } = await cc
    .from('campaigns')
    .select('id')
    .eq('slug', 'volitaire')
    .maybeSingle();

  let campaignId;
  if (existingCampaign) {
    campaignId = existingCampaign.id;
    console.log(`  ↳ Campaign already exists (id: ${campaignId}), using it.`);
  } else {
    const { data: newCampaign, error: campErr } = await cc
      .from('campaigns')
      .insert({
        name:       'Volitaire Petrius',
        slug:       'volitaire',
        subtitle:   'A Spelljammer Campaign',
        description: '',
        owner_id:   CC_OWNER_USER_ID,
      })
      .select('id')
      .single();
    if (campErr) throw new Error(`Creating campaign: ${campErr.message}`);
    campaignId = newCampaign.id;
    console.log(`  ✓ Campaign created (id: ${campaignId})`);
  }

  // Also add the owner as a DM campaign member
  const { error: memberErr } = await cc
    .from('campaign_members')
    .upsert({ campaign_id: campaignId, user_id: CC_OWNER_USER_ID, role: 'dm' }, { onConflict: 'campaign_id,user_id' });
  if (memberErr) throw new Error(`Adding DM member: ${memberErr.message}`);
  console.log('  ✓ Owner added as DM member');

  // 2. Create campaign_maps rows
  console.log('\nCreating campaign maps…');
  const maps = [
    { campaign_id: campaignId, slug: 'volitaire-petrius', name: 'Volitaire Petrius', image_url: '', description: 'The world of Volitaire Petrius', sort_order: 0 },
    { campaign_id: campaignId, slug: 'rock-of-bral',      name: 'Bral – Topside',    image_url: '', description: 'Rock of Bral – Topside',         sort_order: 1 },
    { campaign_id: campaignId, slug: 'bral-underside',    name: 'Bral – Underside',  image_url: '', description: 'Rock of Bral – Underside',        sort_order: 2 },
  ];
  for (const map of maps) {
    const { data: existing } = await cc
      .from('campaign_maps')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('slug', map.slug)
      .maybeSingle();
    if (existing) {
      console.log(`  ↳ Map "${map.slug}" already exists, skipping.`);
    } else {
      const { error } = await cc.from('campaign_maps').insert(map);
      if (error) throw new Error(`Inserting map ${map.slug}: ${error.message}`);
      console.log(`  ✓ Map: ${map.name}`);
    }
  }

  // 3. Migrate entity tables
  console.log('\nMigrating entity tables…');

  // Locations (must come before map_markers to satisfy FK)
  const locations = await readAll(pf, 'locations');
  await insertAll('locations', strip(locations).map(r => ({ ...r, campaign_id: campaignId })));

  // NPCs
  const npcs = await readAll(pf, 'npcs');
  await insertAll('npcs', strip(npcs).map(r => ({ ...r, campaign_id: campaignId })));

  // Factions
  const factions = await readAll(pf, 'factions');
  await insertAll('factions', strip(factions).map(r => ({ ...r, campaign_id: campaignId })));

  // Loot items
  const loot = await readAll(pf, 'loot_items');
  await insertAll('loot_items', strip(loot).map(r => ({ ...r, campaign_id: campaignId })));

  // Sessions (drop document_url — links are hardcoded in the sessions page)
  const sessions = await readAll(pf, 'sessions');
  await insertAll('sessions', strip(sessions, 'document_url').map(r => ({ ...r, campaign_id: campaignId })));

  // Threads
  const threads = await readAll(pf, 'threads');
  await insertAll('threads', strip(threads).map(r => ({ ...r, campaign_id: campaignId })));

  // Calendar events
  const events = await readAll(pf, 'calendar_events');
  await insertAll('calendar_events', strip(events).map(r => ({ ...r, campaign_id: campaignId })));

  // Map markers (location_id UUIDs are preserved from locations above, so refs stay valid)
  const markers = await readAll(pf, 'map_markers');
  await insertAll('map_markers', strip(markers).map(r => ({ ...r, campaign_id: campaignId })));

  // Settings
  const settings = await readAll(pf, 'settings');
  // settings table PK is (campaign_id, key) — upsert to handle re-runs
  for (const s of strip(settings)) {
    const { error } = await cc
      .from('settings')
      .upsert({ campaign_id: campaignId, key: s.key, value: s.value }, { onConflict: 'campaign_id,key' });
    if (error) throw new Error(`Upserting setting "${s.key}": ${error.message}`);
  }
  console.log(`  ✓ settings: ${settings.length} rows`);

  console.log('\n✅  Migration complete!\n');
  console.log('Next steps:');
  console.log('  1. Open /c/volitaire in campaign-compendium and verify all data');
  console.log('  2. Campaign Settings → Maps → add image URLs for the 3 maps');
  console.log('  3. Add campaign members via the admin UI or campaign settings\n');
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  process.exit(1);
});
