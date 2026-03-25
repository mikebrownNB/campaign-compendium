'use client';

import { useState } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { GameLocation } from '@/lib/types';
import { useCampaign } from '@/lib/CampaignContext';
import { PageHeader, Button, Card, Tag, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { SlideOut } from '@/components/SlideOut';
import { LocationDetailSlideOut } from '@/components/LocationDetailSlideOut';
import { DmOnlyToggle, DmOnlyBadge } from '@/components/DmOnlyToggle';

const empty = { name: '', category: '', description: '', tags: [] as string[], dm_only: false };

export default function LocationsPage() {
  const { isDM } = useCampaign();
  const { items, loading, create, remove } = useCampaignCrud<GameLocation>('locations');

  const [selected,   setSelected]   = useState<GameLocation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(empty);
  const [saving,     setSaving]     = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setSaving(true);
    await create(createForm);
    setSaving(false);
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
              <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent-gold transition-colors mb-1 flex items-center gap-1.5">
                {l.name}
                {l.dm_only && <DmOnlyBadge />}
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

      {/* Create slideout */}
      <SlideOut
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Location"
        headerExtra={
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleCreate} disabled={saving || !createForm.name.trim()}>
              {saving ? 'Saving\u2026' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <Input
            label="Category"
            value={createForm.category}
            onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
            placeholder="City, Dungeon, Wilderness\u2026"
          />
          <Textarea
            label="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            rows={6}
          />
          {isDM && (
            <DmOnlyToggle value={createForm.dm_only} onChange={(v) => setCreateForm({ ...createForm, dm_only: v })} />
          )}
        </div>
      </SlideOut>

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
