'use client';

import { useState, useMemo } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { NPC, NpcStatus, Faction } from '@/lib/types';
import { PageHeader, Button, Tag, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { SlideOut } from '@/components/SlideOut';
import { Icon } from '@/components/Icon';

const STATUS_OPTIONS: NpcStatus[] = ['Alive', 'Deceased', 'Unknown'];

const statusStyle: Record<NpcStatus, string> = {
  Alive:    'text-green-400 bg-green-400/10 border-green-400/30',
  Deceased: 'text-accent-red bg-accent-red/10 border-accent-red/30',
  Unknown:  'text-text-muted bg-card border-border-subtle',
};

const empty = { name: '', role: '', faction: '', location: '', description: '', tags: [] as string[], status: 'Unknown' as NpcStatus };

type SortKey = 'name' | 'role' | 'faction' | 'location';
type SortDir = 'asc' | 'desc';

export default function NPCsPage() {
  const { items, loading, create, update, remove } = useCampaignCrud<NPC>('npcs');
  const { items: factions } = useCampaignCrud<Faction>('factions');

  // Slideout state
  const [slideOpen, setSlideOpen] = useState(false);
  const [form,      setForm]      = useState(empty);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search & filter
  const [search,         setSearch]         = useState('');
  const [filterFaction,  setFilterFaction]  = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterRole,     setFilterRole]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const uniqueFactions  = useMemo(() => Array.from(new Set(items.map(n => n.faction).filter(Boolean) as string[])).sort(), [items]);
  const uniqueLocations = useMemo(() => Array.from(new Set(items.map(n => n.location).filter(Boolean) as string[])).sort(), [items]);
  const uniqueRoles     = useMemo(() => Array.from(new Set(items.map(n => n.role).filter(Boolean))).sort(), [items]);

  const processed = useMemo(() => {
    const q = search.toLowerCase();
    let result = items.filter(n => {
      const matchesSearch   = !q || n.name.toLowerCase().includes(q) || n.role.toLowerCase().includes(q) || (n.faction || '').toLowerCase().includes(q) || (n.location || '').toLowerCase().includes(q) || n.description.toLowerCase().includes(q);
      const matchesFaction  = !filterFaction  || (n.faction  || '') === filterFaction;
      const matchesLocation = !filterLocation || (n.location || '') === filterLocation;
      const matchesRole     = !filterRole     || n.role === filterRole;
      const matchesStatus   = !filterStatus   || (n.status || 'Unknown') === filterStatus;
      return matchesSearch && matchesFaction && matchesLocation && matchesRole && matchesStatus;
    });
    result.sort((a, b) => {
      const av = (a[sortKey] || '').toLowerCase();
      const bv = (b[sortKey] || '').toLowerCase();
      return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0;
    });
    return result;
  }, [items, search, filterFaction, filterLocation, filterRole, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <span className="text-text-muted/40 ml-1">↕</span>
      : <span className="text-accent-gold ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;

  const openCreate = () => { setForm(empty); setEditId(null); setSlideOpen(true); };
  const openEdit   = (n: NPC) => {
    setForm({ name: n.name, role: n.role, faction: n.faction || '', location: n.location || '', description: n.description, tags: n.tags || [], status: (n.status || 'Unknown') as NpcStatus });
    setEditId(n.id);
    setSlideOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { ...form, faction: form.faction || null, location: form.location || null };
    if (editId) await update({ id: editId, ...data });
    else        await create(data);
    setSaving(false);
    setSlideOpen(false);
  };

  const activeFilterCount = [filterFaction, filterLocation, filterRole, filterStatus].filter(Boolean).length;

  return (
    <div className="animate-fade-in">
      <PageHeader icon="groups" title="NPCs">
        <div className="flex gap-2 items-center">
          <span className="font-mono text-xs text-text-muted">{processed.length} of {items.length}</span>
          <Button onClick={openCreate}>+ New NPC</Button>
        </div>
      </PageHeader>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
          <input
            className="w-full bg-card border border-border-subtle rounded-lg pl-9 pr-4 py-2.5 text-text-primary font-body text-sm focus:outline-none focus:border-accent-purple transition-colors placeholder:text-text-muted/50"
            placeholder="Search by name, role, faction, location, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm"><Icon name="close" className="text-sm" /></button>
          )}
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {[
            { value: filterFaction,  set: setFilterFaction,  label: 'All Factions',  opts: uniqueFactions  },
            { value: filterLocation, set: setFilterLocation, label: 'All Locations', opts: uniqueLocations },
            { value: filterRole,     set: setFilterRole,     label: 'All Roles',     opts: uniqueRoles     },
          ].map(({ value, set, label, opts }) => (
            <select key={label} value={value} onChange={e => set(e.target.value)}
              className="bg-card border border-border-subtle rounded-lg px-3 py-1.5 text-sm font-mono text-text-secondary focus:outline-none focus:border-accent-purple transition-colors">
              <option value="">{label}</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-card border border-border-subtle rounded-lg px-3 py-1.5 text-sm font-mono text-text-secondary focus:outline-none focus:border-accent-purple transition-colors">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterFaction(''); setFilterLocation(''); setFilterRole(''); setFilterStatus(''); }}
              className="font-mono text-xs text-accent-red hover:text-accent-red/80 transition-colors">
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : processed.length === 0 ? (
        <EmptyState icon="groups" message={search || activeFilterCount > 0 ? 'No NPCs match your filters.' : 'No NPCs yet. Create your first one.'} />
      ) : (
        <div className="overflow-x-auto border border-border-subtle rounded-lg">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {(['name', 'role', 'faction', 'location'] as SortKey[]).map(col => (
                  <th key={col}
                    onClick={() => toggleSort(col)}
                    className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle cursor-pointer hover:bg-accent-purple/10 transition-colors select-none first:rounded-tl-lg"
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)} <SortIcon col={col} />
                  </th>
                ))}
                <th className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle">Status</th>
                <th className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle">Description</th>
                <th className="w-10 bg-accent-purple/5 border-b border-border-subtle rounded-tr-lg" />
              </tr>
            </thead>
            <tbody>
              {processed.map((n, i) => (
                <tr
                  key={n.id}
                  onClick={() => openEdit(n)}
                  className={`border-b border-border-subtle/50 cursor-pointer transition-colors hover:bg-card-hover/60 group ${i % 2 === 0 ? 'bg-card/50' : 'bg-deep/30'}`}
                >
                  <td className="p-3">
                    <span className="font-display text-sm font-bold text-accent-gold group-hover:text-accent-gold/80 transition-colors">
                      {n.name}
                    </span>
                  </td>
                  <td className="p-3"><Tag variant="npc">{n.role}</Tag></td>
                  <td className="p-3">
                    {n.faction
                      ? <Tag variant="faction">{n.faction}</Tag>
                      : <span className="text-text-muted/40 font-mono text-xs">—</span>}
                  </td>
                  <td className="p-3">
                    {n.location
                      ? <span className="font-mono text-xs text-accent-blue">{n.location}</span>
                      : <span className="text-text-muted/40 font-mono text-xs">—</span>}
                  </td>
                  <td className="p-3">
                    {(() => {
                      const s = (n.status || 'Unknown') as NpcStatus;
                      return <span className={`font-mono text-xs border rounded px-2 py-0.5 ${statusStyle[s]}`}>{s}</span>;
                    })()}
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="text-text-secondary text-xs line-clamp-2">{n.description}</p>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(n.id); }}
                      className="text-text-muted/30 hover:text-accent-red text-xs font-mono transition-colors opacity-0 group-hover:opacity-100"
                    ><Icon name="close" className="text-xs" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* \u2500\u2500 Edit / Create Slideout \u2500\u2500 */}
      <SlideOut
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editId ? (form.name || 'Edit NPC') : 'New NPC'}
        subtitle={editId ? form.role : undefined}
        headerExtra={
          <div className="flex gap-1.5">
            {editId && (
              <Button size="sm" variant="danger" onClick={() => { setDeleteId(editId); setSlideOpen(false); }}>
                Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving\u2026' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Broker, Ally, Merchant…" />
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as NpcStatus })}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Faction</label>
              <select
                value={form.faction}
                onChange={(e) => setForm({ ...form, faction: e.target.value })}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
              >
                <option value="">None</option>
                {factions.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optional" />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} />
        </div>
      </SlideOut>

      {/* \u2500\u2500 Delete confirmation \u2500\u2500 */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete NPC">
        <ConfirmDelete
          onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
