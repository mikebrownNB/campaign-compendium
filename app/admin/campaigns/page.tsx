'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PageHeader, Button, ConfirmDelete, Select } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { SlideOut } from '@/components/SlideOut';
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

interface CampaignMember {
  user_id:      string;
  role:         'dm' | 'player';
  display_name: string | null;
  email:        string;
}

const ROLE_OPTS = [
  { value: 'player', label: 'Player' },
  { value: 'dm',     label: 'DM' },
];

export default function AdminCampaignsPage() {
  const [campaigns,    setCampaigns]    = useState<AdminCampaign[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [allowed,      setAllowed]      = useState(false);
  const [selected,     setSelected]     = useState<AdminCampaign | null>(null);
  const [modal,        setModal]        = useState<'delete' | 'reassign' | 'copy' | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [users,        setUsers]        = useState<AdminUser[]>([]);
  const [newOwnerId,   setNewOwnerId]   = useState<string>('');
  const [saving,       setSaving]       = useState(false);
  const [copyName,     setCopyName]     = useState('');
  const [copyDmId,     setCopyDmId]     = useState('');
  const [migrating,    setMigrating]    = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ counts: Record<string, number> } | null>(null);

  // Members slideout
  const [membersOpen,     setMembersOpen]     = useState(false);
  const [membersFor,      setMembersFor]      = useState<AdminCampaign | null>(null);
  const [members,         setMembers]         = useState<CampaignMember[]>([]);
  const [membersLoading,  setMembersLoading]  = useState(false);
  const [savingMember,    setSavingMember]    = useState<string | null>(null); // user_id being saved
  const [removingMember,  setRemovingMember]  = useState<string | null>(null);

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
    if (users.length === 0) {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    }
    setModal('reassign');
  };

  const openCopy = async (c: AdminCampaign) => {
    setSelected(c);
    setCopyName(`Copy of ${c.name}`);
    setCopyDmId('');
    if (users.length === 0) {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    }
    setModal('copy');
  };

  const handleCopy = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/admin/campaigns/${selected.id}/copy`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: copyName, dm_user_id: copyDmId }),
    });
    setSaving(false);
    if (res.ok) {
      const body = await res.json();
      setModal(null);
      await loadCampaigns();
      const dmLabel = users.find(u => u.id === copyDmId)?.display_name
        || users.find(u => u.id === copyDmId)?.email
        || 'selected DM';
      flash(`"${body.name}" created and assigned to ${dmLabel}.`, 'ok');
    } else {
      const body = await res.json();
      flash(body.error ?? 'Failed to copy campaign.', 'err');
    }
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

  // -- Members slideout --
  const openMembers = async (c: AdminCampaign) => {
    setMembersFor(c);
    setMembers([]);
    setMembersOpen(true);
    setMembersLoading(true);
    const res = await fetch(`/api/admin/campaigns/${c.id}/members`);
    if (res.ok) setMembers(await res.json());
    setMembersLoading(false);
  };

  const handleRoleChange = async (campaignId: string, userId: string, role: string) => {
    setSavingMember(userId);
    const res = await fetch(`/api/admin/campaigns/${campaignId}/members`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, role }),
    });
    if (res.ok) {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: role as 'dm' | 'player' } : m));
    }
    setSavingMember(null);
  };

  const handleRemoveMember = async (campaignId: string, userId: string) => {
    setRemovingMember(userId);
    const res = await fetch(`/api/admin/campaigns/${campaignId}/members?user_id=${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      // Update the member count in the table
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, member_count: c.member_count - 1 } : c));
      if (membersFor?.id === campaignId) setMembersFor(f => f ? { ...f, member_count: f.member_count - 1 } : f);
    }
    setRemovingMember(null);
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
                  <td className="px-4 py-3 hidden md:table-cell">
                    <button
                      onClick={() => openMembers(c)}
                      className="font-mono text-[0.65rem] text-accent-gold hover:text-accent-gold/70 underline underline-offset-2 transition-colors"
                      title="View members"
                    >
                      {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-[0.65rem] text-text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openCopy(c)}
                        className="font-mono text-[0.65rem] text-text-muted hover:text-accent-purple transition-colors"
                      >
                        Copy
                      </button>
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

      {/* ── Members slideout ── */}
      <SlideOut
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={membersFor?.name ?? 'Members'}
        subtitle={`${membersFor?.member_count ?? 0} member${(membersFor?.member_count ?? 0) !== 1 ? 's' : ''}`}
      >
        {membersLoading ? (
          <p className="text-text-muted font-mono text-sm">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-text-muted font-mono text-sm italic">No members in this campaign.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 bg-card border border-border-subtle rounded-lg px-4 py-3"
              >
                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-accent-purple/20 border border-accent-purple/30
                                flex items-center justify-center shrink-0 text-xs font-bold text-accent-purple font-mono">
                  {(m.display_name ?? m.email).charAt(0).toUpperCase()}
                </div>

                {/* Name / email */}
                <div className="flex-1 min-w-0">
                  {m.display_name && (
                    <p className="font-display text-sm font-bold text-text-primary truncate">{m.display_name}</p>
                  )}
                  <p className="font-mono text-[0.65rem] text-text-muted truncate">{m.email}</p>
                </div>

                {/* Role selector */}
                <div className="shrink-0 w-28">
                  <select
                    value={m.role}
                    disabled={savingMember === m.user_id}
                    onChange={(e) => membersFor && handleRoleChange(membersFor.id, m.user_id, e.target.value)}
                    className="w-full bg-deep border border-border-subtle rounded-lg px-2 py-1.5
                               text-text-primary font-mono text-xs focus:outline-none focus:border-accent-purple
                               disabled:opacity-50 cursor-pointer"
                  >
                    {ROLE_OPTS.map(o => (
                      <option key={o.value} value={o.value} style={{ background: '#1a1410', color: '#e8dcc8' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => membersFor && handleRemoveMember(membersFor.id, m.user_id)}
                  disabled={removingMember === m.user_id}
                  title="Remove from campaign"
                  className="shrink-0 text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                >
                  <Icon name="person_remove" className="text-base" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SlideOut>

      {/* Copy campaign modal */}
      <Modal open={modal === 'copy'} onClose={() => setModal(null)} title="Copy Campaign">
        <p className="text-sm text-text-secondary mb-4">
          Create a copy of{' '}
          <span className="text-text-primary font-mono">{selected?.name}</span>.
          The campaign settings and widgets will be copied. Members are not copied.
        </p>
        <div className="space-y-3">
          <div>
            <label className="font-mono text-[0.6rem] text-text-muted uppercase tracking-wider block mb-1">
              New Campaign Name
            </label>
            <input
              type="text"
              value={copyName}
              onChange={e => setCopyName(e.target.value)}
              className="w-full bg-deep border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-gold"
            />
          </div>
          <Select
            label="Assign DM"
            value={copyDmId}
            onChange={e => setCopyDmId(e.target.value)}
            options={[
              { value: '', label: '— Select a DM —' },
              ...users.map(u => ({
                value: u.id,
                label: u.display_name ? `${u.display_name} (${u.email})` : u.email,
              })),
            ]}
          />
        </div>
        {error && (
          <p className="mt-3 font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
            <Icon name="close" className="text-sm align-middle" /> {error}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleCopy} disabled={saving || !copyName.trim() || !copyDmId}>
            {saving ? 'Copying…' : 'Copy Campaign'}
          </Button>
        </div>
      </Modal>

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
