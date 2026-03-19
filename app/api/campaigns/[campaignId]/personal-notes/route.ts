export const dynamic = "force-dynamic";

import { getSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

async function getUser() {
  const supabase = await getSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

// GET /api/campaigns/[campaignId]/personal-notes
export async function GET(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('personal_notes')
      .select('*')
      .eq('campaign_id', params.campaignId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// POST /api/campaigns/[campaignId]/personal-notes
export async function POST(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { data, error } = await supabase
      .from('personal_notes')
      .insert({ ...body, campaign_id: params.campaignId, user_id: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[campaignId]/personal-notes
export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, ...rest } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('personal_notes')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId]/personal-notes?id=<uuid>
export async function DELETE(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('personal_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
