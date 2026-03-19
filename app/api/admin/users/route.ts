import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') return null;
  return user;
}

// GET /api/admin/users — list all users
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users.map((u) => ({
    id:           u.id,
    email:        u.email,
    display_name: (u.user_metadata?.display_name as string) ?? '',
    role:         (u.app_metadata?.role as string) ?? 'member',
    created_at:   u.created_at,
    last_sign_in: u.last_sign_in_at,
  }));

  return NextResponse.json(users);
}

// POST /api/admin/users — create a new user
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { password, display_name, role } = await request.json();
  if (!display_name || !password) {
    return NextResponse.json({ error: 'display_name and password are required' }, { status: 400 });
  }

  // Auto-generate an internal email — users never see or type this.
  // Slug the display name and append a short random suffix to avoid collisions.
  const slug  = display_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.');
  const rand  = Math.random().toString(36).slice(2, 7);
  const email = `${slug}.${rand}@campaign-compendium.internal`;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name.trim() },
    app_metadata:  { role: role === 'admin' ? 'admin' : 'member' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.user.id });
}
