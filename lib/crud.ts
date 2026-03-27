import { getSupabaseServer } from './supabase-server';
import { NextRequest, NextResponse } from 'next/server';

type TableName = 'calendar_events' | 'npcs' | 'locations' | 'factions' | 'loot_items' | 'sessions' | 'threads' | 'map_markers' | 'personal_notes' | 'settings' | 'campaigns' | 'campaign_members' | 'campaign_maps' | 'players' | 'resources' | 'initiative_tracker';

// Tables that support the dm_only visibility flag
const DM_ONLY_TABLES: TableName[] = ['npcs', 'locations', 'factions', 'loot_items', 'threads'];

// ── Campaign-scoped CRUD handlers ──────────────────────────────────────────────
export function createCampaignCrudHandlers(table: TableName, orderBy: string, campaignId: string) {
  return {
    async GET() {
      try {
        const supabase = await getSupabaseServer();

        // Check if the requesting user is a DM for this campaign
        let isDM = true; // default to showing everything; restrict if we can determine role
        if (DM_ONLY_TABLES.includes(table)) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: membership } = await supabase
              .from('campaign_members')
              .select('role')
              .eq('campaign_id', campaignId)
              .eq('user_id', user.id)
              .single();
            isDM = membership?.role === 'dm';
          }
        }

        let query = supabase
          .from(table)
          .select('*')
          .eq('campaign_id', campaignId);

        // Non-DMs cannot see dm_only items
        if (DM_ONLY_TABLES.includes(table) && !isDM) {
          query = query.or('dm_only.is.null,dm_only.eq.false');
        }

        const { data, error } = await query.order(orderBy);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Strip dm_notes from responses for non-DMs (always DM-only regardless of dm_only flag)
        if (DM_ONLY_TABLES.includes(table) && !isDM && Array.isArray(data)) {
          const stripped = data.map((row: Record<string, unknown>) => {
            const { dm_notes: _, ...rest } = row;
            return rest;
          });
          return NextResponse.json(stripped);
        }

        return NextResponse.json(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    },

    async POST(request: NextRequest) {
      try {
        const supabase = await getSupabaseServer();
        const body = await request.json();
        const { data, error } = await supabase
          .from(table)
          .insert({ ...body, campaign_id: campaignId })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data, { status: 201 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    },

    async PUT(request: NextRequest) {
      try {
        const supabase = await getSupabaseServer();
        const body = await request.json();
        const { id, ...rest } = body;
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const { data, error } = await supabase
          .from(table)
          .update(rest)
          .eq('id', id)
          .eq('campaign_id', campaignId)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    },

    async DELETE(request: NextRequest) {
      try {
        const supabase = await getSupabaseServer();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id)
          .eq('campaign_id', campaignId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    },
  };
}
