'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PageHeader, Button, ConfirmDelete, Select } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';

interface AdminCampaign {
  id:           string;
  name:         string;
  slug:         string;
  subtitle:     string;
  owner_id:     string | null;
  owner_name:   string | null;
  member_count: number;
  created_at:   string;
}

interface AdminUser {
  id:           string;
  email:        string;
  display_name: string | null;
  role:         string;
}

export default function AdminCampaignsPage() {
  const [campaigns,    setCampaigns]    = useState<AdminCampaign[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [allowed,      setAllowed]      = useState(false);
  const [selected,     setSelected]     = useState<AdminCampaign | null>(null);
  const [modal,        setModal]        = useState<'delete' | 'reassign' | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [users,        setUsers]        = useState<AdminUser[]>([]);
  const [newOwnerId,   setNewOwnerId]   = useState<string>('');
  const [saving,       setSaving]       = useState(false);
  const [migrating,    setMigrating]    = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ counts: Record<string, number> } | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/campaigns');
    if (res.ok) setCampaigns(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.app_metadata?.role === 'super_admin') {
        setAllowed(true);
        loadCampaigns();
      } else {
        setLoading(false);
      }
    });
  }, [loadCampaigns]);

  if (!allowed && !loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Icon name="lock" className="text-4xl" />
        <p className="font-mono text-text-muted text-sm">Super admin access required.</p>
      </div>
    );
  }

  const flash = (msg: string, type: 'ok' | 'err') => {
    if (type === 'ok') { setSuccess(msg); setError(null); }
    else               { setError(msg);   setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  };

  const openReassign = async (c: AdminCampaign) => {
    setSelected(c);
    setNewOwnerId(c.owner_id ?? '');
    // Lazy-load the users list once
    if (users.length === 0) {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    }
    setModal('reassign');
  };

  const handleReassign = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch('/api/admin/campaigns', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ campaign_id: selected.id, owner_id: newOwnerId || null }),
    });
    setSaving(false);
    if (res.ok) {
      setModal(null);
      await loadCampaigns();
      const ownerLabel = newOwnerId
        ? (users.find(u => u.id === newOwnerId)?.display_name || users.find(u => u.id === newOwnerId)?.email || 'new owner')
        : 'no owner';
      flash(`"${selected.name}" reassigned to ${ownerLabel}.`, 'ok');
    } else {
      const body = await res.json();
      flash(body.error ?? 'Failed to reassign owner.', 'err');
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult(null);
    const res = await fetch('/api/admin/migrate-pf-dossier', { method: 'POST' });
    const body = await res.json();
    setMigrating(false);
    if (res.ok) {
      setMigrateResult(body);
      await loadCampaigns();
    } else {
      flash(body.error ?? 'Migration failed.', 'err');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const res = await fetch(`/api/admin/campaigns?id=${selected.id}`, { method: 'DELETE' });
    if (res.ok) {
      setModal(null); setSelected(null);
      await loadCampaigns();
      flash(`Campaign "${selected.name}" deleted.`, 'ok');
    } else {
      const body = await res.json();
      flash(body.error ?? 'Failed to delete campaign.', 'err');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="library_books" title="All Campaigns" />

      {/* ── pf-dossier migration ── */}
      <div className="mb-6 bg-card border border-border-subtle rounded-xl p-4 flex items-start gap-4">
        <Icon name="move_down" className="text-2xl text-accent-purple shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-bold text-text-primary mb-0.5">Import from pf-dossier</p>
          <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
            Creates the <span className="text-accent-gold">Volitaire Petrius</span> campaign and imports all locations, NPCs,
            factions, loot, sessions, threads, calendar events, and map markers from the pf-dossier project.
            Safe to run multiple times (idempotent).
            Requires <code className="bg-deep px-1 rounded">PF_SUPABASE_URL</code> and{' '}
            <code className="bg-deep px-1 rounded">PF_SUPABASE_ANON_KEY</code> env vars in Vercel.
          </p>
          {migrateResult && (
            <div className="mt-2 font-mono text-[0.65rem] text-green-400 bg-green-400/10 border border-green-400/30 rounded px-3 py-2">
              <Icon name="check_circle" className="text-sm align-middle" />{' '}
              Migration complete —{' '}
              {Object.entries(migrateResult.counts).map(([k, v]) => `${v} ${k}`).join(', ')}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleMigrate}
          disabled={migrating}
        >
          {migrating ? 'Importing…' : 'Run Import'}
        </Button>
      </div>

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
      ) : campaigns.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No campaigns found.</p>
      ) : (
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3">Name</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden sm:table-cell">Owner</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden md:table-cell">Members</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border-subtle/50 hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-mono text-sm text-text-primary">{c.name}</p>
                      {c.subtitle && <p className="font-mono text-[0.6rem] text-text-muted">{c.subtitle}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-[0.65rem] text-text-secondary">
                    {c.owner_name ?? <span className="text-text-muted italic">No owner</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-[0.65rem] text-text-secondary">
                    {c.member_count}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-[0.65rem] text-text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openReassign(c)}
                        className="font-mono text-[0.65rem] text-text-muted hover:text-accent-gold transition-colors"
                      >
                        Change Owner
                      </button>
                      <button
                        onClick={() => { setSelected(c); setModal('delete'); }}
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

      {/* Reassign owner modal */}
      <Modal open={modal === 'reassign'} onClose={() => setModal(null)} title="Change Campaign Owner">
        <p className="text-sm text-text-secondary mb-4">
          Reassign <span className="text-text-primary font-mono">{selected?.name}</span> to a different owner.
        </p>
        <Select
          label="New Owner"
          value={newOwnerId}
          onChange={(e) => setNewOwnerId(e.target.value)}
          options={[
            { value: '', label: '— No owner —' },
            ...users.map(u => ({
              value: u.id,
              label: u.display_name ? `${u.display_name} (${u.email})` : u.email,
            })),
          ]}
        />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleReassign} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete Campaign">
        <p className="text-sm text-text-secondary mb-4">
          Permanently delete <span className="text-text-primary font-mono">{selected?.name}</span> and all its data?
          This cannot be undone.
        </p>
        <ConfirmDelete onConfirm={handleDelete} onCancel={() => setModal(null)} />
      </Modal>
    </div>
  );
}
