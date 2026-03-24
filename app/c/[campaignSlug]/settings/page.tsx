'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaign } from '@/lib/CampaignContext';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PageHeader, Button, Input, Textarea, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import type { CampaignMap, WidgetConfig, CalendarConfig } from '@/lib/types';
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          name: form.name,
          subtitle: form.subtitle,
          description: form.description,
          settings: { ...campaign.settings, tagline: form.tagline },
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
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
  const [members, setMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; display_name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<'dm' | 'player'>('player');
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    const [membersRes, usersRes] = await Promise.all([
      fetch(`/api/campaigns/${campaignId}/members`),
      fetch(`/api/campaigns/${campaignId}/available-users`),
    ]);
    const membersData = await membersRes.json();
    const usersData = await usersRes.json();
    setMembers(Array.isArray(membersData) ? membersData : []);
    setAvailableUsers(Array.isArray(usersData) ? usersData : []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAdd = async () => {
    if (!addUserId) return;
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${campaignId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: addUserId, role: addRole }),
      });
      setAddUserId('');
      setShowAdd(false);
      loadMembers();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await fetch(`/api/campaigns/${campaignId}/members?id=${id}`, { method: 'DELETE' });
    loadMembers();
  };

  const selectClass = "bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm";

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-accent-gold tracking-wider">Members</h3>
        <Button size="sm" onClick={() => { setShowAdd(!showAdd); setAddUserId(''); }}>+ Add Member</Button>
      </div>

      {showAdd && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4 flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">User</label>
            <select
              value={addUserId}
              onChange={e => setAddUserId(e.target.value)}
              className={selectClass}
            >
              <option value="">— select a user —</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.display_name ? `${u.display_name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Role</label>
            <select
              value={addRole}
              onChange={e => setAddRole(e.target.value as 'dm' | 'player')}
              className={selectClass}
            >
              <option value="player">Player</option>
              <option value="dm">DM</option>
            </select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving || !addUserId}>{saving ? '...' : 'Add'}</Button>
        </div>
      )}

      {loading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-deep/30 rounded-lg px-4 py-2">
              <div>
                <span className="font-mono text-sm text-text-primary">{m.display_name || m.user_id}</span>
                {m.email && (
                  <span className="ml-2 font-mono text-[0.6rem] text-text-muted">{m.email}</span>
                )}
                <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-wider text-text-muted border border-border-subtle rounded px-2 py-0.5">
                  {m.role}
                </span>
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors"
              >
                Remove
              </button>
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
function WidgetsTab({ campaign }: { campaign: any }) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(campaign.settings?.widgets ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', fields: '' });
  const [saving, setSaving] = useState(false);

  const save = async (updated: WidgetConfig[]) => {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          settings: { ...campaign.settings, widgets: updated },
        }),
      });
      setWidgets(updated);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const fieldPairs = form.fields.split(',').map(f => f.trim()).filter(Boolean);
    const fields = fieldPairs.map(f => ({ label: f, value: '0' }));
    const newWidget: WidgetConfig = {
      id: crypto.randomUUID(),
      type: 'stat-tracker',
      name: form.name,
      fields,
    };
    await save([...widgets, newWidget]);
    setForm({ name: '', fields: '' });
    setShowAdd(false);
  };

  const handleRemove = async (id: string) => {
    await save(widgets.filter(w => w.id !== id));
  };

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-accent-gold tracking-wider">Dashboard Widgets</h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Widget</Button>
      </div>

      {showAdd && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4">
          <Input label="Widget Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. The Wayward Wiggle" />
          <Input label="Stat Fields (comma separated)" value={form.fields} onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} placeholder="HP, AC, Speed, Damage" />
          <p className="font-mono text-[0.55rem] text-text-muted mb-3">Creates a stat-tracker widget with editable values on the dashboard.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? '...' : 'Add Widget'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {widgets.length === 0 ? (
          <p className="text-text-muted text-sm">No widgets configured.</p>
        ) : widgets.map(w => (
          <div key={w.id} className="flex items-center justify-between bg-deep/30 rounded-lg px-4 py-3">
            <div>
              <span className="font-display text-sm text-text-primary">{w.name}</span>
              <span className="ml-2 font-mono text-[0.55rem] text-text-muted">
                {w.type} — {w.fields.map(f => f.label).join(', ')}
              </span>
            </div>
            <button
              onClick={() => handleRemove(w.id)}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
