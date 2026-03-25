'use client';

import { useState } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { Thread, ThreadStatus, ThreadPriority } from '@/lib/types';
import { useCampaign } from '@/lib/CampaignContext';
import { PageHeader, Button, Tag, Input, Textarea, Select, ConfirmDelete, EmptyState } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { SlideOut } from '@/components/SlideOut';
import { DmOnlyToggle, DmOnlyBadge } from '@/components/DmOnlyToggle';

const STATUS_OPTS = [
  { value: 'urgent',   label: 'Urgent' },
  { value: 'active',   label: 'Active' },
  { value: 'dormant',  label: 'Dormant' },
  { value: 'resolved', label: 'Resolved' },
];
const PRIORITY_OPTS = [
  { value: 'urgent',   label: 'Urgent' },
  { value: 'active',   label: 'Active' },
  { value: 'cosmic',   label: 'Cosmic' },
  { value: 'personal', label: 'Personal' },
  { value: 'mystery',  label: 'Mystery' },
];
const PRIORITY_COLORS: Record<string, string> = {
  urgent:   'border-l-accent-red',
  active:   'border-l-accent-gold',
  cosmic:   'border-l-accent-blue',
  personal: 'border-l-accent-pink',
  mystery:  'border-l-accent-teal',
};
const STATUS_DOT: Record<string, string> = {
  urgent:   'bg-accent-red animate-pulse-glow',
  active:   'bg-accent-green shadow-[0_0_6px] shadow-accent-green',
  dormant:  'bg-text-muted',
  resolved: 'bg-accent-purple',
};

const emptyThread = {
  title:       '',
  status:      'active' as ThreadStatus,
  priority:    'active' as ThreadPriority,
  tags:        [] as string[],
  description: '',
  dm_only:     false,
  dm_notes:    '',
};

export default function ThreadsPage() {
  const { isDM } = useCampaign();
  const { items, loading, create, update, remove } = useCampaignCrud<Thread>('threads');

  // Slideout state
  const [slideOpen, setSlideOpen] = useState(false);
  const [form,      setForm]      = useState(emptyThread);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Tag input
  const [tagInput, setTagInput] = useState('');

  const openCreate = () => {
    setForm(emptyThread);
    setEditId(null);
    setTagInput('');
    setSlideOpen(true);
  };

  const openEdit = (t: Thread) => {
    setForm({
      title:       t.title,
      status:      t.status,
      priority:    t.priority,
      tags:        t.tags || [],
      description: t.description,
      dm_only:     !!t.dm_only,
      dm_notes:    t.dm_notes || '',
    });
    setEditId(t.id);
    setTagInput('');
    setSlideOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editId) await update({ id: editId, ...form });
    else        await create(form);
    setSaving(false);
    setSlideOpen(false);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
      setTagInput('');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="forum" title="Campaign Threads">
        <Button onClick={openCreate}>+ New Thread</Button>
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState icon="forum" message="No threads yet. Create your first campaign thread." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((t) => (
            <div
              key={t.id}
              className={`bg-card border border-border-subtle rounded-lg p-5 border-l-4
                         ${PRIORITY_COLORS[t.priority] || 'border-l-accent-purple'}
                         hover:bg-card-hover transition-all cursor-pointer`}
              onClick={() => openEdit(t)}
            >
              <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                <h3 className="font-display text-base font-bold text-text-primary flex items-center gap-1.5">
                  {t.title}
                  {t.dm_only && <DmOnlyBadge />}
                </h3>
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-text-muted">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[t.status] || ''}`} />
                  {t.status}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {(t.tags || []).map((tag) => <Tag key={tag} variant={tag}>{tag}</Tag>)}
              </div>
              <p className="text-text-secondary text-sm line-clamp-3">{t.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit / Create Slideout ── */}
      <SlideOut
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editId ? (form.title || 'Edit Thread') : 'New Thread'}
        headerExtra={
          <div className="flex gap-1.5">
            {editId && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => { setDeleteId(editId); setSlideOpen(false); }}
              >
                Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Thread title…"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              options={STATUS_OPTS}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ThreadStatus })}
            />
            <Select
              label="Priority"
              options={PRIORITY_OPTS}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as ThreadPriority })}
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the thread…"
            rows={6}
          />

          {/* Tags */}
          <div>
            <label className="block font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">Tags</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-card border border-border-subtle rounded px-2 py-0.5 font-mono text-xs text-text-secondary"
                >
                  {tag}
                  <button
                    onClick={() => setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })}
                    className="text-text-muted hover:text-accent-red leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-deep border border-border-subtle rounded-lg px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-accent-purple"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag…"
              />
              <Button size="sm" variant="secondary" onClick={addTag}>Add</Button>
            </div>
          </div>
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
      </SlideOut>

      {/* ── Delete confirmation ── */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Thread">
        <ConfirmDelete
          onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
