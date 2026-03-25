'use client';

import { useState } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { GameLocation } from '@/lib/types';
import { PageHeader, Button, Card, Tag, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { LocationDetailSlideOut } from '@/components/LocationDetailSlideOut';

const empty = { name: '', category: '', description: '', tags: [] as string[] };

export default function LocationsPage() {
  const { items, loading, create, remove } = useCampaignCrud<GameLocation>('locations');

  const [selected,   setSelected]   = useState<GameLocation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(empty);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    await create(createForm);
    setCreateOpen(false);
    setCreateForm(empty);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="pin_drop" title="Locations">
        <Button onClick={() => { setCreateForm(empty); setCreateOpen(true); }}>+ New Location</Button>
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState icon="pin_drop" message="No locations yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((l) => (
            <Card
              key={l.id}
              className="cursor-pointer hover:border-border-glow hover:-translate-y-0.5 transition-all duration-200 group"
              onClick={() => setSelected(l)}
            >
              <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent-gold transition-colors mb-1">
                {l.name}
              </h3>
              <div className="flex gap-1.5 flex-wrap mb-2">
                <Tag variant="location">{l.category}</Tag>
                {(l.tags || []).map((t) => <Tag key={t} variant={t}>{t}</Tag>)}
              </div>
              <p className="text-text-secondary text-sm line-clamp-3">{l.description}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Location detail / edit slideout — powered by the shared LocationDetailSlideOut */}
      <LocationDetailSlideOut
        location={selected}
        onClose={() => setSelected(null)}
        onUpdated={(updated) => setSelected(updated)}
        onDelete={() => { if (selected) setDeleteId(selected.id); setSelected(null); }}
      />

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Location">
        <Input
          label="Name"
          value={createForm.name}
          onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
        />
        <Input
          label="Category"
          value={createForm.category}
          onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
          placeholder="City, Dungeon, Wilderness…"
        />
        <Textarea
          label="Description"
          value={createForm.description}
          onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          rows={4}
        />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!createForm.name.trim()}>Create</Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Location">
        <ConfirmDelete
          onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
