import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'super_admin') return null;
  return user;
}

// GET /api/admin/campaigns/[id]/members — list all members of a campaign
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: members, error } = await supabaseAdmin
    .from('campaign_members')
    .select('user_id, role')
    .eq('campaign_id', params.id)
    .order('role');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve user info for each member
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      const u = data?.user;
      return {
        user_id:      m.user_id,
        role:         m.role,
        display_name: (u?.user_metadata?.display_name as string | undefined) ?? null,
        email:        u?.email ?? '(unknown)',
      };
    }),
  );

  return NextResponse.json(enriched);
}

// PUT /api/admin/campaigns/[id]/members — update a member's role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { user_id, role } = await request.json();
  if (!user_id || !role) return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 });
  if (!['dm', 'player'].includes(role)) return NextResponse.json({ error: 'role must be dm or player' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('campaign_members')
    .update({ role })
    .eq('campaign_id', params.id)
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/campaigns/[id]/members?user_id=<uid> — remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('campaign_members')
    .delete()
    .eq('campaign_id', params.id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
