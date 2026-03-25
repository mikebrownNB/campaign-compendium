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

// PATCH /api/admin/users/[id] — reset password OR change role
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

  const body = await request.json();

  // ── Email change (super_admin only) ────────────────────────────────────────
  if ('email' in body) {
    if (admin.app_metadata?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can change email addresses.' }, { status: 403 });
    }
    const newEmail = (body.email as string)?.trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email:          newEmail,
      email_confirm:  true,   // bypass confirmation — super admin action
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Role change (super_admin only) ─────────────────────────────────────────
  if ('role' in body) {
    if (admin.app_metadata?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can change roles.' }, { status: 403 });
    }
    const allowed = ['member', 'admin'];
    if (!allowed.includes(body.role)) {
      return NextResponse.json({ error: 'Role must be "member" or "admin".' }, { status: 400 });
    }
    // Prevent demoting yourself
    if (id === admin.id) {
      return NextResponse.json({ error: 'Cannot change your own role.' }, { status: 400 });
    }
    // Prevent changing another super_admin
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(id);
    if (target?.user?.app_metadata?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot change role of another super admin.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: { ...target?.user?.app_metadata, role: body.role },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Password reset ──────────────────────────────────────────────────────────
  const { password } = body;
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
