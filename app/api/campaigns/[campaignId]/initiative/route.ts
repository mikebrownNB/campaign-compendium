import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { InitiativeEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getCampaignRole(campaignId: string) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .single();
  return { supabase, user, role: membership?.role ?? null };
}

const EMPTY_STATE = {
  entries: [] as InitiativeEntry[],
  round: 1,
  active_index: 0,
  visible_to_players: false,
};

// GET /api/campaigns/[campaignId]/initiative
export async function GET(
  _req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  const { campaignId } = params;
  const { supabase, user, role } = await getCampaignRole(campaignId);
  if (!user || !role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isDM = role === 'dm';

  const { data, error } = await supabase
    .from('initiative_tracker')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // No row yet — return empty state
  if (!data) {
    return NextResponse.json({ campaign_id: campaignId, ...EMPTY_STATE });
  }

  // DMs see everything
  if (isDM) return NextResponse.json(data);

  // Players: tracker is always visible; visible_to_players controls whether monsters show
  const allEntries = data.entries as InitiativeEntry[];
  const playerEntries = allEntries
    .filter(e => data.visible_to_players || e.type === 'player')
    .map(({ hp, maxHp, ac, notes, ...rest }) => rest);

  return NextResponse.json({ ...data, entries: playerEntries });
}

// PUT /api/campaigns/[campaignId]/initiative — DM only, upsert
export async function PUT(
  req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  const { campaignId } = params;
  const { supabase, user, role } = await getCampaignRole(campaignId);
  if (!user || role !== 'dm') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { entries, round, active_index, visible_to_players } = body;

  const { data, error } = await supabase
    .from('initiative_tracker')
    .upsert(
      {
        campaign_id: campaignId,
        entries: entries ?? [],
        round: round ?? 1,
        active_index: active_index ?? 0,
        visible_to_players: visible_to_players ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'campaign_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
