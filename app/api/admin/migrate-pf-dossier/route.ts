/**
 * POST /api/admin/migrate-pf-dossier
 *
 * One-time migration route — copies all campaign data from pf-dossier
 * Supabase into a new "Volitaire Petrius" campaign here.
 *
 * Requires: super_admin session + two env vars set in Vercel:
 *   PF_SUPABASE_URL        — pf-dossier project URL
 *   PF_SUPABASE_ANON_KEY   — pf-dossier anon key (read-only)
 *
 * Safe to run multiple times — idempotent (upserts where possible).
 *
 * TODO: remove this file after the migration is complete.
 */

import { NextResponse }      from 'next/server';
import { createClient }      from '@supabase/supabase-js';
import { supabaseAdmin }     from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'super_admin') return null;
  return user;
}

/** Replace literal \uXXXX escape sequences in strings with the real characters. */
function unescapeUnicode(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  }
  if (Array.isArray(value)) return value.map(unescapeUnicode);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, unescapeUnicode(v)]),
    );
  }
  return value;
}

function strip<T extends Record<string, unknown>>(rows: T[], ...extra: string[]): Omit<T, 'created_at' | 'updated_at'>[] {
  const drop = ['created_at', 'updated_at', ...extra];
  return rows.map(row => {
    const r = unescapeUnicode({ ...row }) as Record<string, unknown>;
    for (const k of drop) delete r[k];
    return r;
  }) as Omit<T, 'created_at' | 'updated_at'>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readAll(client: any, table: string) {
  const { data, error } = await client.from(table).select('*');
  if (error) throw new Error(`Reading ${table}: ${error.message}`);
  return data ?? [];
}

export async function POST() {
  // Auth guard
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check env vars
  const pfUrl  = process.env.PF_SUPABASE_URL;
  const pfKey  = process.env.PF_SUPABASE_ANON_KEY;
  if (!pfUrl || !pfKey) {
    return NextResponse.json(
      { error: 'Missing PF_SUPABASE_URL or PF_SUPABASE_ANON_KEY environment variables. Add them in Vercel and redeploy.' },
      { status: 500 },
    );
  }

  // Source client (pf-dossier, read-only)
  const pf = createClient(pfUrl, pfKey);

  const counts: Record<string, number> = {};

  try {
    // ── 1. Create / find the campaign ─────────────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('slug', 'volitaire')
      .maybeSingle();

    let campaignId: string;
    if (existing) {
      campaignId = existing.id;
    } else {
      const { data: created, error: campErr } = await supabaseAdmin
        .from('campaigns')
        .insert({
          name:        'Volitaire Petrius',
          slug:        'volitaire',
          subtitle:    'A Spelljammer Campaign',
          description: '',
          owner_id:    admin.id,
        })
        .select('id')
        .single();
      if (campErr) throw new Error(`Creating campaign: ${campErr.message}`);
      campaignId = created.id;
    }

    // Add owner as DM member
    await supabaseAdmin
      .from('campaign_members')
      .upsert({ campaign_id: campaignId, user_id: admin.id, role: 'dm' }, { onConflict: 'campaign_id,user_id' });

    // ── 2. Campaign maps ───────────────────────────────────────────────────────
    const maps = [
      { campaign_id: campaignId, slug: 'volitaire-petrius', name: 'Volitaire Petrius', image_url: '', description: 'The world of Volitaire Petrius', sort_order: 0 },
      { campaign_id: campaignId, slug: 'rock-of-bral',      name: 'Bral – Topside',    image_url: '', description: 'Rock of Bral – Topside',         sort_order: 1 },
      { campaign_id: campaignId, slug: 'bral-underside',    name: 'Bral – Underside',  image_url: '', description: 'Rock of Bral – Underside',        sort_order: 2 },
    ];
    for (const map of maps) {
      await supabaseAdmin
        .from('campaign_maps')
        .upsert(map, { onConflict: 'campaign_id,slug' });
    }
    counts['campaign_maps'] = 3;

    // ── 3. Entity tables ───────────────────────────────────────────────────────

    // Locations first (map_markers FK depends on them)
    const locations = await readAll(pf, 'locations');
    if (locations.length) {
      const { error } = await supabaseAdmin.from('locations').upsert(
        strip(locations).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`locations: ${error.message}`);
    }
    counts['locations'] = locations.length;

    const npcs = await readAll(pf, 'npcs');
    if (npcs.length) {
      const { error } = await supabaseAdmin.from('npcs').upsert(
        strip(npcs).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`npcs: ${error.message}`);
    }
    counts['npcs'] = npcs.length;

    const factions = await readAll(pf, 'factions');
    if (factions.length) {
      const { error } = await supabaseAdmin.from('factions').upsert(
        strip(factions).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`factions: ${error.message}`);
    }
    counts['factions'] = factions.length;

    const loot = await readAll(pf, 'loot_items');
    if (loot.length) {
      const { error } = await supabaseAdmin.from('loot_items').upsert(
        strip(loot).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`loot_items: ${error.message}`);
    }
    counts['loot_items'] = loot.length;

    // Sessions — drop document_url (links are hardcoded in the sessions page)
    const sessions = await readAll(pf, 'sessions');
    if (sessions.length) {
      const { error } = await supabaseAdmin.from('sessions').upsert(
        strip(sessions, 'document_url').map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`sessions: ${error.message}`);
    }
    counts['sessions'] = sessions.length;

    const threads = await readAll(pf, 'threads');
    if (threads.length) {
      const { error } = await supabaseAdmin.from('threads').upsert(
        strip(threads).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`threads: ${error.message}`);
    }
    counts['threads'] = threads.length;

    const events = await readAll(pf, 'calendar_events');
    if (events.length) {
      const { error } = await supabaseAdmin.from('calendar_events').upsert(
        strip(events).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`calendar_events: ${error.message}`);
    }
    counts['calendar_events'] = events.length;

    // Map markers — location_id UUIDs are preserved so FK refs stay valid
    const markers = await readAll(pf, 'map_markers');
    if (markers.length) {
      const { error } = await supabaseAdmin.from('map_markers').upsert(
        strip(markers).map(r => ({ ...r, campaign_id: campaignId })),
        { onConflict: 'id' },
      );
      if (error) throw new Error(`map_markers: ${error.message}`);
    }
    counts['map_markers'] = markers.length;

    // Settings — upsert by (campaign_id, key)
    const settings = await readAll(pf, 'settings');
    for (const s of strip(settings) as { key: string; value: unknown }[]) {
      const { error } = await supabaseAdmin
        .from('settings')
        .upsert({ campaign_id: campaignId, key: s.key, value: s.value }, { onConflict: 'campaign_id,key' });
      if (error) throw new Error(`settings key "${s.key}": ${error.message}`);
    }
    counts['settings'] = settings.length;

    return NextResponse.json({ ok: true, campaign_id: campaignId, counts });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
