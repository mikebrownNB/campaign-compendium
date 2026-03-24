'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PageHeader, Button, Input, ConfirmDelete, Select } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';

interface AppUser {
  id:           string;
  email:        string;
  display_name: string;
  role:         string;
  created_at:   string;
  last_sign_in: string | null;
}

const emptyCreate = { email: '', password: '', display_name: '', role: 'member' };

export default function UsersPage() {
  const [users,      setUsers]      = useState<AppUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [modal,      setModal]      = useState<'create' | 'reset' | 'delete' | 'role' | null>(null);
  const [selected,   setSelected]   = useState<AppUser | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [tempPw,     setTempPw]     = useState('');
  const [newRole,    setNewRole]    = useState<'member' | 'admin'>('member');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      const role = data.user?.app_metadata?.role;
      if (role === 'admin' || role === 'super_admin') {
        setIsAdmin(true);
        setIsSuperAdmin(role === 'super_admin');
        loadUsers();
      } else {
        setLoading(false);
      }
    });
  }, [loadUsers]);

  if (!isAdmin && !loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Icon name="lock" className="text-4xl" />
        <p className="font-mono text-text-muted text-sm">Admin access required.</p>
      </div>
    );
  }

  const flash = (msg: string, type: 'ok' | 'err') => {
    if (type === 'ok') { setSuccess(msg); setError(null); }
    else               { setError(msg);   setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.display_name || !createForm.password) {
      setError('Email, display name, and password are required.'); return;
    }
    setSaving(true); setError(null);
    const res = await fetch('/api/admin/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(createForm),
    });
    setSaving(false);
    if (res.ok) {
      setModal(null);
      setCreateForm(emptyCreate);
      await loadUsers();
      flash(`User "${createForm.display_name}" created.`, 'ok');
    } else {
      const body = await res.json();
      setError(body.error ?? 'Failed to create user.');
    }
  };

  const handleResetPassword = async () => {
    if (!selected || !tempPw) { setError('Enter a temporary password.'); return; }
    setSaving(true); setError(null);
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: tempPw }),
    });
    setSaving(false);
    if (res.ok) {
      setModal(null); setTempPw(''); setSelected(null);
      flash(`Password reset for "${selected.display_name}".`, 'ok');
    } else {
      const body = await res.json();
      setError(body.error ?? 'Failed to reset password.');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const res = await fetch(`/api/admin/users/${selected.id}`, { method: 'DELETE' });
    if (res.ok) {
      setModal(null); setSelected(null);
      await loadUsers();
      flash('User deleted.', 'ok');
    } else {
      const body = await res.json();
      flash(body.error ?? 'Failed to delete user.', 'err');
    }
  };

  const handleChangeRole = async () => {
    if (!selected) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role: newRole }),
    });
    setSaving(false);
    if (res.ok) {
      setModal(null); setSelected(null);
      await loadUsers();
      const label = newRole === 'admin' ? 'Admin' : 'Member';
      flash(`"${selected.display_name}" is now ${label}.`, 'ok');
    } else {
      const body = await res.json();
      setError(body.error ?? 'Failed to change role.');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="groups" title="User Management">
        <Button onClick={() => { setCreateForm(emptyCreate); setError(null); setModal('create'); }}>
          + New User
        </Button>
      </PageHeader>

      {success && (
        <p className="mb-4 font-mono text-[0.65rem] text-green-400 bg-green-400/10 border border-green-400/30 rounded px-3 py-2">
          <Icon name="check_circle" className="text-sm align-middle" /> {success}
        </p>
      )}
      {error && !modal && (
        <p className="mb-4 font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
          <Icon name="close" className="text-sm align-middle" /> {error}
        </p>
      )}

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : (
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3">Display Name</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden md:table-cell">Role</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Last Sign-in</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-subtle/50 hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-text-primary">
                    {u.display_name || <span className="text-text-muted italic">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-[0.65rem] text-text-secondary">
                    {u.email || <span className="text-text-muted italic">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.role === 'super_admin' ? (
                      <span className="font-mono text-[0.6rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-2 py-0.5">Super Admin</span>
                    ) : u.role === 'admin' ? (
                      <span className="font-mono text-[0.6rem] text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded px-2 py-0.5">Admin</span>
                    ) : (
                      <span className="font-mono text-[0.6rem] text-text-muted">Member</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-[0.65rem] text-text-muted">
                    {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {isSuperAdmin && u.role !== 'super_admin' && (
                        <button
                          onClick={() => {
                            setSelected(u);
                            setNewRole(u.role === 'admin' ? 'member' : 'admin');
                            setError(null);
                            setModal('role');
                          }}
                          className="font-mono text-[0.65rem] text-text-muted hover:text-accent-purple transition-colors"
                        >
                          Change Role
                        </button>
                      )}
                      <button
                        onClick={() => { setSelected(u); setTempPw(''); setError(null); setModal('reset'); }}
                        className="font-mono text-[0.65rem] text-text-muted hover:text-accent-gold transition-colors"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => { setSelected(u); setModal('delete'); }}
                        className="font-mono text-[0.65rem] text-text-muted hover:text-accent-red transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create New User">
        <div className="flex flex-col gap-3">
          <Input label="Display Name" value={createForm.display_name}
            onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
            placeholder="e.g. Mike" />
          <Input label="Email" type="email" value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="player@example.com" />
          <Input label="Temporary Password" type="password" value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="Share this with the player" />
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Role</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
            >
              <option value="member">Member</option>
              {isSuperAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
          {error && (
            <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2"><Icon name="close" className="text-sm align-middle" /> {error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={modal === 'reset'} onClose={() => setModal(null)} title="Reset Password">
        <p className="text-sm text-text-secondary mb-3">
          Set a new temporary password for{' '}
          <span className="text-text-primary font-mono">{selected?.display_name}</span>.
          Share it with them directly.
        </p>
        <Input label="New Temporary Password" type="password" value={tempPw}
          onChange={(e) => setTempPw(e.target.value)}
          placeholder="Min. 8 characters" />
        {error && (
          <p className="mt-2 font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2"><Icon name="close" className="text-sm align-middle" /> {error}</p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleResetPassword} disabled={saving}>
            {saving ? 'Saving…' : 'Set Password'}
          </Button>
        </div>
      </Modal>

      {/* Change role modal */}
      <Modal open={modal === 'role'} onClose={() => setModal(null)} title="Change User Role">
        <p className="text-sm text-text-secondary mb-4">
          Change role for{' '}
          <span className="text-text-primary font-mono">{selected?.display_name}</span>.
          Admins can manage users and campaigns but cannot promote others to admin.
        </p>
        <Select
          label="Role"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as 'member' | 'admin')}
          options={[
            { value: 'member', label: 'Member — regular user, no admin access' },
            { value: 'admin',  label: 'Admin — can manage users & campaigns' },
          ]}
        />
        {error && (
          <p className="mt-2 font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
            <Icon name="close" className="text-sm align-middle" /> {error}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleChangeRole} disabled={saving}>
            {saving ? 'Saving…' : 'Save Role'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete User">
        <p className="text-sm text-text-secondary mb-4">
          Permanently delete <span className="text-text-primary font-mono">{selected?.display_name}</span>?
          This cannot be undone.
        </p>
        <ConfirmDelete onConfirm={handleDelete} onCancel={() => setModal(null)} />
      </Modal>
    </div>
  );
}
