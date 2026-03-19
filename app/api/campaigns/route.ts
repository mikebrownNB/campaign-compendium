import { getSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/campaigns — list campaigns for the current user
export async function GET() {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: memberships, error: memErr } = await supabase
      .from('campaign_members')
      .select('campaign_id, role')
      .eq('user_id', user.id);

    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
    if (!memberships || memberships.length === 0) return NextResponse.json([]);

    const campaignIds = memberships.map((m) => m.campaign_id);

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .in('id', campaignIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const roleMap = new Map(memberships.map((m) => [m.campaign_id, m.role]));
    const result = (campaigns ?? []).map((c) => ({ ...c, role: roleMap.get(c.id) }));

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/campaigns — create a new campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, slug, subtitle, description } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({ name, slug, subtitle, description, owner_id: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: memErr } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaign.id, user_id: user.id, role: 'dm' });

    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

    return NextResponse.json(campaign);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
