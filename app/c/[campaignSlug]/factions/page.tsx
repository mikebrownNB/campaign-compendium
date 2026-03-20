'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { Faction, NPC, Thread, GameLocation } from '@/lib/types';
import { PageHeader, Button, Tag, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { SlideOut, SlideOutSection } from '@/components/SlideOut';
import { NpcDetailSlideOut } from '@/components/NpcDetailSlideOut';
import Link from 'next/link';

const emptyFaction = { name: '', status: '', description: '', tags: [] as string[] };

const STATUS_COLORS: Record<string, string> = {
  'Hostile': 'border-l-accent-red',
  'Hostile Empire': 'border-l-accent-red',
  'Ally': 'border-l-accent-green',
  'Employer': 'border-l-accent-gold',
  'Neutral': 'border-l-accent-blue',
  'Weakened': 'border-l-text-muted',
  'Complicated': 'border-l-accent-orange',
  'Unknown': 'border-l-accent-purple',
};

const STATUS_TAG_VARIANT: Record<string, string> = {
  'Hostile': 'danger', 'Hostile Empire': 'danger',
  'Ally': 'ally', 'Employer': 'quest',
  'Neutral': 'location', 'Weakened': 'default',
  'Complicated': 'item', 'Unknown': 'faction',
};

export default function FactionsPage() {
  const { items: factions, loading, create, update, remove } = useCampaignCrud<Faction>('factions');
  const { items: npcs } = useCampaignCrud<NPC>('npcs');
  const { items: threads } = useCampaignCrud<Thread>('threads');
  const { items: locations } = useCampaignCrud<GameLocation>('locations');

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyFaction);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [viewingNpc,      setViewingNpc]      = useState<NPC | null>(null);

  // Cross-reference data for the selected faction
  const relatedData = useMemo(() => {
    if (!selectedFaction) return { npcs: [], threads: [], locations: [] };

    const fName = selectedFaction.name.toLowerCase();
    const fTags = (selectedFaction.tags || []).map(t => t.toLowerCase());

    // NPCs: match by faction field or by faction name appearing in description
    const relatedNpcs = npcs.filter(n => {
      const nFaction = (n.faction || '').toLowerCase();
      const nDesc = n.description.toLowerCase();
      const nTags = (n.tags || []).map(t => t.toLowerCase());
      return nFaction === fName
        || nFaction.includes(fName.split(' ')[0]) // partial match e.g. "Darkpowder" matches "The Darkpowder Syndicate"
        || fName.includes(nFaction) && nFaction.length > 2
        || nDesc.includes(fName.split(' ')[0].toLowerCase());
    });

    // Threads: match by name appearing in thread description or title, or matching tags
    const relatedThreads = threads.filter(t => {
      const tDesc = t.description.toLowerCase();
      const tTitle = t.title.toLowerCase();
      const tTags = (t.tags || []).map(tag => tag.toLowerCase());
      const nameWords = fName.split(' ').filter(w => w.length > 3);
      return nameWords.some(w => tDesc.includes(w) || tTitle.includes(w))
        || fTags.some(ft => tTags.includes(ft));
    });

    // Locations: match by faction name appearing in location description
    const relatedLocations = locations.filter(l => {
      const lDesc = l.description.toLowerCase();
      const lName = l.name.toLowerCase();
      const nameWords = fName.split(' ').filter(w => w.length > 3);
      return nameWords.some(w => lDesc.includes(w) || lName.includes(w));
    });

    return { npcs: relatedNpcs, threads: relatedThreads, locations: relatedLocations };
  }, [selectedFaction, npcs, threads, locations]);

  const openCreate = () => { setForm(emptyFaction); setEditId(null); setModal('create'); };
  const openEdit = (f: Faction) => {
    setForm({ name: f.name, status: f.status, description: f.description, tags: f.tags || [] });
    setEditId(f.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (modal === 'create') await create(form);
    else if (editId) await update({ id: editId, ...form });
    setModal(null);
  };

  // When selected faction's data changes (after edit), keep it in sync
  useEffect(() => {
    if (selectedFaction) {
      const updated = factions.find(f => f.id === selectedFaction.id);
      if (updated) setSelectedFaction(updated);
    }
  }, [factions, selectedFaction]);

  return (
    <div className="animate-fade-in">
      <PageHeader icon="⚔️" title="Factions">
        <Button onClick={openCreate}>+ New Faction</Button>
      </PageHeader>

      {loading ? <p className="text-text-muted font-mono text-sm">Loading...</p> : factions.length === 0 ? (
        <EmptyState icon="⚔️" message="No factions yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factions.map((f) => {
            const borderColor = STATUS_COLORS[f.status] || 'border-l-accent-purple';
            return (
              <div
                key={f.id}
                onClick={() => setSelectedFaction(f)}
                className={`bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300
                           hover:bg-card-hover hover:border-border-glow hover:-translate-y-0.5
                           hover:shadow-lg hover:shadow-accent-purple/5 cursor-pointer
                           relative overflow-hidden group border-l-4 ${borderColor}`}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-purple to-accent-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent-gold transition-colors">
                    {f.name}
                  </h3>
                  <Tag variant={STATUS_TAG_VARIANT[f.status] || 'faction'}>
                    {f.status}
                  </Tag>
                </div>
                <p className="text-text-secondary text-sm line-clamp-3 mb-3">{f.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {(f.tags || []).map((t) => <Tag key={t} variant={t}>{t}</Tag>)}
                  </div>
                  {/* Quick stats */}
                  <div className="flex gap-3 text-text-muted font-mono text-[0.6rem]">
                    <span title="Related NPCs">👥 {npcs.filter(n => (n.faction || '').toLowerCase().includes(f.name.toLowerCase().split(' ')[0])).length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Faction Detail Slide-Out ===== */}
      <SlideOut
        open={selectedFaction !== null}
        onClose={() => setSelectedFaction(null)}
        title={selectedFaction?.name || ''}
        subtitle={selectedFaction?.status || ''}
        headerExtra={
          selectedFaction ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => { openEdit(selectedFaction); }}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => { setDeleteId(selectedFaction.id); setSelectedFaction(null); }}>Delete</Button>
            </div>
          ) : undefined
        }
      >
        {selectedFaction && (
          <>
            {/* Status badge */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              <Tag variant={STATUS_TAG_VARIANT[selectedFaction.status] || 'faction'}>
                {selectedFaction.status}
              </Tag>
              {(selectedFaction.tags || []).map(t => <Tag key={t} variant={t}>{t}</Tag>)}
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-text-secondary text-sm leading-relaxed">{selectedFaction.description}</p>
            </div>

            {/* ===== Related NPCs ===== */}
            <SlideOutSection
              icon="👥"
              title={`Known Members & Contacts (${relatedData.npcs.length})`}
              empty={relatedData.npcs.length === 0 ? 'No known NPCs linked to this faction.' : undefined}
            >
              <div className="flex flex-col gap-2">
                {relatedData.npcs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setViewingNpc(n)}
                    className="flex items-start gap-3 bg-card border border-border-subtle rounded-lg p-3
                              hover:bg-card-hover hover:border-border-glow transition-all group/npc text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-teal/10 border border-accent-teal/20
                                  flex items-center justify-center shrink-0 text-sm">
                      👤
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-sm font-bold text-text-primary group-hover/npc:text-accent-gold transition-colors">
                          {n.name}
                        </span>
                        <Tag variant="npc">{n.role}</Tag>
                      </div>
                      {n.location && (
                        <p className="font-mono text-[0.6rem] text-text-muted mt-0.5">📍 {n.location}</p>
                      )}
                      <p className="text-text-secondary text-xs mt-1 line-clamp-2">{n.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </SlideOutSection>

            {/* ===== Related Threads ===== */}
            <SlideOutSection
              icon="🧵"
              title={`Active Threads (${relatedData.threads.length})`}
              empty={relatedData.threads.length === 0 ? 'No active threads involving this faction.' : undefined}
            >
              <div className="flex flex-col gap-2">
                {relatedData.threads.map(t => {
                  const statusDot: Record<string, string> = {
                    urgent: 'bg-accent-red animate-pulse-glow text-accent-red',
                    active: 'bg-accent-green shadow-[0_0_6px] shadow-accent-green',
                    dormant: 'bg-text-muted',
                    resolved: 'bg-accent-purple',
                  };
                  return (
                    <Link
                      key={t.id}
                      href="/threads"
                      className="bg-card border border-border-subtle rounded-lg p-3
                                hover:bg-card-hover hover:border-border-glow transition-all group/thread"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[t.status] || ''}`} />
                        <span className="font-display text-sm font-bold text-text-primary group-hover/thread:text-accent-gold transition-colors truncate">
                          {t.title}
                        </span>
                        <span className="font-mono text-[0.6rem] uppercase text-text-muted shrink-0">{t.status}</span>
                      </div>
                      <p className="text-text-secondary text-xs line-clamp-2 ml-4">{t.description}</p>
                    </Link>
                  );
                })}
              </div>
            </SlideOutSection>

            {/* ===== Related Locations ===== */}
            <SlideOutSection
              icon="🗺️"
              title={`Known Locations (${relatedData.locations.length})`}
              empty={relatedData.locations.length === 0 ? 'No locations directly linked to this faction.' : undefined}
            >
              <div className="flex flex-col gap-2">
                {relatedData.locations.map(l => (
                  <Link
                    key={l.id}
                    href="/locations"
                    className="flex items-center gap-3 bg-card border border-border-subtle rounded-lg p-3
                              hover:bg-card-hover hover:border-border-glow transition-all group/loc"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-blue/10 border border-accent-blue/20
                                  flex items-center justify-center shrink-0 text-sm">
                      📍
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-text-primary group-hover/loc:text-accent-gold transition-colors">
                          {l.name}
                        </span>
                        <Tag variant="location">{l.category}</Tag>
                      </div>
                      <p className="text-text-secondary text-xs mt-1 line-clamp-1">{l.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </SlideOutSection>
          </>
        )}
      </SlideOut>

      {/* ===== Create/Edit Modal ===== */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'New Faction' : 'Edit Faction'}>
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="Hostile, Ally, Neutral, Employer, Complicated..." />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleSave}>{modal === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </Modal>

      {/* ===== Delete Confirmation ===== */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Faction">
        <ConfirmDelete onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
      </Modal>

      {/* ===== NPC Detail (layer 2 \u2014 appears above faction slideout) ===== */}
      <NpcDetailSlideOut npc={viewingNpc} onClose={() => setViewingNpc(null)} layer={2} />
    </div>
  );
}
