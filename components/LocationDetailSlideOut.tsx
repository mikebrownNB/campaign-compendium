'use client';

import { useState, useEffect, useMemo } from 'react';
import type { GameLocation, NPC, Thread, Faction } from '@/lib/types';
import { SlideOut, SlideOutSection } from '@/components/SlideOut';
import { Tag, Button, Input, Textarea } from '@/components/UI';
import { NpcDetailSlideOut } from '@/components/NpcDetailSlideOut';
import { FactionDetailSlideOut } from '@/components/FactionDetailSlideOut';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { useCampaign } from '@/lib/CampaignContext';
import { Icon } from '@/components/Icon';
import { DmOnlyToggle } from '@/components/DmOnlyToggle';

const STATUS_DOT: Record<string, string> = {
  urgent:   'bg-accent-red animate-pulse-glow',
  active:   'bg-accent-green shadow-[0_0_6px] shadow-accent-green',
  dormant:  'bg-text-muted',
  resolved: 'bg-accent-purple',
};

interface Props {
  location: GameLocation | null;
  onClose: () => void;
  /** Called after a successful save so the parent can sync its local copy */
  onUpdated?: (updated: GameLocation) => void;
  /** When provided, shows a Delete button in the header */
  onDelete?: () => void;
  /** Use layer 2 when stacked on top of another slideout */
  layer?: 1 | 2;
  /**
   * Map-pin integration.
   * When this slideout is opened by clicking a map marker, pass the marker's
   * note here so it appears in a "Map Note" section at the top.
   */
  pinNote?: string;
  /**
   * When provided, a "📍 Pin" button appears in the header so the user can
   * switch to editing the map marker that triggered this slideout.
   */
  onEditPin?: () => void;
  /**
   * When provided, a "Delete Pin" button appears in the header to remove
   * the map marker that triggered this slideout.
   */
  onDeletePin?: () => void;
}

