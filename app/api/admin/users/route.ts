import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'super_admin') return null;
  return user;
}

// GET /api/admin/users — list all users (super_admin only)
export async function GET() {
  const admin = await requireSuperAdmin();
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

// POST /api/admin/users — create a new user (super_admin only)
export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, password, display_name } = await request.json();
  if (!email || !display_name || !password) {
    return NextResponse.json({ error: 'email, display_name, and password are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name.trim() },
    app_metadata:  { role: 'member', created_by: admin.id },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.user.id });
}
