'use client';

import { useState, useMemo } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { LootItem, LootStatus, Faction } from '@/lib/types';
import { LOOT_STATUSES } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { SlideOut } from '@/components/SlideOut';
import { Icon } from '@/components/Icon';

const statusStyle: Record<LootStatus, string> = {
  Carried: 'text-green-400 bg-green-400/10 border-green-400/30',
  Known:   'text-accent-purple bg-accent-purple/10 border-accent-purple/30',
  Sold:    'text-text-muted bg-card border-border-subtle',
  Lost:    'text-accent-red bg-accent-red/10 border-accent-red/30',
};

const empty = { name: '', details: '', source: '', holder: '', status: 'Carried' as LootStatus, price: '', sold_by_faction: '', dnd_beyond_url: '' };

type SortKey = 'name' | 'source' | 'holder' | 'price';
type SortDir = 'asc' | 'desc';

export default function LootPage() {
  const { items, loading, create, update, remove } = useCampaignCrud<LootItem>('loot-items');
  const { items: factions } = useCampaignCrud<Faction>('factions');

  // Slideout state
  const [slideOpen, setSlideOpen] = useState(false);
  const [form,      setForm]      = useState(empty);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search & filter
  const [search,        setSearch]        = useState('');
  const [filterStatuses, setFilterStatuses] = useState<Set<LootStatus>>(new Set<LootStatus>(['Carried', 'Known']));
  const [filterSource,   setFilterSource]   = useState('');
  const [filterHolder,   setFilterHolder]   = useState('');
  const [filterFaction,  setFilterFaction]  = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const uniqueSources  = useMemo(() => Array.from(new Set(items.map(l => l.source).filter(Boolean))).sort(), [items]);
  const uniqueHolders  = useMemo(() => Array.from(new Set(items.map(l => l.holder).filter(Boolean) as string[])).sort(), [items]);
  const factionNames   = useMemo(() => factions.map(f => f.name).sort(), [factions]);

  const processed = useMemo(() => {
    const q = search.toLowerCase();
    let result = items.filter(l => {
      const matchesSearch = !q
        || l.name.toLowerCase().includes(q)
        || l.details.toLowerCase().includes(q)
        || l.source.toLowerCase().includes(q)
        || (l.holder || '').toLowerCase().includes(q)
        || (l.price || '').toLowerCase().includes(q)
        || (l.sold_by_faction || '').toLowerCase().includes(q);
      const matchesStatus  = filterStatuses.size === LOOT_STATUSES.length || filterStatuses.has((l.status || 'Carried') as LootStatus);
      const matchesSource  = !filterSource  || l.source === filterSource;
      const matchesHolder  = !filterHolder  || (l.holder || '') === filterHolder;
      const matchesFaction = !filterFaction || (l.sold_by_faction || '') === filterFaction;
      return matchesSearch && matchesStatus && matchesSource && matchesHolder && matchesFaction;
    });
    result.sort((a, b) => {
      const av = (a[sortKey] || '').toLowerCase();
      const bv = (b[sortKey] || '').toLowerCase();
      return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0;
    });
    return result;
  }, [items, search, filterStatuses, filterSource, filterHolder, filterFaction, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <span className="text-text-muted/40 ml-1">{'\u21D5'}</span>
      : <span className="text-accent-gold ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;

  const openCreate = () => { setForm(empty); setEditId(null); setSlideOpen(true); };
  const openEdit   = (l: LootItem) => {
    setForm({ name: l.name, details: l.details, source: l.source, holder: l.holder || '', status: (l.status || 'Carried') as LootStatus, price: l.price || '', sold_by_faction: l.sold_by_faction || '', dnd_beyond_url: l.dnd_beyond_url || '' });
    setEditId(l.id);
    setSlideOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { ...form, holder: form.holder || null, price: form.price || null, sold_by_faction: form.sold_by_faction || null, dnd_beyond_url: form.dnd_beyond_url || null };
    if (editId) await update({ id: editId, ...data });
    else        await create(data);
    setSaving(false);
    setSlideOpen(false);
  };

  const statusFiltered = filterStatuses.size < LOOT_STATUSES.length;
  const activeFilterCount = [statusFiltered, !!filterSource, !!filterHolder, !!filterFaction].filter(Boolean).length;

  return (
    <div className="animate-fade-in">
      <PageHeader icon="paid" title="Loot & Items">
        <div className="flex gap-2 items-center">
          <span className="font-mono text-xs text-text-muted">{processed.length} of {items.length}</span>
          <Button onClick={openCreate}>+ New Item</Button>
        </div>
      </PageHeader>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
          <input
            className="w-full bg-card border border-border-subtle rounded-lg pl-9 pr-4 py-2.5 text-text-primary font-body text-sm focus:outline-none focus:border-accent-purple transition-colors placeholder:text-text-muted/50"
            placeholder="Search by name, details, source, holder, or price..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm"><Icon name="close" className="text-sm" /></button>
          )}
        </div>
        <div className="grid grid-cols-2 md:flex gap-2 md:gap-3 flex-wrap items-center">
          {/* Status multiselect chips */}
          <div className="flex gap-1 flex-wrap col-span-2">
            {LOOT_STATUSES.map(s => {
              const active = filterStatuses.has(s);
              const toggle = () => {
                const next = new Set(filterStatuses);
                if (active) next.delete(s); else next.add(s);
                setFilterStatuses(next);
              };
              return (
                <button key={s} onClick={toggle}
                  className={`font-mono text-xs border rounded px-2 py-0.5 transition-colors ${active ? statusStyle[s] : 'text-text-muted/40 bg-transparent border-border-subtle/40 hover:border-border-subtle'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {[
            { value: filterSource,  set: setFilterSource,  label: 'All Sources',  opts: uniqueSources },
            { value: filterHolder,  set: setFilterHolder,  label: 'All Holders',  opts: uniqueHolders },
            { value: filterFaction, set: setFilterFaction, label: 'All Factions', opts: factionNames },
          ].map(({ value, set, label, opts }) => (
            <select key={label} value={value} onChange={e => set(e.target.value)}
              className="bg-card border border-border-subtle rounded-lg px-3 py-1.5 text-sm font-mono text-text-secondary focus:outline-none focus:border-accent-purple transition-colors">
              <option value="">{label}</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterStatuses(new Set<LootStatus>(LOOT_STATUSES)); setFilterSource(''); setFilterHolder(''); setFilterFaction(''); }}
              className="col-span-2 md:col-span-1 font-mono text-xs text-accent-red hover:text-accent-red/80 transition-colors">
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading...</p>
      ) : processed.length === 0 ? (
        <EmptyState icon="paid" message={search || activeFilterCount > 0 || statusFiltered ? 'No items match your filters.' : 'No loot yet. Create your first item.'} />
      ) : (
        {/* Mobile card view */}
        <div className="md:hidden flex flex-col gap-3">
          {processed.map((l) => {
            const s = (l.status || 'Carried') as LootStatus;
            return (
              <div
                key={l.id}
                onClick={() => openEdit(l)}
                className="bg-card border border-border-subtle rounded-lg p-4 cursor-pointer hover:bg-card-hover transition-colors active:bg-card-hover/80"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-display text-sm font-bold text-accent-gold truncate">{l.name}</span>
                  <span className={`font-mono text-xs border rounded px-2 py-0.5 shrink-0 ${statusStyle[s]}`}>{s}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {l.holder && <span className="text-text-secondary">{l.holder}</span>}
                  {l.price && <span className="text-accent-gold">{l.price}</span>}
                  {l.sold_by_faction && <span className="text-accent-blue">{l.sold_by_faction}</span>}
                  {l.dnd_beyond_url && (
                    <a href={l.dnd_beyond_url} target="_blank" rel="noopener noreferrer"
                       onClick={(e) => e.stopPropagation()}
                       className="text-accent-purple/60 hover:text-accent-purple">
                      <Icon name="open_in_new" className="text-sm" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto border border-border-subtle rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {(['name', 'holder', 'price'] as SortKey[]).map((col, ci) => (
                  <th key={col}
                    onClick={() => toggleSort(col)}
                    className={`text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle cursor-pointer hover:bg-accent-purple/10 transition-colors select-none ${ci === 0 ? 'rounded-tl-lg' : ''}`}
                  >
                    {col === 'name' ? 'Item' : col.charAt(0).toUpperCase() + col.slice(1)} <SortIcon col={col} />
                  </th>
                ))}
                <th className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle">Sold By</th>
                <th className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle">Status</th>
                <th className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle">Details</th>
                <th className="w-10 p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle" title="D&D Beyond">DnDB</th>
                <th className="w-10 bg-accent-purple/5 border-b border-border-subtle rounded-tr-lg" />
              </tr>
            </thead>
            <tbody>
              {processed.map((l, i) => (
                <tr
                  key={l.id}
                  onClick={() => openEdit(l)}
                  className={`border-b border-border-subtle/50 cursor-pointer transition-colors hover:bg-card-hover/60 group ${i % 2 === 0 ? 'bg-card/50' : 'bg-deep/30'}`}
                >
                  <td className="p-3">
                    <span className="font-display text-sm font-bold text-accent-gold group-hover:text-accent-gold/80 transition-colors">
                      {l.name}
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary text-sm">{l.holder || '—'}</td>
                  <td className="p-3 font-mono text-xs text-accent-gold">{l.price || '—'}</td>
                  <td className="p-3">
                    {l.sold_by_faction
                      ? <span className="font-mono text-xs text-accent-blue">{l.sold_by_faction}</span>
                      : <span className="text-text-muted/40 font-mono text-xs">—</span>}
                  </td>
                  <td className="p-3">
                    {(() => {
                      const s = (l.status || 'Carried') as LootStatus;
                      return <span className={`font-mono text-xs border rounded px-2 py-0.5 ${statusStyle[s]}`}>{s}</span>;
                    })()}
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="text-text-secondary text-xs line-clamp-2">{l.details}</p>
                  </td>
                  <td className="p-3 text-center">
                    {l.dnd_beyond_url ? (
                      <a
                        href={l.dnd_beyond_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in D&D Beyond"
                        className="inline-flex items-center justify-center text-accent-purple/60 hover:text-accent-purple transition-colors"
                      >
                        <Icon name="open_in_new" className="text-sm" />
                      </a>
                    ) : null}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(l.id); }}
                      className="text-text-muted/30 hover:text-accent-red text-xs font-mono transition-colors opacity-0 group-hover:opacity-100"
                    ><Icon name="close" className="text-xs" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Slideout */}
      <SlideOut
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editId ? (form.name || 'Edit Item') : 'New Item'}
        subtitle={editId ? form.source : undefined}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as LootStatus })}
                className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
              >
                {LOOT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 500gp" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="S7 — Zendali" />
            <Input label="Holder" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} placeholder="Optional" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[0.65rem] text-text-muted uppercase tracking-widest">Sold By Faction</label>
            <select
              value={form.sold_by_faction}
              onChange={(e) => setForm({ ...form, sold_by_faction: e.target.value })}
              className="bg-[#0a0a12] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-gold/50 transition-colors"
            >
              <option value="">None</option>
              {factionNames.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <Input label="D&D Beyond URL" value={form.dnd_beyond_url} onChange={(e) => setForm({ ...form, dnd_beyond_url: e.target.value })} placeholder="https://www.dndbeyond.com/magic-items/…" />
          <Textarea label="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={6} />
        </div>
      </SlideOut>

      {/* Delete confirmation */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Item">
        <ConfirmDelete
          onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
