import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/campaigns/[campaignId]/members
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const { campaignId } = params;

    const { data, error } = await supabase
      .from('campaign_members')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/campaigns/[campaignId]/members
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const { campaignId } = params;
    const { user_id, role } = await request.json();

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaignId, user_id, role })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId]/members?id=<membership_id>
export async function DELETE(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('campaign_members')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
