import { getSupabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/campaigns/[campaignId]/available-users
// Returns all auth users not already in the campaign. DM-only.
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify requester is a DM of this campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', params.campaignId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'dm') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing member user_ids
    const { data: members } = await supabase
      .from('campaign_members')
      .select('user_id')
      .eq('campaign_id', params.campaignId);

    const memberIds = new Set((members ?? []).map(m => m.user_id));

    // List all auth users
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const available = (usersData?.users ?? [])
      .filter(u => !memberIds.has(u.id))
      .map(u => ({
        id: u.id,
        display_name: (u.user_metadata?.display_name as string) ?? '',
        email: u.email ?? '',
      }))
      .sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email));

    return NextResponse.json(available);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
