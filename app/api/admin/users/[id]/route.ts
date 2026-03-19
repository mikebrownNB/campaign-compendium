import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseServer } from '@/lib/supabase-server';

async function requireAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') return null;
  return user;
}

// PATCH /api/admin/users/[id] — reset password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
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

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
