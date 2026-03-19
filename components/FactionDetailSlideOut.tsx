'use client';

import { useState, useEffect } from 'react';
import type { Faction } from '@/lib/types';
import { SlideOut, SlideOutSection } from '@/components/SlideOut';
import { Tag, Button, Input, Textarea } from '@/components/UI';
import { useCampaignCrud } from '@/lib/useCampaignCrud';

const STATUS_TAG_VARIANT: Record<string, string> = {
  'Hostile': 'danger', 'Hostile Empire': 'danger',
  'Ally': 'ally', 'Employer': 'quest',
  'Neutral': 'location', 'Weakened': 'default',
  'Complicated': 'item', 'Unknown': 'faction',
};

interface Props {
  faction: Faction | null;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its local copy */
  onUpdated?: (updated: Faction) => void;
  /** Use layer 2 when this appears on top of another slideout */
  layer?: 1 | 2;
}

export function FactionDetailSlideOut({ faction, onClose, onUpdated, layer = 1 }: Props) {
  const { update } = useCampaignCrud<Faction>('factions');

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name: '', status: '', description: '' });

  // Seed form whenever the viewed faction changes
  useEffect(() => {
    if (faction) {
      setForm({
        name:        faction.name,
        status:      faction.status,
        description: faction.description || '',
      });
      setEditing(false);
    }
  }, [faction?.id]);

  const handleSave = async () => {
    if (!faction || !form.name.trim()) return;
    setSaving(true);
    const updated = await update({
      id:          faction.id,
      name:        form.name,
      status:      form.status,
      description: form.description,
      tags:        faction.tags ?? [],
    });
    setSaving(false);
    setEditing(false);
    if (onUpdated && updated) onUpdated(updated as Faction);
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  return (
    <SlideOut
      open={faction !== null}
      onClose={handleClose}
      title={editing ? (form.name || 'Edit Faction') : (faction?.name ?? '')}
      subtitle={editing ? undefined : (faction?.status ?? '')}
      layer={layer}
      headerExtra={
        faction ? (
          editing ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              ✎ Edit
            </Button>
          )
        ) : undefined
      }
    >
      {faction && (
        editing ? (
          /* ── Edit mode ── */
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              placeholder="Hostile, Ally, Neutral, Employer, Complicated…"
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={7}
            />
          </div>
        ) : (
          /* ── View mode ── */
          <>
            {/* Status + tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Tag variant={STATUS_TAG_VARIANT[faction.status] || 'faction'}>{faction.status}</Tag>
              {(faction.tags ?? []).map(t => <Tag key={t} variant={t}>{t}</Tag>)}
            </div>

            {/* Description */}
            <SlideOutSection icon="📖" title="Description">
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {faction.description || <span className="text-text-muted italic">No description recorded.</span>}
              </p>
            </SlideOutSection>
          </>
        )
      )}
    </SlideOut>
  );
}
