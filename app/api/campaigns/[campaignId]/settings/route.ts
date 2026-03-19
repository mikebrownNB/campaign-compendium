export const dynamic = "force-dynamic";

import { getSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/campaigns/[campaignId]/settings?key=xxx
export async function GET(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const key = new URL(req.url).searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('campaign_id', params.campaignId)
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const res = NextResponse.json(data?.value ?? null);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Surrogate-Control', 'no-store');
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// PUT /api/campaigns/[campaignId]/settings  { key, value }
export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    const supabase = await getSupabaseServer();
    // Try to update the existing row first
    const { data: updated, error: updateErr } = await supabase
      .from('settings')
      .update({ value })
      .eq('campaign_id', params.campaignId)
      .eq('key', key)
      .select('key');

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // If no row matched, insert one
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase
        .from('settings')
        .insert({ key, value, campaign_id: params.campaignId });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
