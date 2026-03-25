import { getSupabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/campaigns/[campaignId]/members/invite
 *
 * Invite a user to a campaign by email address.
 *
 * - If the email already belongs to a campaign member → 409
 * - If the email belongs to an existing user not yet in the campaign
 *   → add them directly (no email sent) and return { action: 'added' }
 * - If the email is brand new
 *   → send a Supabase invite email (triggers the Send Email hook),
 *     pre-create their campaign membership, and return { action: 'invited' }
 */
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
      return NextResponse.json({ error: 'Only campaign DMs can invite members.' }, { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'email is required.' }, { status: 400 });
    }
    const campaignRole: 'dm' | 'player' = role === 'dm' ? 'dm' : 'player';
    const normalizedEmail = email.trim().toLowerCase();

    // Look up whether this email already has an account
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = (usersPage?.users ?? []).find(
      u => u.email?.toLowerCase() === normalizedEmail,
    );

    if (existingUser) {
      // Check if they're already in the campaign
      const { data: existingMember } = await supabase
        .from('campaign_members')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: `${normalizedEmail} is already a member of this campaign.` },
          { status: 409 },
        );
      }

      // Add existing user directly — no email needed
      const { data: newMember, error: memberErr } = await supabase
        .from('campaign_members')
        .insert({ campaign_id: campaignId, user_id: existingUser.id, role: campaignRole })
        .select()
        .single();

      if (memberErr) {
        return NextResponse.json({ error: memberErr.message }, { status: 500 });
      }

      return NextResponse.json({
        action:       'added',
        member: {
          ...newMember,
          display_name: (existingUser.user_metadata?.display_name as string) ?? '',
          email:        existingUser.email ?? normalizedEmail,
        },
      });
    }

    // New user — send invite email via Supabase (triggers the Send Email hook)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${siteUrl}/`,
        data:       { invited_to_campaign: campaignId },
      },
    );

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }

    // Pre-create the campaign membership so they land in the right campaign
    const { data: newMember, error: memberErr } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaignId, user_id: invited.user.id, role: campaignRole })
      .select()
      .single();

    if (memberErr) {
      // Roll back the auth user so we don't leave orphans
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    return NextResponse.json({
      action: 'invited',
      member: {
        ...newMember,
        display_name: '',
        email:        normalizedEmail,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
