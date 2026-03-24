'use client';

import { useState, useEffect } from 'react';
import type { NPC } from '@/lib/types';
import { SlideOut, SlideOutSection } from '@/components/SlideOut';
import { Tag, Button, Input, Textarea } from '@/components/UI';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { Icon } from '@/components/Icon';

interface Props {
  npc: NPC | null;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its local copy */
  onUpdated?: (updated: NPC) => void;
  /** Use layer 2 when this appears on top of another slideout (e.g. inside factions) */
  layer?: 1 | 2;
}

export function NpcDetailSlideOut({ npc, onClose, onUpdated, layer = 1 }: Props) {
  const { update } = useCampaignCrud<NPC>('npcs');

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    name: '', role: '', faction: '', location: '', description: '',
  });

  // Seed form whenever the viewed NPC changes
  useEffect(() => {
    if (npc) {
      setForm({
        name:        npc.name,
        role:        npc.role,
        faction:     npc.faction     || '',
        location:    npc.location    || '',
        description: npc.description || '',
      });
      setEditing(false);
    }
  }, [npc?.id]);

  const handleSave = async () => {
    if (!npc || !form.name.trim()) return;
    setSaving(true);
    const updated = await update({
      id:          npc.id,
      name:        form.name,
      role:        form.role,
      faction:     form.faction     || null,
      location:    form.location    || null,
      description: form.description,
      tags:        npc.tags ?? [],
    });
    setSaving(false);
    setEditing(false);
    if (onUpdated && updated) onUpdated(updated as NPC);
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  return (
    <SlideOut
      open={npc !== null}
      onClose={handleClose}
      title={editing ? (form.name || 'Edit NPC') : (npc?.name ?? '')}
      subtitle={editing ? undefined : (npc?.role ?? '')}
      layer={layer}
      headerExtra={
        npc ? (
          editing ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Icon name="edit" className="text-sm" /> Edit
            </Button>
          )
        ) : undefined
      }
    >
      {npc && (
        editing ? (
          /* ── Edit mode ── */
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Broker, Ally, Merchant…"
              />
              <Input
                label="Faction"
                value={form.faction}
                onChange={(e) => setForm({ ...form, faction: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Optional"
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
            {/* Meta row */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Tag variant="npc">{npc.role}</Tag>
              {npc.faction && <Tag variant="faction">{npc.faction}</Tag>}
              {(npc.tags ?? []).map(t => <Tag key={t} variant={t}>{t}</Tag>)}
            </div>

            {/* Location */}
            {npc.location && (
              <div className="flex items-center gap-2 mb-5 font-mono text-xs text-accent-blue">
                <Icon name="location_on" className="text-sm" />
                <span>{npc.location}</span>
              </div>
            )}

            {/* Description */}
            <SlideOutSection icon="menu_book" title="Description">
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {npc.description || <span className="text-text-muted italic">No description recorded.</span>}
              </p>
            </SlideOutSection>
          </>
        )
      )}
    </SlideOut>
  );
}
