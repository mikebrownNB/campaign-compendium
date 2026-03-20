import { getSupabaseServer } from './supabase-server';
import { NextRequest, NextResponse } from 'next/server';

type TableName = 'calendar_events' | 'npcs' | 'locations' | 'factions' | 'loot_items' | 'sessions' | 'threads' | 'map_markers' | 'personal_notes' | 'settings' | 'campaigns' | 'campaign_members' | 'campaign_maps' | 'players' | 'resources';

// ── Campaign-scoped CRUD handlers ──────────────────────────────────────────────
export function createCampaignCrudHandlers(table: TableName, orderBy: string, campaignId: string) {
  return {
    async GET() {
      try {
        const supabase = await getSupabaseServer();
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('campaign_id', campaignId)
          .order(orderBy);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
