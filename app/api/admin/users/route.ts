import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || (role !== 'admin' && role !== 'super_admin')) return null;
  return user;
}

// GET /api/admin/users — list users (scoped by role)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isSuperAdmin = admin.app_metadata?.role === 'super_admin';

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users
    .filter((u) => {
      if (isSuperAdmin) return true;
      // Admins see only themselves and users they created
      return u.id === admin.id || u.app_metadata?.created_by === admin.id;
    })
    .map((u) => ({
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

  const isSuperAdmin = admin.app_metadata?.role === 'super_admin';
  const { email, password, display_name, role } = await request.json();
  if (!email || !display_name || !password) {
    return NextResponse.json({ error: 'email, display_name, and password are required' }, { status: 400 });
  }

  // Admins can only create members; super_admins can also create admins
  const allowedRoles = isSuperAdmin ? ['admin', 'member'] : ['member'];
  const assignedRole = allowedRoles.includes(role) ? role : 'member';

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name.trim() },
    app_metadata:  { role: assignedRole, created_by: admin.id },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.user.id });
}
