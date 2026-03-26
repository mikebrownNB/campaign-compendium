import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'super_admin') return null;
  return user;
}

function toSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// POST /api/admin/campaigns/[id]/copy
// Body: { name: string, dm_user_id: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, dm_user_id } = await request.json();
  if (!name?.trim())  return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!dm_user_id)    return NextResponse.json({ error: 'dm_user_id is required' }, { status: 400 });

  // Fetch source campaign
  const { data: source, error: srcErr } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .single();

  if (srcErr || !source) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  // Generate unique slug
  let slug = toSlug(name.trim());
  const { data: conflict } = await supabaseAdmin
    .from('campaigns')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  if (conflict) slug = `${slug}-${Date.now().toString(36)}`;

  // Create the copied campaign
  const { data: newCampaign, error: createErr } = await supabaseAdmin
    .from('campaigns')
    .insert({
      name:        name.trim(),
      slug,
      subtitle:    source.subtitle    ?? null,
      description: source.description ?? null,
      settings:    source.settings    ?? null,
      owner_id:    dm_user_id,
    })
    .select()
    .single();

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

  // Add DM membership for the assigned user
  const { error: memErr } = await supabaseAdmin
    .from('campaign_members')
    .insert({ campaign_id: newCampaign.id, user_id: dm_user_id, role: 'dm' });

  if (memErr) {
    // Roll back campaign creation
    await supabaseAdmin.from('campaigns').delete().eq('id', newCampaign.id);
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: newCampaign.id, slug: newCampaign.slug, name: newCampaign.name });
}
