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

// Check if the calling admin owns the target user
async function verifyOwnership(admin: { id: string; app_metadata?: Record<string, unknown> }, targetId: string) {
  if (admin.app_metadata?.role === 'super_admin') return true;
  // Admins can only manage users they created
  const { data } = await supabaseAdmin.auth.admin.getUserById(targetId);
  return data?.user?.app_metadata?.created_by === admin.id;
}

// PATCH /api/admin/users/[id] — reset password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Ownership check for regular admins
  if (admin.app_metadata?.role !== 'super_admin' && id !== admin.id && !(await verifyOwnership(admin, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { password } = await request.json();
  if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users/[id] — remove user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (id === admin.id) {
    return NextResponse.json({ error: 'Cannot delete your own account.' }, { status: 400 });
  }

  // Ownership check for regular admins
  if (admin.app_metadata?.role !== 'super_admin' && !(await verifyOwnership(admin, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
