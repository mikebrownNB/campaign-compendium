'use client';

import { useState, useEffect } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { PersonalNote } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { SlideOut } from '@/components/SlideOut';
import { Modal } from '@/components/Modal';

const empty = { title: '', content: '' };

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function NotesPage() {
  const { items, loading, create, update, remove } = useCampaignCrud<PersonalNote>('personal-notes');
  const [displayName, setDisplayName] = useState<string>('');

  // Grab the logged-in user's display name for the subtitle
  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const name = data.user?.user_metadata?.display_name as string | undefined;
        if (name) setDisplayName(name);
      });
  }, []);

  // Slideout state
  const [slideOpen,  setSlideOpen]  = useState(false);
  const [slideMode,  setSlideMode]  = useState<'create' | 'edit'>('create');
  const [editNote,   setEditNote]   = useState<PersonalNote | null>(null);
  const [form,       setForm]       = useState(empty);
  const [saving,     setSaving]     = useState(false);

  // Accordion expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const openCreate = () => {
    setForm(empty);
    setEditNote(null);
    setSlideMode('create');
    setSlideOpen(true);
  };

  const openEdit = (note: PersonalNote) => {
    setForm({ title: note.title, content: note.content });
    setEditNote(note);
    setSlideMode('edit');
    setSlideOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (slideMode === 'create') {
        await create(form);
      } else if (editNote) {
        await update({ id: editNote.id, ...form });
      }
      setSlideOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await remove(deleteId);
    setDeleteId(null);
    setSlideOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon="\uD83D\uDCD3"
        title="My Notes"
        subtitle={displayName ? `Private notes for ${displayName}` : 'Private \u2014 visible only to you'}
      >
        <Button onClick={openCreate}>+ New Note</Button>
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading\u2026</p>
      ) : items.length === 0 ? (
        <EmptyState icon="\uD83D\uDCD3" message="No notes yet. Add your first one!" />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((note) => (
            <div key={note.id} className="bg-card border border-border-subtle rounded-lg overflow-hidden">
              {/* Header row \u2014 always visible */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-card-hover transition-colors select-none"
                onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
              >
                <div>
                  <h3 className="font-display text-sm font-bold text-text-primary">{note.title}</h3>
                  <div className="flex gap-4 mt-1">
                    <span className="font-mono text-[0.65rem] text-text-muted">
                      {note.updated_at && note.updated_at !== note.created_at
                        ? `Updated ${formatDate(note.updated_at)}`
                        : `Created ${formatDate(note.created_at)}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(note); }}
                    className="text-text-muted hover:text-accent-gold text-xs font-mono transition-colors"
                  >
                    Edit
                  </button>
                  <span className={`text-accent-purple transition-transform ${expandedId === note.id ? 'rotate-180' : ''}`}>\u25BC</span>
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === note.id && (
                <div className="px-4 pb-4 pt-0 border-t border-border-subtle">
                  <p className="text-text-secondary text-sm leading-relaxed mt-3 whitespace-pre-wrap">
                    {note.content || <span className="italic text-text-muted">No content.</span>}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => setDeleteId(note.id)}
                      className="text-text-muted hover:text-accent-red text-xs font-mono transition-colors"
                    >
                      Delete note
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit slideout */}
      <SlideOut
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={slideMode === 'create' ? 'New Note' : 'Edit Note'}
        headerExtra={
          <div className="flex gap-2">
            {slideMode === 'edit' && editNote && (
              <Button
                variant="ghost"
                className="text-accent-red hover:text-accent-red"
                onClick={() => setDeleteId(editNote.id)}
              >
                Delete
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving\u2026' : slideMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 p-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Note title\u2026"
          />
          <Textarea
            label="Content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={14}
            placeholder="Write your notes here\u2026"
          />
        </div>
      </SlideOut>

      {/* Delete confirmation modal */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Note">
        <ConfirmDelete
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
