'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaign } from '@/lib/CampaignContext';
import { PageHeader, Button, Input, Textarea, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import type { CampaignMap, WidgetConfig } from '@/lib/types';

export default function CampaignSettingsPage() {
  const router = useRouter();
  const { campaign, isDM, maps: initialMaps } = useCampaign();

  // Redirect non-DMs
  if (!isDM) {
    return (
      <div className="animate-fade-in text-center py-16">
        <span className="text-4xl block mb-3">🔒</span>
        <p className="text-text-muted">Only the DM can access campaign settings.</p>
      </div>
    );
  }

  return <SettingsContent campaign={campaign} initialMaps={initialMaps} />;
}

function SettingsContent({ campaign, initialMaps }: { campaign: any; initialMaps: CampaignMap[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'maps' | 'widgets'>('general');

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader icon="🛠️" title="Campaign Settings" subtitle={campaign.name} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-subtle pb-px">
        {(['general', 'members', 'maps', 'widgets'] as const).map(tab => (
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

      {activeTab === 'general' && <GeneralTab campaign={campaign} />}
      {activeTab === 'members' && <MembersTab campaignId={campaign.id} />}
      {activeTab === 'maps' && <MapsTab campaignId={campaign.id} initialMaps={initialMaps} />}
      {activeTab === 'widgets' && <WidgetsTab campaign={campaign} />}
    </div>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────────
function GeneralTab({ campaign }: { campaign: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: campaign.name,
    subtitle: campaign.subtitle,
    description: campaign.description,
    tagline: campaign.settings?.tagline || '',
  });
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <Input label="Campaign Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Input label="Subtitle" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. campaign world name" />
      <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <Input label="Tagline" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Optional motto or quote" />
      <div className="mt-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}

// ── Members Tab ────────────────────────────────────────────────────────────────
function MembersTab({ campaignId }: { campaignId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<'dm' | 'player'>('player');
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/members`);
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAdd = async () => {
    if (!addUserId.trim()) return;
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

  return (
    <div className="bg-card border border-border-subtle rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-accent-gold tracking-wider">Members</h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Member</Button>
      </div>

      {showAdd && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <Input label="User ID" value={addUserId} onChange={e => setAddUserId(e.target.value)} placeholder="Paste the user's ID" />
          </div>
          <select
            value={addRole}
            onChange={e => setAddRole(e.target.value as 'dm' | 'player')}
            className="bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm mb-3"
          >
            <option value="player">Player</option>
            <option value="dm">DM</option>
          </select>
          <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? '...' : 'Add'}</Button>
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
  const [form, setForm] = useState({ slug: '', name: '', image_url: '', description: '' });
  const [saving, setSaving] = useState(false);

  const loadMaps = async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/maps`);
    const data = await res.json();
    setMaps(Array.isArray(data) ? data : []);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.image_url.trim()) return;
    setSaving(true);
    const slug = form.slug.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      await fetch(`/api/campaigns/${campaignId}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug, sort_order: maps.length }),
      });
      setForm({ slug: '', name: '', image_url: '', description: '' });
      setShowAdd(false);
      loadMaps();
    } finally {
      setSaving(false);
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
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Map</Button>
      </div>

      {showAdd && (
        <div className="bg-deep/50 rounded-lg p-4 mb-4">
          <Input label="Map Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. World Map" />
          <Input label="URL Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="world-map (auto-generated if blank)" />
          <Input label="Image URL" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="/maps/world-map.jpg" />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? '...' : 'Add Map'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {maps.length === 0 ? (
          <p className="text-text-muted text-sm">No maps configured. Add a map above.</p>
        ) : maps.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-deep/30 rounded-lg px-4 py-3">
            <div>
              <span className="font-display text-sm text-text-primary">{m.name}</span>
              <span className="ml-2 font-mono text-[0.55rem] text-text-muted">{m.image_url}</span>
            </div>
            <button
              onClick={() => handleDelete(m.id)}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-red transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
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
