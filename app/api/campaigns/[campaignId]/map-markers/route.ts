export const dynamic = "force-dynamic";

import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/campaigns/[campaignId]/map-markers?map_id=<slug>
export async function GET(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const mapId = new URL(req.url).searchParams.get('map_id');
    let query = supabase
      .from('map_markers')
      .select('*')
      .eq('campaign_id', params.campaignId);
    if (mapId) query = query.eq('map_id', mapId);
    const { data, error } = await query.order('created_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// POST /api/campaigns/[campaignId]/map-markers
export async function POST(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('map_markers')
      .insert({ ...body, campaign_id: params.campaignId })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[campaignId]/map-markers
export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { id, ...rest } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { data, error } = await supabase
      .from('map_markers')
      .update(rest)
      .eq('id', id)
      .eq('campaign_id', params.campaignId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId]/map-markers?id=<uuid>
export async function DELETE(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { error } = await supabase
      .from('map_markers')
      .delete()
      .eq('id', id)
      .eq('campaign_id', params.campaignId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
