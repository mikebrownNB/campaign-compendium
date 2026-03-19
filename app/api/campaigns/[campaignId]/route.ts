import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/campaigns/[campaignId]
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const { campaignId } = params;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/campaigns/[campaignId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const { campaignId } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('campaigns')
      .update(body)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const { campaignId } = params;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
