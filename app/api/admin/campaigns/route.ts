import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'super_admin') return null;
  return user;
}

// GET /api/admin/campaigns — list all campaigns with owner info and member counts
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all campaigns (bypass RLS with service role)
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, slug, subtitle, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch member counts per campaign
  const { data: members } = await supabaseAdmin
    .from('campaign_members')
    .select('campaign_id');

  const countMap: Record<string, number> = {};
  for (const m of members ?? []) {
    countMap[m.campaign_id] = (countMap[m.campaign_id] ?? 0) + 1;
  }

  // Resolve owner display names
  const ownerIds = [...new Set((campaigns ?? []).map(c => c.owner_id).filter(Boolean))];
  const ownerMap: Record<string, string> = {};
  for (const oid of ownerIds) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(oid);
    if (data?.user) {
      ownerMap[oid] = (data.user.user_metadata?.display_name as string) ?? data.user.email ?? 'Unknown';
    }
  }

  const result = (campaigns ?? []).map(c => ({
    id:           c.id,
    name:         c.name,
    slug:         c.slug,
    subtitle:     c.subtitle,
    owner_id:     c.owner_id,
    owner_name:   c.owner_id ? (ownerMap[c.owner_id] ?? 'Unknown') : null,
    member_count: countMap[c.id] ?? 0,
    created_at:   c.created_at,
  }));

  return NextResponse.json(result);
}

// DELETE /api/admin/campaigns?id=<campaignId> — delete a campaign
export async function DELETE(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const campaignId = request.nextUrl.searchParams.get('id');
  if (!campaignId) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
