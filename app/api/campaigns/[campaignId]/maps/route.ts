import { getSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/campaigns/[campaignId]/maps
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = await getSupabaseServer();
    const { campaignId } = params;

    const { data, error } = await supabase
      .from('campaign_maps')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sort_order');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/campaigns/[campaignId]/maps
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = await getSupabaseServer();
    const { campaignId } = params;
    const { slug, name, image_url, description, sort_order } = await request.json();

    if (!slug || !name || !image_url) {
      return NextResponse.json({ error: 'slug, name, and image_url are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('campaign_maps')
      .insert({ campaign_id: campaignId, slug, name, image_url, description, sort_order })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/campaigns/[campaignId]/maps
export async function PUT(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = await getSupabaseServer();
    const { id, ...fields } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required in the body' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('campaign_maps')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId]/maps?id=<map_id>
export async function DELETE(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = await getSupabaseServer();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('campaign_maps')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
