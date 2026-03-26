'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaign } from '@/lib/CampaignContext';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PageHeader, Button, Input, Textarea, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import type { CampaignMap, WidgetConfig, CalendarConfig, SpelljammerWeapon } from '@/lib/types';
import { DEFAULT_CALENDAR } from '@/lib/types';

export default function CampaignSettingsPage() {
  const router = useRouter();
  const { campaign, isDM, maps: initialMaps } = useCampaign();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Redirect non-DMs
  if (!isDM) {
    return (
      <div className="animate-fade-in text-center py-16">
        <Icon name="lock" className="text-4xl block mb-3" />
        <p className="text-text-muted">Only the DM can access campaign settings.</p>
      </div>
    );
  }

  const isOwner = userId !== null && userId === campaign.owner_id;

  return <SettingsContent campaign={campaign} initialMaps={initialMaps} isOwner={isOwner} />;
}

function SettingsContent({ campaign, initialMaps, isOwner }: { campaign: any; initialMaps: CampaignMap[]; isOwner: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'maps' | 'calendar' | 'widgets'>('general');

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader icon="settings_applications" title="Campaign Settings" subtitle={campaign.name} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-subtle pb-px">
        {(['general', 'members', 'maps', 'calendar', 'widgets'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`font-display text-xs tracking-wider uppercase px-4 py-2 rounded-t-lg transition-colors
              ${activeTab === tab ? 'bg-card border border-b-0 border-border-subtle text-accent-gold' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'general'  && <GeneralTab campaign={campaign} isOwner={isOwner} />}
      {activeTab === 'members'  && <MembersTab campaignId={campaign.id} />}
      {activeTab === 'maps'     && <MapsTab campaignId={campaign.id} initialMaps={initialMaps} />}
      {activeTab === 'calendar' && <CalendarTab campaign={campaign} />}
      {activeTab === 'widgets'  && <WidgetsTab campaign={campaign} />}
    </div>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────────
function GeneralTab({ campaign, isOwner }: { campaign: any; isOwner: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: campaign.name,
    subtitle: campaign.subtitle,
    description: campaign.description,
    tagline: campaign.settings?.tagline || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Favicon upload state
  const [faviconUrl, setFaviconUrl] = useState<string>(campaign.settings?.favicon_url || '');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>(campaign.settings?.favicon_url || '');
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleFaviconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconFile(file);
    setFaviconPreview(URL.createObjectURL(file));
  };

  const uploadFavicon = async (): Promise<string | null> => {
    if (!faviconFile) return faviconUrl || null;
    const supabase = getSupabaseBrowser();
    const ext = faviconFile.name.split('.').pop() ?? 'png';
    const path = `${campaign.id}/favicon_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('maps').upload(path, faviconFile);
    if (error) { console.error('Favicon upload failed:', error); return faviconUrl || null; }
    const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(path);
    return publicUrl;
  };

  const removeFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview('');
    setFaviconUrl('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      setUploadingFavicon(!!faviconFile);
      const newFaviconUrl = await uploadFavicon();
      setUploadingFavicon(false);
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          name: form.name,
          subtitle: form.subtitle,
          description: form.description,
          settings: { ...campaign.settings, tagline: form.tagline, favicon_url: newFaviconUrl || undefined },
        }),
      });
      if (newFaviconUrl) setFaviconUrl(newFaviconUrl);
      setFaviconFile(null);
      router.refresh();
    } finally {
      setSaving(false);
      setUploadingFavicon(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push('/');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border-subtle rounded-lg p-6">
        <Input label="Campaign Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Subtitle" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. campaign world name" />
        <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Input label="Tagline" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Optional motto or quote" />

        {/* Favicon Upload */}
        <div className="mt-4">
          <label className="block font-display text-xs tracking-wider uppercase text-text-muted mb-1">
            Tab Icon (Favicon)
          </label>
          <p className="text-text-muted font-mono text-[0.65rem] mb-2">
            Upload a small image (ICO, PNG, SVG) to show in the browser tab for this campaign.
          </p>
          <div className="flex items-center gap-4">
            {faviconPreview ? (
              <div className="relative shrink-0">
                <img
                  src={faviconPreview}
                  alt="Favicon preview"
                  className="w-10 h-10 rounded border border-border-subtle object-contain bg-surface"
                />
                <button
                  type="button"
                  onClick={removeFavicon}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent-red text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                  title="Remove favicon"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 rounded border border-dashed border-border-subtle flex items-center justify-center text-text-muted shrink-0">
                <Icon name="image" className="text-lg" />
              </div>
            )}
            <label className="cursor-pointer text-xs font-mono text-accent-gold hover:text-accent-gold/80 transition-colors border border-border-subtle rounded px-3 py-1.5 hover:bg-card-hover">
              {faviconPreview ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/ico,image/vnd.microsoft.icon,.ico,.png,.svg"
                onChange={handleFaviconSelect}
                className="hidden"
              />
            </label>
            {uploadingFavicon && <span className="text-xs text-text-muted font-mono">Uploading…</span>}
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>

        {isOwner && (
          <div className="mt-8 pt-6 border-t border-accent-red/20">
            <h4 className="font-display text-xs text-accent-red tracking-wider uppercase mb-1">Danger Zone</h4>
            <p className="text-text-muted font-mono text-[0.65rem] mb-3">
              Permanently delete this campaign and all its data. This cannot be undone.
            </p>
            <Button variant="danger" onClick={() => { setDeleteModal(true); setDeleteConfirm(''); setDeleteError(null); }}>
              Delete Campaign
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={deleteModal}
        onClose={() => { setDeleteModal(false); setDeleteConfirm(''); setDeleteError(null); }}
        title="Delete Campaign"
      >
        <p className="text-text-secondary text-sm mb-4">
          This will permanently delete{' '}
          <strong className="text-accent-gold">{campaign.name}</strong>{' '}
          and all its data — NPCs, locations, sessions, maps, and everything else. This cannot be undone.
        </p>
        <p className="font-mono text-[0.65rem] text-text-muted mb-2">
          Type <span className="text-text-primary font-bold">{campaign.name}</span> to confirm:
        </p>
        <Input
          label=""
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          placeholder={campaign.name}
        />
        {deleteError && (
          <p className="mt-2 font-mono text-xs text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
            <Icon name="close" className="text-sm align-middle" /> {deleteError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => { setDeleteModal(false); setDeleteConfirm(''); setDeleteError(null); }}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteConfirm !== campaign.name || deleting}
          >
            {deleting ? 'Deleting…' : 'Delete Campaign'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Members Tab ────────────────────────────────────────────────────────────────
function MembersTab({ campaignId }: { campaignId: string }) {
  const [members,       setMembers]       = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteRole,    setInviteRole]    = useState<'dm' | 'player'>('player');
  const [inviting,      setInviting]      = useState(false);
  const [inviteResult,  setInviteResult]  = useState<{ action: 'added' | 'invited'; email: string } | null>(null);
  const [inviteErr,     setInviteErr]     = useState<string | null>(null);

  // Per-row role-edit state
  const [editingRoleId,  setEditingRoleId]  = useState<string | null>(null);
  const [editingRoleVal, setEditingRoleVal] = useState<'dm' | 'player'>('player');

  const selectClass = 'bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm';

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/members`);
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const closeInvite = () => {
    setShowInvite(false);
    setInviteEmail('');
    setInviteErr(null);
    setInviteResult(null);
  };

  const handleInvite = async () => {
    setInviteErr(null);
    setInviteResult(null);
    if (!inviteEmail.trim()) { setInviteErr('Email address is required.'); return; }
    setInviting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/members/invite`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const body = await res.json();
      if (!res.ok) {
        setInviteErr(body.error ?? 'Failed to send invite.');
        return;
      }
      setInviteResult({ action: body.action, email: inviteEmail.trim() });
      setInviteEmail('');
      loadMembers();
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    await fetch(`/api/campaigns/${campaignId}/members?id=${id}`, { method: 'DELETE' });
    loadMembers();
  };

  const handleRoleChange = async (memberId: string) => {
    await fetch(`/api/campaigns/${campaignId}/members`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: memberId, role: editingRoleVal }),
    });
    setEditingRoleId(null);
    loadMembers();
  };

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-accent-gold tracking-wider">
          Members {!loading && <span className="text-text-muted font-mono text-[0.6rem]">({members.length})</span>}
        </h3>
        <Button size="sm" onClick={() => { if (showInvite) closeInvite(); else setShowInvite(true); }}>
          {showInvite ? 'Cancel' : '+ Invite Member'}
        </Button>
      </div>

      {/* ── Invite form ── */}
      {showInvite && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4 border border-border-subtle/50 flex flex-col gap-3">
          <div>
            <p className="font-mono text-[0.65rem] text-text-muted leading-relaxed">
              Enter an email address. If they already have an account they&apos;ll be added directly.
              Otherwise they&apos;ll receive an invitation to sign up and join.
            </p>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInvite(); } }}
                placeholder="player@example.com"
                className={selectClass + ' w-full'}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'dm' | 'player')} className={selectClass}>
                <option value="player">Player</option>
                <option value="dm">DM</option>
              </select>
            </div>
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>

          {inviteErr && (
            <p className="font-mono text-[0.6rem] text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2">
              <Icon name="close" className="text-xs align-middle" /> {inviteErr}
            </p>
          )}
          {inviteResult && (
            <p className="font-mono text-[0.6rem] text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-3 py-2">
              <Icon name="check_circle" className="text-xs align-middle" />{' '}
              {inviteResult.action === 'invited'
                ? `Invitation sent to ${inviteResult.email}. They'll join when they accept.`
                : `${inviteResult.email} already has an account and has been added to the campaign.`}
            </p>
          )}
        </div>
      )}

      {/* ── Member list ── */}
      {loading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-text-muted font-mono text-sm text-center py-6">No members yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-deep/30 rounded-lg px-4 py-2 gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-sm text-text-primary">{m.display_name || <span className="text-text-muted italic">Pending</span>}</span>
                {m.email && (
                  <span className="ml-2 font-mono text-[0.6rem] text-text-muted">{m.email}</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {editingRoleId === m.id ? (
                  <>
                    <select
                      value={editingRoleVal}
                      onChange={e => setEditingRoleVal(e.target.value as 'dm' | 'player')}
                      className="bg-deep border border-border-subtle rounded px-2 py-1 font-mono text-[0.65rem] text-text-primary"
                      autoFocus
                    >
                      <option value="player">Player</option>
                      <option value="dm">DM</option>
                    </select>
                    <button onClick={() => handleRoleChange(m.id)}
                      className="font-mono text-[0.6rem] text-accent-gold hover:text-accent-gold/70 transition-colors">
                      Save
                    </button>
                    <button onClick={() => setEditingRoleId(null)}
                      className="font-mono text-[0.6rem] text-text-muted hover:text-text-primary transition-colors">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingRoleId(m.id); setEditingRoleVal(m.role); }}
                      className="font-mono text-[0.6rem] uppercase tracking-wider text-text-muted border border-border-subtle rounded px-2 py-0.5 hover:border-accent-gold/40 hover:text-accent-gold transition-colors"
                      title="Click to change role"
                    >
                      {m.role}
                    </button>
                    <button onClick={() => handleRemove(m.id)}
                      className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors">
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Maps Tab ───────────────────────────────────────────────────────────────────
function MapsTab({ campaignId, initialMaps }: { campaignId: string; initialMaps: CampaignMap[] }) {
  const [maps, setMaps] = useState(initialMaps);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-map image-replace state
  const [replacingId, setReplacingId]   = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const loadMaps = async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/maps`);
    const data = await res.json();
    setMaps(Array.isArray(data) ? data : []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !file) { setUploadError('Map name and image are required.'); return; }
    setUploading(true); setUploadError(null);
    try {
      const supabase = getSupabaseBrowser();
      const ext = file.name.split('.').pop();
      const path = `${campaignId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('maps').upload(path, file);
      if (uploadErr) { setUploadError(uploadErr.message); return; }

      const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(path);
      const slug = form.slug.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      await fetch(`/api/campaigns/${campaignId}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, slug, image_url: publicUrl, description: form.description, sort_order: maps.length }),
      });

      setForm({ slug: '', name: '', description: '' });
      setFile(null); setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowAdd(false);
      loadMaps();
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceImage = async (mapId: string, newFile: File) => {
    setReplacingId(mapId); setReplaceError(null);
    try {
      const supabase = getSupabaseBrowser();
      const ext = newFile.name.split('.').pop();
      const path = `${campaignId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('maps').upload(path, newFile);
      if (uploadErr) { setReplaceError(uploadErr.message); return; }

      const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(path);

      await fetch(`/api/campaigns/${campaignId}/maps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mapId, image_url: publicUrl }),
      });

      loadMaps();
    } finally {
      setReplacingId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/campaigns/${campaignId}/maps?id=${id}`, { method: 'DELETE' });
    loadMaps();
  };

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-accent-gold tracking-wider">Campaign Maps</h3>
        <Button size="sm" onClick={() => { setShowAdd(!showAdd); setUploadError(null); }}>+ Add Map</Button>
      </div>

      {showAdd && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4">
          <Input label="Map Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. World Map" />
          <Input label="URL Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="world-map (auto-generated if blank)" />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          <div className="flex flex-col gap-1 mb-3">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Map Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="font-mono text-xs text-text-secondary file:mr-3 file:font-mono file:text-xs file:bg-deep file:border file:border-border-subtle file:rounded file:px-2 file:py-1 file:text-text-primary file:cursor-pointer"
            />
            {preview && (
              <img src={preview} alt="Preview" className="mt-2 h-24 w-auto rounded border border-border-subtle object-cover" />
            )}
          </div>
          {uploadError && (
            <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 mb-2"><Icon name="close" className="text-sm align-middle" /> {uploadError}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAdd} disabled={uploading}>{uploading ? 'Uploading…' : 'Add Map'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Hidden file input used for image replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          const id = replaceInputRef.current?.dataset.mapId;
          if (f && id) handleReplaceImage(id, f);
        }}
      />

      {replaceError && (
        <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 mb-3">
          <Icon name="close" className="text-sm align-middle" /> {replaceError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {maps.length === 0 ? (
          <p className="text-text-muted text-sm">No maps configured. Add a map above.</p>
        ) : maps.map(m => (
          <div key={m.id} className="flex items-center gap-3 bg-deep/30 rounded-lg px-4 py-3">
            {/* Thumbnail */}
            <div className="w-14 h-10 rounded border border-border-subtle overflow-hidden shrink-0 bg-deep flex items-center justify-center">
              {m.image_url
                ? <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                : <Icon name="image" className="text-text-muted text-lg" />
              }
            </div>

            {/* Name + slug */}
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-text-primary">{m.name}</p>
              <p className="font-mono text-[0.55rem] text-text-muted truncate">{m.image_url || 'No image set'}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  if (replaceInputRef.current) {
                    replaceInputRef.current.dataset.mapId = m.id;
                    replaceInputRef.current.click();
                  }
                }}
                disabled={replacingId === m.id}
                className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors disabled:opacity-40"
              >
                {replacingId === m.id ? 'Uploading…' : m.image_url ? 'Change Image' : 'Upload Image'}
              </button>
              <button
                onClick={() => handleDelete(m.id)}
                className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────────────────────────────────────
const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;

function CalendarTab({ campaign }: { campaign: any }) {
  const router = useRouter();

  const initCalendar = (): CalendarConfig => {
    const base = campaign.settings?.calendar ?? DEFAULT_CALENDAR;
    return {
      months:       base.months.map((m: { name: string; season: string }) => ({ ...m })),
      daysPerMonth: base.daysPerMonth,
      weekdays:     [...base.weekdays],
    };
  };

  const [cal,     setCal]     = useState<CalendarConfig>(initCalendar);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const setMonth = (i: number, field: 'name' | 'season', value: string) => {
    setCal(c => {
      const months = c.months.map((m, idx) => idx === i ? { ...m, [field]: value } : m);
      return { ...c, months };
    });
  };

  const addMonth = () => {
    setCal(c => ({
      ...c,
      months: [...c.months, { name: `Month ${c.months.length + 1}`, season: 'spring' }],
    }));
  };

  const removeMonth = (i: number) => {
    setCal(c => ({ ...c, months: c.months.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    setSaving(true); setSaved(false); setSaveErr(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:       campaign.id,
          settings: { ...campaign.settings, calendar: cal },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveErr(body.error ?? `HTTP ${res.status}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "bg-deep border border-border-subtle rounded-lg px-2 py-1.5 text-text-primary font-body text-sm";

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6 flex flex-col gap-6">
      <h3 className="font-display text-sm text-accent-gold tracking-wider">Custom Calendar</h3>

      {/* Days per month + weekdays */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Days per Month</label>
          <input
            type="number"
            min={1}
            max={365}
            value={cal.daysPerMonth}
            onChange={e => setCal(c => ({ ...c, daysPerMonth: Math.max(1, parseInt(e.target.value) || 1) }))}
            className="bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
            Weekdays <span className="normal-case text-text-muted">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={cal.weekdays.join(', ')}
            onChange={e => setCal(c => ({
              ...c,
              weekdays: e.target.value.split(',').map(w => w.trim()).filter(Boolean),
            }))}
            placeholder="Mon, Tue, Wed, Thu, Fri, Sat, Sun"
            className="bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm w-full"
          />
          <p className="font-mono text-[0.55rem] text-text-muted">{cal.weekdays.length} day week</p>
        </div>
      </div>

      {/* Month list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">
            Months <span className="normal-case">({cal.months.length})</span>
          </label>
          <button
            onClick={addMonth}
            className="font-mono text-[0.65rem] text-accent-gold hover:text-accent-gold/80 transition-colors"
          >
            + Add Month
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {cal.months.map((m, i) => (
            <div key={i} className="flex items-center gap-2 bg-deep/40 rounded-lg px-3 py-2">
              {/* Number badge */}
              <span className="font-mono text-[0.6rem] text-text-muted w-5 text-right shrink-0">{i + 1}</span>

              {/* Name */}
              <input
                type="text"
                value={m.name}
                onChange={e => setMonth(i, 'name', e.target.value)}
                placeholder={`Month ${i + 1}`}
                className="flex-1 min-w-0 bg-deep border border-border-subtle rounded px-2 py-1 text-text-primary font-body text-sm"
              />

              {/* Season */}
              <select
                value={m.season}
                onChange={e => setMonth(i, 'season', e.target.value)}
                className={`${selectClass} shrink-0`}
              >
                {SEASONS.map(s => (
                  <option key={s} value={s} style={{ background: '#1a1410' }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>

              {/* Remove */}
              <button
                onClick={() => removeMonth(i)}
                disabled={cal.months.length <= 1}
                title="Remove month"
                className="text-text-muted hover:text-accent-red transition-colors disabled:opacity-20 shrink-0"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-deep/40 rounded-lg px-4 py-3 font-mono text-[0.65rem] text-text-muted leading-relaxed">
        <p className="text-text-secondary mb-1 font-bold">Preview</p>
        <p>
          <span className="text-accent-gold">{cal.months.length}</span> months ×{' '}
          <span className="text-accent-gold">{cal.daysPerMonth}</span> days ={' '}
          <span className="text-accent-gold">{cal.months.length * cal.daysPerMonth}</span> days/year
          {cal.weekdays.length > 0 && (
            <> · <span className="text-accent-gold">{cal.weekdays.length}</span>-day weeks</>
          )}
        </p>
        <p className="mt-1">{cal.months.map(m => m.name).join(' · ')}</p>
      </div>

      {saveErr && (
        <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
          <Icon name="close" className="text-sm align-middle" /> {saveErr}
        </p>
      )}
      {saved && (
        <p className="font-mono text-[0.65rem] text-green-400 bg-green-400/10 border border-green-400/30 rounded px-3 py-2">
          <Icon name="check_circle" className="text-sm align-middle" /> Calendar saved.
        </p>
      )}

      <div>
        <Button onClick={handleSave} disabled={saving || cal.months.length === 0}>
          {saving ? 'Saving…' : 'Save Calendar'}
        </Button>
      </div>
    </div>
  );
}

// ── Widgets Tab ────────────────────────────────────────────────────────────────
type WidgetFormWeapon = { id: string; name: string; hitModifier: string; damage: string };
type WidgetForm = {
  type: 'stat-tracker' | 'spelljammer';
  name: string;
  fields: string;
  currentHp: string;
  maxHp: string;
  ac: string;
  speed: string;
  damageThreshold: string;
  description: string;
  weapons: WidgetFormWeapon[];
};

const EMPTY_FORM: WidgetForm = {
  type: 'spelljammer',
  name: '',
  fields: '',
  currentHp: '100',
  maxHp: '100',
  ac: '15',
  speed: '35',
  damageThreshold: '0',
  description: '',
  weapons: [],
};

function widgetToForm(w: WidgetConfig): WidgetForm {
  if (w.type === 'stat-tracker') {
    return { ...EMPTY_FORM, type: 'stat-tracker', name: w.name, fields: w.fields.map(f => f.label).join(', ') };
  }
  return {
    ...EMPTY_FORM,
    type: 'spelljammer',
    name: w.name,
    currentHp: String(w.currentHp),
    maxHp: String(w.maxHp),
    ac: String(w.ac),
    speed: String(w.speed),
    damageThreshold: String(w.damageThreshold),
    description: w.description ?? '',
    weapons: w.weapons.map(ww => ({ id: ww.id, name: ww.name, hitModifier: String(ww.hitModifier), damage: ww.damage })),
  };
}

function formToWidget(form: WidgetForm, id: string, existing?: WidgetConfig): WidgetConfig {
  if (form.type === 'stat-tracker') {
    const newLabels = form.fields.split(',').map(f => f.trim()).filter(Boolean);
    const valueMap = Object.fromEntries(
      (existing?.type === 'stat-tracker' ? existing.fields : []).map(f => [f.label, f.value])
    );
    return {
      id, type: 'stat-tracker',
      name: form.name.trim() || 'Widget',
      fields: newLabels.map(label => ({ label, value: valueMap[label] ?? '0' })),
    };
  }
  return {
    id, type: 'spelljammer',
    name: form.name.trim() || 'Ship',
    currentHp: parseInt(form.currentHp) || parseInt(form.maxHp) || 100,
    maxHp: parseInt(form.maxHp) || 100,
    ac: parseInt(form.ac) || 15,
    speed: parseInt(form.speed) || 35,
    damageThreshold: parseInt(form.damageThreshold) || 0,
    description: form.description.trim(),
    weapons: form.weapons
      .filter(w => w.name.trim())
      .map(w => ({ id: w.id, name: w.name.trim(), hitModifier: parseInt(w.hitModifier) || 0, damage: w.damage.trim() || '1d6' })) as SpelljammerWeapon[],
  };
}

// Shared form fields used by both add and edit panels
function WidgetFormFields({
  form,
  setForm,
}: {
  form: WidgetForm;
  setForm: (v: WidgetForm | ((p: WidgetForm) => WidgetForm)) => void;
}) {
  const addWeapon = () =>
    setForm(f => ({ ...f, weapons: [...f.weapons, { id: crypto.randomUUID(), name: '', hitModifier: '0', damage: '1d6' }] }));
  const updateWeapon = (id: string, ch: Partial<WidgetFormWeapon>) =>
    setForm(f => ({ ...f, weapons: f.weapons.map(w => w.id === id ? { ...w, ...ch } : w) }));
  const removeWeapon = (id: string) =>
    setForm(f => ({ ...f, weapons: f.weapons.filter(w => w.id !== id) }));

  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider mb-2">Widget Type</p>
        <div className="flex gap-2">
          {(['stat-tracker', 'spelljammer'] as const).map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`font-mono text-[0.65rem] border rounded px-3 py-1.5 transition-colors ${
                form.type === t ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold' : 'border-border-subtle text-text-muted hover:text-text-primary'
              }`}>
              {t === 'stat-tracker' ? 'Stat Tracker' : '⚓ Spelljammer Ship'}
            </button>
          ))}
        </div>
      </div>

      <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder={form.type === 'spelljammer' ? 'e.g. Heart of Stars' : 'e.g. Party Stats'} />

      {form.type === 'stat-tracker' ? (
        <>
          <Input label="Stat Fields (comma separated)" value={form.fields}
            onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} placeholder="HP, AC, Speed, Damage" />
          <p className="font-mono text-[0.55rem] text-text-muted">Creates a widget with editable stat values on the dashboard.</p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Current HP" value={form.currentHp} onChange={e => setForm(f => ({ ...f, currentHp: e.target.value }))} placeholder="100" />
            <Input label="Max HP" value={form.maxHp} onChange={e => setForm(f => ({ ...f, maxHp: e.target.value }))} placeholder="100" />
            <Input label="AC" value={form.ac} onChange={e => setForm(f => ({ ...f, ac: e.target.value }))} placeholder="15" />
            <Input label="Speed" value={form.speed} onChange={e => setForm(f => ({ ...f, speed: e.target.value }))} placeholder="35" />
            <div className="col-span-2">
              <Input label="Damage Threshold" value={form.damageThreshold}
                onChange={e => setForm(f => ({ ...f, damageThreshold: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <Input label="Description (optional)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A mighty vessel of the astral sea…" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">Weapons</p>
              <button onClick={addWeapon} className="font-mono text-[0.6rem] text-accent-gold hover:text-accent-gold/70 transition-colors">
                + Add Weapon
              </button>
            </div>
            {form.weapons.length > 0 && (
              <div className="grid grid-cols-[1fr_64px_80px_24px] gap-1 mb-1">
                {['Name', 'Hit Mod', 'Damage', ''].map((h, i) => (
                  <span key={i} className="font-mono text-[0.48rem] text-text-muted uppercase px-1">{h}</span>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {form.weapons.map(w => (
                <div key={w.id} className="grid grid-cols-[1fr_64px_80px_24px] gap-1 items-center">
                  <input value={w.name} onChange={e => updateWeapon(w.id, { name: e.target.value })}
                    placeholder="Ballista" className="bg-deep/70 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-gold" />
                  <input type="number" value={w.hitModifier} onChange={e => updateWeapon(w.id, { hitModifier: e.target.value })}
                    className="bg-deep/70 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-gold text-center" />
                  <input value={w.damage} onChange={e => updateWeapon(w.id, { damage: e.target.value })}
                    placeholder="3d10" className="bg-deep/70 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-gold text-center" />
                  <button onClick={() => removeWeapon(w.id)}
                    className="text-text-muted hover:text-accent-red font-mono text-base leading-none transition-colors">×</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WidgetsTab({ campaign }: { campaign: any }) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(campaign.settings?.widgets ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<WidgetForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WidgetForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const save = async (updated: WidgetConfig[]) => {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id, settings: { ...campaign.settings, widgets: updated } }),
      });
      setWidgets(updated);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await save([...widgets, formToWidget(form, crypto.randomUUID())]);
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const existing = widgets.find(w => w.id === editingId);
    await save(widgets.map(w => w.id === editingId ? formToWidget(editForm, editingId, existing) : w));
    setEditingId(null);
  };

  const handleRemove = async (id: string) => {
    if (editingId === id) setEditingId(null);
    await save(widgets.filter(w => w.id !== id));
  };

  const startEdit = (w: WidgetConfig) => {
    setEditingId(w.id);
    setEditForm(widgetToForm(w));
    setShowAdd(false);
  };

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-accent-gold tracking-wider">Dashboard Widgets</h3>
        <Button size="sm" onClick={() => { setShowAdd(s => !s); setForm(EMPTY_FORM); setEditingId(null); }}>
          + Add Widget
        </Button>
      </div>

      {showAdd && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4">
          <WidgetFormFields form={form} setForm={setForm} />
          <div className="flex gap-2 pt-3 mt-3 border-t border-border-subtle">
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? '...' : 'Add Widget'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {widgets.length === 0 ? (
          <p className="text-text-muted text-sm">No widgets configured.</p>
        ) : widgets.map(w => (
          <div key={w.id} className="bg-deep/30 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-display text-sm text-text-primary">{w.name}</span>
                <span className="ml-2 font-mono text-[0.55rem] text-text-muted">
                  {w.type === 'stat-tracker'
                    ? `stat-tracker — ${w.fields.map(f => f.label).join(', ')}`
                    : `spelljammer — ${w.maxHp} HP, AC ${w.ac}, ${w.weapons.length} weapon${w.weapons.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => editingId === w.id ? setEditingId(null) : startEdit(w)}
                  className={`font-mono text-[0.6rem] transition-colors ${editingId === w.id ? 'text-accent-gold' : 'text-text-muted hover:text-accent-gold'}`}
                >
                  {editingId === w.id ? 'Cancel' : 'Edit'}
                </button>
                <button onClick={() => handleRemove(w.id)}
                  className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors">
                  Remove
                </button>
              </div>
            </div>

            {editingId === w.id && (
              <div className="border-t border-border-subtle px-4 py-4 bg-deep/20">
                <WidgetFormFields form={editForm} setForm={setEditForm} />
                <div className="flex gap-2 pt-3 mt-3 border-t border-border-subtle">
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>{saving ? '...' : 'Save Changes'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
