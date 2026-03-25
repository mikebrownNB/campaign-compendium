import { getSupabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/campaigns/[campaignId]/members/create-user
// DM creates a brand-new auth user and immediately adds them to the campaign.
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaignId } = params;

    // Verify requester is a DM of this campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'dm') {
      return NextResponse.json({ error: 'Only campaign DMs can create members.' }, { status: 403 });
    }

    const { display_name, email, password, role } = await request.json();

    if (!display_name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'display_name, email, and password are required.' },
        { status: 400 },
      );
    }

    const campaignRole = role === 'dm' ? 'dm' : 'player';

    // Create the Supabase auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata:  { display_name: display_name.trim() },
      app_metadata:   { role: 'member', created_by: user.id },
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    const newUserId = created.user.id;

    // Add them to the campaign
    const { data: member, error: memberErr } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaignId, user_id: newUserId, role: campaignRole })
      .select()
      .single();

    if (memberErr) {
      // Roll back auth user creation so we don't leave orphaned users
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ...member,
      display_name: display_name.trim(),
      email: email.trim().toLowerCase(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
