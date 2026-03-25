'use client';

import { useState } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { useCampaign } from '@/lib/CampaignContext';
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

const empty = { number: 0, title: '', real_date: '', ingame_date: '', summary: '', doc_url: '' };

interface ScanEntityResults { npcs: string[]; loot: string[]; threads: string[]; locations: string[]; factions: string[] }
interface ScanResult { summary?: string; created: ScanEntityResults; skipped: ScanEntityResults }

const ENTITY_LABELS: { key: keyof ScanEntityResults; icon: string; label: string }[] = [
  { key: 'npcs', icon: 'groups', label: 'NPCs' },
  { key: 'loot', icon: 'paid', label: 'Loot' },
  { key: 'threads', icon: 'forum', label: 'Threads' },
  { key: 'locations', icon: 'location_on', label: 'Locations' },
  { key: 'factions', icon: 'shield', label: 'Factions' },
];

export default function SessionsPage() {
  const { campaign } = useCampaign();
  const { items, loading, create, update, remove } = useCampaignCrud<Session>('sessions');
  const { items: npcs } = useCampaignCrud<NPC>('npcs');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);

  // Scan state
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = async (session: Session) => {
    if (!session.doc_url) return;
    setScanningId(session.id);
    setScanError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/scan-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_url: session.doc_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScanResults(prev => ({ ...prev, [session.id]: data }));
      // Auto-save generated summary if the session doesn't already have one
      if (data.summary && !session.summary) {
        await update({ id: session.id, summary: data.summary });
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanningId(null);
    }
  };

  const openCreate = () => { setForm({ ...empty, number: items.length > 0 ? Math.max(...items.map(s => s.number)) + 1 : 1 }); setEditId(null); setModal('create'); };
  const openEdit = (s: Session) => { setForm({ number: s.number, title: s.title, real_date: s.real_date, ingame_date: s.ingame_date, summary: s.summary, doc_url: s.doc_url || '' }); setEditId(s.id); setModal('edit'); };
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
                  <h3 className="font-display text-base font-bold text-text-primary">
                    Session {s.number} — {s.title}
                  </h3>
                  <div className="flex gap-4 mt-1">
                    <span className="font-mono text-base text-text-muted">{s.real_date}</span>
                    <span className="font-mono text-base text-accent-purple">{s.ingame_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="text-text-muted hover:text-accent-gold text-base font-mono">Edit</button>
                  <Icon name="expand_more" className={`text-accent-purple transition-transform text-base ${expandedId === s.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {expandedId === s.id && (
                <div className="px-4 pb-4 pt-0 border-t border-border-subtle">
                  <p className="text-text-secondary text-base leading-relaxed mt-3">
                    {linkNpcs(s.summary, npcs, setViewingNpc)}
                  </p>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {s.doc_url && (
                      <a
                        href={s.doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent-purple hover:text-accent-gold text-base font-mono transition-colors"
                      >
                        <Icon name="description" className="text-base align-middle" /> Full Notes ↗
                      </a>
                    )}
                    {s.doc_url && (
                      <button
                        disabled={scanningId === s.id}
                        onClick={(e) => { e.stopPropagation(); handleScan(s); }}
                        className="text-accent-teal hover:text-accent-gold text-base font-mono transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-1"
                      >
                        <Icon name={scanningId === s.id ? 'progress_activity' : 'document_scanner'} className={`text-base ${scanningId === s.id ? 'animate-spin' : ''}`} />
                        {scanningId === s.id ? 'Scanning…' : 'Scan Document'}
                      </button>
                    )}
                    <button onClick={() => setDeleteId(s.id)} className="text-text-muted hover:text-accent-red text-base font-mono">Delete session</button>
                  </div>

                  {/* Scan error */}
                  {scanError && scanningId === null && expandedId === s.id && (
                    <div className="mt-3 bg-accent-red/10 border border-accent-red/30 rounded-lg px-4 py-3 flex items-center justify-between">
                      <p className="font-mono text-xs text-accent-red">{scanError}</p>
                      <button onClick={() => setScanError(null)} className="text-accent-red/60 hover:text-accent-red"><Icon name="close" className="text-sm" /></button>
                    </div>
                  )}

                  {/* Scan results */}
                  {scanResults[s.id] && (
                    <div className="mt-3 bg-card border border-accent-teal/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-display text-sm font-bold text-accent-teal flex items-center gap-2">
                          <Icon name="check_circle" className="text-base" /> Scan Complete
                        </h4>
                        <button
                          onClick={() => setScanResults(prev => { const next = { ...prev }; delete next[s.id]; return next; })}
                          className="text-text-muted hover:text-text-primary"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </div>
                      {scanResults[s.id].summary && (
                        <p className="text-text-secondary text-sm leading-relaxed mb-3 pb-3 border-b border-border-subtle">
                          <span className="font-display text-xs text-text-muted uppercase tracking-widest block mb-1">Generated Summary</span>
                          {scanResults[s.id].summary}
                        </p>
                      )}
                      <div className="flex flex-col gap-1.5">
                        {ENTITY_LABELS.map(({ key, icon, label }) => {
                          const created = scanResults[s.id].created[key];
                          const skipped = scanResults[s.id].skipped[key];
                          if (created.length === 0 && skipped.length === 0) return null;
                          return (
                            <div key={key} className="font-mono text-xs">
                              <Icon name={icon} className="text-sm align-middle mr-1 text-text-muted" />
                              {created.length > 0 && (
                                <span className="text-accent-teal">
                                  +{created.length} {label}: {created.join(', ')}
                                </span>
                              )}
                              {created.length > 0 && skipped.length > 0 && <span className="text-text-muted mx-1">·</span>}
                              {skipped.length > 0 && (
                                <span className="text-text-muted">
                                  {skipped.length} skipped: {skipped.join(', ')}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {ENTITY_LABELS.every(({ key }) => scanResults[s.id].created[key].length === 0 && scanResults[s.id].skipped[key].length === 0) && (
                          <p className="text-text-muted font-mono text-xs">No entities found in this document.</p>
                        )}
                      </div>
                    </div>
                  )}
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
          <Input label="In-Game Date" value={form.ingame_date} onChange={(e) => setForm({ ...form, ingame_date: e.target.value })} placeholder="Fallimall 21–28" />
        </div>
        <Textarea label="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={6} placeholder="What happened this session..." />
        <Input label="Document URL" value={form.doc_url} onChange={(e) => setForm({ ...form, doc_url: e.target.value })} placeholder="https://docs.google.com/…" />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleSave}>{modal === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </Modal>
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Session">
        <ConfirmDelete onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
      </Modal>

      {/* NPC detail slideout — triggered by inline name links in summaries */}
      <NpcDetailSlideOut npc={viewingNpc} onClose={() => setViewingNpc(null)} />
    </div>
  );
}