export function LocationDetailSlideOut({
  location,
  onClose,
  onUpdated,
  onDelete,
  layer = 1,
  pinNote,
  onEditPin,
  onDeletePin,
}: Props) {
  const { isDM } = useCampaign();
  const { update } = useCampaignCrud<GameLocation>('locations');

  // Cross-reference data (self-fetched; small datasets so this is fine)
  const { items: npcs }     = useCampaignCrud<NPC>('npcs');
  const { items: threads }  = useCampaignCrud<Thread>('threads');
  const { items: factions } = useCampaignCrud<Faction>('factions');

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name: '', category: '', description: '', dm_only: false, dm_notes: '' });

  // Layer-2 sub-slideouts
  const [viewingNpc,     setViewingNpc]     = useState<NPC | null>(null);
  const [viewingFaction, setViewingFaction] = useState<Faction | null>(null);

  // Seed form whenever the viewed location changes
  useEffect(() => {
    if (location) {
      setForm({
        name:        location.name,
        category:    location.category,
        description: location.description,
        dm_only:     !!location.dm_only,
        dm_notes:    location.dm_notes || '',
      });
      setEditing(false);
    }
  }, [location?.id]);

  // Word-level cross-reference matching (same logic as the locations page)
  const related = useMemo(() => {
    if (!location) return { npcs: [], threads: [], factions: [] };
    const lName = location.name.toLowerCase();
    const words = lName.split(/\s+/).filter(w => w.length > 2);

    return {
      npcs: npcs.filter(n =>
        (n.location || '').toLowerCase() === lName ||
        words.some(w => (n.location || '').toLowerCase().includes(w)) ||
        words.some(w => n.description.toLowerCase().includes(w)),
      ),
      threads: threads.filter(t =>
        words.some(w =>
          t.title.toLowerCase().includes(w) ||
          t.description.toLowerCase().includes(w),
        ),
      ),
      factions: factions.filter(f =>
        words.some(w =>
          f.name.toLowerCase().includes(w) ||
          f.description.toLowerCase().includes(w),
        ),
      ),
    };
  }, [location, npcs, threads, factions]);

  const handleSave = async () => {
    if (!location || !form.name.trim()) return;
    setSaving(true);
    const updated = await update({
      id:          location.id,
      name:        form.name,
      category:    form.category,
      description: form.description,
      tags:        location.tags ?? [],
      dm_only:     form.dm_only,
      dm_notes:    form.dm_notes || null,
    });
    setSaving(false);
    setEditing(false);
    if (onUpdated && updated) onUpdated(updated as GameLocation);
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  return (
    <>
      <SlideOut
        open={location !== null}
        onClose={handleClose}
        title={editing ? (form.name || 'Edit Location') : (location?.name ?? '')}
        subtitle={editing ? undefined : location?.category}
        layer={layer}
        headerExtra={
          location ? (
            editing ? (
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                {onDelete && (
                  <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
                )}
                {onDeletePin && (
                  <Button size="sm" variant="danger" onClick={onDeletePin} title="Remove map pin">
                    <Icon name="wrong_location" className="text-sm" /> Delete Pin
                  </Button>
                )}
                {onEditPin && (
                  <Button size="sm" variant="ghost" onClick={onEditPin} title="Edit map pin">
                    <Icon name="location_on" className="text-sm" /> Pin
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Icon name="edit" className="text-sm" /> Edit</Button>
              </div>
            )
          ) : undefined
        }
      >
        {location && (
          editing ? (
            /* ── Edit form ── */
            <div className="flex flex-col gap-4">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="City, Dungeon, Wilderness…"
              />
              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={7}
              />
              {isDM && (
                <>
                  <Textarea
                    label="DM Notes (private)"
                    value={form.dm_notes}
                    onChange={(e) => setForm({ ...form, dm_notes: e.target.value })}
                    rows={3}
                    placeholder="Notes only visible to the DM…"
                  />
                  <DmOnlyToggle value={form.dm_only} onChange={(v) => setForm({ ...form, dm_only: v })} />
                </>
              )}
            </div>
          ) : (
            /* ── View mode ── */
            <>
              {/* Map pin note — shown only when opened from a map marker */}
              {pinNote && (
                <SlideOutSection icon="push_pin" title="Map Note">
                  <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                    {pinNote}
                  </p>
                </SlideOutSection>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                <Tag variant="location">{location.category}</Tag>
                {(location.tags || []).map(t => <Tag key={t} variant={t}>{t}</Tag>)}
              </div>

              {/* DM Notes — only visible to DMs */}
              {isDM && location.dm_notes && (
                <SlideOutSection icon="lock" title="DM Notes (private)">
                  <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                    {location.dm_notes}
                  </p>
                </SlideOutSection>
              )}

              {/* Description */}
              <SlideOutSection icon="menu_book" title="Description">
                <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                  {location.description || (
                    <span className="text-text-muted italic">No description recorded.</span>
                  )}
                </p>
              </SlideOutSection>

              {/* Related NPCs */}
              <SlideOutSection
                icon="groups"
                title={`NPCs Here (${related.npcs.length})`}
                empty={related.npcs.length === 0 ? 'No NPCs linked to this location.' : undefined}
              >
                <div className="flex flex-col gap-2">
                  {related.npcs.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setViewingNpc(n)}
                      className="flex items-center gap-3 bg-card border border-border-subtle rounded-lg p-3
                                hover:bg-card-hover hover:border-border-glow transition-all group/npc text-left w-full"
                    >
                      <div className="w-7 h-7 rounded-full bg-accent-teal/10 border border-accent-teal/20
                                      flex items-center justify-center shrink-0 text-xs"><Icon name="person" className="text-xs" /></div>
                      <div className="min-w-0">
                        <span className="font-display text-sm font-bold text-text-primary
                                         group-hover/npc:text-accent-gold transition-colors block">
                          {n.name}
                        </span>
                        <span className="font-mono text-[0.6rem] text-text-muted">
                          {n.role}{n.faction ? ` · ${n.faction}` : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </SlideOutSection>

              {/* Related Factions */}
              <SlideOutSection
                icon="swords"
                title={`Factions Present (${related.factions.length})`}
                empty={related.factions.length === 0 ? 'No factions linked to this location.' : undefined}
              >
                <div className="flex flex-col gap-2">
                  {related.factions.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setViewingFaction(f)}
                      className="flex items-start gap-3 bg-card border border-border-subtle rounded-lg p-3
                                hover:bg-card-hover hover:border-border-glow transition-all group/faction text-left w-full"
                    >
                      <div className="w-7 h-7 rounded-full bg-accent-purple/10 border border-accent-purple/20
                                      flex items-center justify-center shrink-0 text-xs"><Icon name="swords" className="text-xs" /></div>
                      <div className="min-w-0">
                        <span className="font-display text-sm font-bold text-text-primary
                                         group-hover/faction:text-accent-gold transition-colors block">
                          {f.name}
                        </span>
                        <Tag variant="faction">{f.status}</Tag>
                      </div>
                    </button>
                  ))}
                </div>
              </SlideOutSection>

              {/* Related Threads */}
              <SlideOutSection
                icon="forum"
                title={`Related Threads (${related.threads.length})`}
                empty={related.threads.length === 0 ? 'No threads mention this location.' : undefined}
              >
                <div className="flex flex-col gap-2">
                  {related.threads.map(t => (
                    <div key={t.id} className="bg-card border border-border-subtle rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status] || 'bg-text-muted'}`} />
                        <span className="font-display text-sm font-bold text-text-primary truncate">
                          {t.title}
                        </span>
                        <span className="font-mono text-[0.6rem] text-text-muted uppercase shrink-0">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-text-secondary text-xs line-clamp-2 ml-4">{t.description}</p>
                    </div>
                  ))}
                </div>
              </SlideOutSection>
            </>
          )
        )}
      </SlideOut>

      {/* Layer-2 sub-slideouts (NPC and Faction detail) */}
      <NpcDetailSlideOut     npc={viewingNpc}         onClose={() => setViewingNpc(null)}     layer={2} />
      <FactionDetailSlideOut faction={viewingFaction} onClose={() => setViewingFaction(null)} layer={2} />
    </>
  );
}
