'use client';

import { useState, useMemo } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { Session, NPC } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { NpcDetailSlideOut } from '@/components/NpcDetailSlideOut';
import { Icon } from '@/components/Icon';

/** Splits plain text on every NPC name and returns mixed string/ReactNode array. */
function linkNpcs(text: string, npcs: NPC[], onNpcClick: (npc: NPC) => void): React.ReactNode {
  if (!text || !npcs.length) return text;

  // Longest names first so "Nobjob Bob" matches before "Bob"
  const sorted  = [...npcs].sort((a, b) => b.name.length - a.name.length);
  const escaped = sorted.map(n => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = text.split(regex);
  return parts.map((part, i) => {
    const match = npcs.find(n => n.name.toLowerCase() === part.toLowerCase());
    if (match) {
      return (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onNpcClick(match); }}
          className="text-accent-teal hover:text-accent-gold underline underline-offset-2 font-semibold transition-colors"
        >
          {part}
        </button>
      );
    }
    return part;
  });
}

const empty = { number: 0, title: '', real_date: '', ingame_date: '', summary: '' };

const GDOC_LINKS: Record<number, string> = {
  1:  'https://docs.google.com/document/d/1TL1kegRRLTvU3dfWIjxBv3PFAQYbgDxwSuwey4jED6w/edit',
  2:  'https://docs.google.com/document/d/1yUo9JmjjDHQfjJyDM38gDp_sj35lQSC1JJDij_ozt3w/edit',
  3:  'https://docs.google.com/document/d/1uSxlBe4K-rhBfIE_e46ZBwaMFXmz60dFvp1MytQK5v4/edit',
  4:  'https://docs.google.com/document/d/1TUCbxwmHIUquWiVsO1CP40Zgzqrn_aaxgjBBAtj5ZIw/edit',
  5:  'https://docs.google.com/document/d/1AKZYPFA6vF5he0qKIdh1hQ-ZBdfb1GuzDk1pRP-QUWo/edit',
  6:  'https://docs.google.com/document/d/1gRtd_g6cggIeIXhf93ZE5YuFB7a7KYFxf_k29ouKJvE/edit',
  7:  'https://docs.google.com/document/d/1F6P2SM0wT-kMG3PQju6OM5OEAmY7P1R-jxLajIaqL2A/edit',
  8:  'https://docs.google.com/document/d/1QmWWmTVRg8ygq2OQ_GypMWZjVvJLSX5K2KGkdP_E_pY/edit',
  9:  'https://docs.google.com/document/d/1LAtxJOYroD1eftV7CpP1IluyluLVuAIGeKAM8iA2MCU/edit',
  10: 'https://docs.google.com/document/d/1gGU5TznAebOAvdOW0VLedncpXHt1SxH2gb_9ThWNjcw/edit',
  11: 'https://docs.google.com/document/d/1Y6ilmImGGzNM4xO9Cwd2oPos-d8_05f7ahHxDDtkrBc/edit',
  12: 'https://docs.google.com/document/d/1UFHU0c8CuZdBM0PwgOMcYffrg96s3FnTifOYD_cr3h8/edit',
  13: 'https://docs.google.com/document/d/1kyFM-mv0kOtkVfz-8s7Q9llF_1Zpmx3lFVj-tWMPiS8/edit',
  14: 'https://docs.google.com/document/d/1TW-WWxP_ouXlUkC7-5BjLJeUcKYRDIcEY2seLjJMM0Q/edit',
  15: 'https://docs.google.com/document/d/1W-oBA8JVNS9xK5jBDzneWuiBnj930-3kLV7Ik2lSNPk/edit',
};

export default function SessionsPage() {
  const { items, loading, create, update, remove } = useCampaignCrud<Session>('sessions');
  const { items: npcs } = useCampaignCrud<NPC>('npcs');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);

  const openCreate = () => { setForm({ ...empty, number: items.length > 0 ? Math.max(...items.map(s => s.number)) + 1 : 1 }); setEditId(null); setModal('create'); };
  const openEdit = (s: Session) => { setForm({ number: s.number, title: s.title, real_date: s.real_date, ingame_date: s.ingame_date, summary: s.summary }); setEditId(s.id); setModal('edit'); };
  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (modal === 'create') await create(form);
    else if (editId) await update({ id: editId, ...form });
    setModal(null);
  };

  const sorted = [...items].sort((a, b) => b.number - a.number);

  return (
    <div className="animate-fade-in">
      <PageHeader icon="history_edu" title="Session Log">
        <Button onClick={openCreate}>+ New Session</Button>
      </PageHeader>
      {loading ? <p className="text-text-muted font-mono text-sm">Loading...</p> : sorted.length === 0 ? (
        <EmptyState icon="history_edu" message="No sessions logged yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((s) => (
            <div key={s.id} className="bg-card border border-border-subtle rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-card-hover transition-colors select-none"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div>
                  <h3 className="font-display text-sm font-bold text-text-primary">
                    Session {s.number} \u2014 {s.title}
                  </h3>
                  <div className="flex gap-4 mt-1">
                    <span className="font-mono text-[0.65rem] text-text-muted">{s.real_date}</span>
                    <span className="font-mono text-[0.65rem] text-accent-purple">{s.ingame_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="text-text-muted hover:text-accent-gold text-xs font-mono">Edit</button>
                  <Icon name="expand_more" className={`text-accent-purple transition-transform text-base ${expandedId === s.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {expandedId === s.id && (
                <div className="px-4 pb-4 pt-0 border-t border-border-subtle">
                  <p className="text-text-secondary text-sm leading-relaxed mt-3">
                    {linkNpcs(s.summary, npcs, setViewingNpc)}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    {GDOC_LINKS[s.number] && (
                      <a
                        href={GDOC_LINKS[s.number]}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent-purple hover:text-accent-gold text-xs font-mono transition-colors"
                      >
                        <Icon name="description" className="text-sm align-middle" /> Full Notes ↗
                      </a>
                    )}
                    <button onClick={() => setDeleteId(s.id)} className="text-text-muted hover:text-accent-red text-xs font-mono">Delete session</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'New Session' : 'Edit Session'}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Session #" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) || 0 })} />
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Session 16" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Real Date" value={form.real_date} onChange={(e) => setForm({ ...form, real_date: e.target.value })} placeholder="Mar 14, 2026" />
          <Input label="In-Game Date" value={form.ingame_date} onChange={(e) => setForm({ ...form, ingame_date: e.target.value })} placeholder="Fallimall 21\u201328" />
        </div>
        <Textarea label="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={6} placeholder="What happened this session..." />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleSave}>{modal === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </Modal>
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Session">
        <ConfirmDelete onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
      </Modal>

      {/* NPC detail slideout \u2014 triggered by inline name links in summaries */}
      <NpcDetailSlideOut npc={viewingNpc} onClose={() => setViewingNpc(null)} />
    </div>
  );
}
