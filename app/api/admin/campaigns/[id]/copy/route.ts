import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'super_admin') return null;
  return user;
}

function toSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Strip id / campaign_id / timestamps so Supabase generates fresh ones
function strip<T extends Record<string, unknown>>(row: T): Omit<T, 'id' | 'campaign_id' | 'created_at' | 'updated_at'> {
  const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...rest } = row;
  return rest as never;
}

// POST /api/admin/campaigns/[id]/copy
// Body: { name: string, dm_user_id: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, dm_user_id } = await request.json();
  if (!name?.trim())  return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!dm_user_id)    return NextResponse.json({ error: 'dm_user_id is required' }, { status: 400 });

  const srcId = params.id;

  // ── 1. Fetch source campaign ──────────────────────────────────────────────
  const { data: source, error: srcErr } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', srcId)
    .single();
  if (srcErr || !source) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  // ── 2. Fetch all related entities in parallel ─────────────────────────────
  const [
    { data: locations },
    { data: maps },
    { data: npcs },
    { data: factions },
    { data: lootItems },
    { data: sessions },
    { data: threads },
    { data: calendarEvents },
    { data: mapMarkers },
    { data: resources },
  ] = await Promise.all([
    supabaseAdmin.from('locations').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('campaign_maps').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('npcs').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('factions').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('loot_items').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('sessions').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('threads').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('calendar_events').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('map_markers').select('*').eq('campaign_id', srcId),
    supabaseAdmin.from('resources').select('*').eq('campaign_id', srcId),
  ]);

  // ── 3. Create the new campaign ────────────────────────────────────────────
  let slug = toSlug(name.trim());
  const { data: conflict } = await supabaseAdmin
    .from('campaigns').select('slug').eq('slug', slug).maybeSingle();
  if (conflict) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: newCampaign, error: createErr } = await supabaseAdmin
    .from('campaigns')
    .insert({
      name:        name.trim(),
      slug,
      subtitle:    source.subtitle    ?? null,
      description: source.description ?? null,
      settings:    source.settings    ?? null,
      owner_id:    dm_user_id,
    })
    .select()
    .single();
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

  const newId = newCampaign.id;

  // ── 4. DM membership ──────────────────────────────────────────────────────
  const { error: memErr } = await supabaseAdmin
    .from('campaign_members')
    .insert({ campaign_id: newId, user_id: dm_user_id, role: 'dm' });
  if (memErr) {
    await supabaseAdmin.from('campaigns').delete().eq('id', newId);
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};

  // ── 5. Locations first (need old→new ID map for map_markers) ──────────────
  const locationIdMap: Record<string, string> = {};
  if (locations && locations.length > 0) {
    // Pre-generate new IDs so we can build the remap before inserting
    const rows = locations.map(loc => {
      const newLocId = crypto.randomUUID();
      locationIdMap[loc.id] = newLocId;
      return { id: newLocId, campaign_id: newId, ...strip(loc) };
    });
    const { error } = await supabaseAdmin.from('locations').insert(rows);
    if (!error) counts.locations = rows.length;
  }

  // ── 6. Everything else in parallel (no cross-refs) ────────────────────────
  const parallelInserts: Promise<void>[] = [];

  const addInsert = async (
    table: string,
    rows: Record<string, unknown>[],
    key: string,
  ) => {
    const { error } = await (supabaseAdmin.from(table as never) as ReturnType<typeof supabaseAdmin.from>)
      .insert(rows as never);
    if (!error) counts[key] = rows.length;
  };

  if (maps && maps.length > 0)
    parallelInserts.push(addInsert('campaign_maps', maps.map(r => ({ campaign_id: newId, ...strip(r) })), 'maps'));
  if (npcs && npcs.length > 0)
    parallelInserts.push(addInsert('npcs', npcs.map(r => ({ campaign_id: newId, ...strip(r) })), 'npcs'));
  if (factions && factions.length > 0)
    parallelInserts.push(addInsert('factions', factions.map(r => ({ campaign_id: newId, ...strip(r) })), 'factions'));
  if (lootItems && lootItems.length > 0)
    parallelInserts.push(addInsert('loot_items', lootItems.map(r => ({ campaign_id: newId, ...strip(r) })), 'loot items'));
  if (sessions && sessions.length > 0)
    parallelInserts.push(addInsert('sessions', sessions.map(r => ({ campaign_id: newId, ...strip(r) })), 'sessions'));
  if (threads && threads.length > 0)
    parallelInserts.push(addInsert('threads', threads.map(r => ({ campaign_id: newId, ...strip(r) })), 'threads'));
  if (calendarEvents && calendarEvents.length > 0)
    parallelInserts.push(addInsert('calendar_events', calendarEvents.map(r => ({ campaign_id: newId, ...strip(r) })), 'calendar events'));
  if (resources && resources.length > 0)
    parallelInserts.push(addInsert('resources', resources.map(r => ({ campaign_id: newId, ...strip(r) })), 'resources'));

  await Promise.all(parallelInserts);

  // ── 7. Map markers last (remap location_id) ───────────────────────────────
  if (mapMarkers && mapMarkers.length > 0) {
    const rows = mapMarkers.map(m => ({
      campaign_id: newId,
      ...strip(m),
      // Remap location_id to the new location UUID; null if not found
      location_id: m.location_id ? (locationIdMap[m.location_id] ?? null) : null,
    }));
    const { error } = await supabaseAdmin.from('map_markers').insert(rows);
    if (!error) counts.map_markers = rows.length;
  }

  return NextResponse.json({
    id:     newCampaign.id,
    slug:   newCampaign.slug,
    name:   newCampaign.name,
    counts,
  });
}
