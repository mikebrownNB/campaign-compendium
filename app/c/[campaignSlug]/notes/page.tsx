'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useCampaign } from '@/lib/CampaignContext';
import type { PersonalNote, NoteUser } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { SlideOut } from '@/components/SlideOut';
import { Modal } from '@/components/Modal';

// ── helpers ────────────────────────────────────────────────────────────────────

const emptyForm = { title: '', content: '', shared_with_all: false, shared_with: [] as string[] };

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SharingBadge({ note }: { note: PersonalNote }) {
  if (!note.is_owner) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
        👤 from {note.owner_name}
      </span>
    );
  }
  if (note.shared_with_all) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
        🌐 All members
      </span>
    );
  }
  if (note.shared_with.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
        👥 {note.shared_with.length} {note.shared_with.length === 1 ? 'person' : 'people'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-card text-text-muted border border-border-subtle">
      🔒 Private
    </span>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { campaign } = useCampaign();
  const campaignId = campaign.id;

  const [notes,       setNotes]       = useState<PersonalNote[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [members,     setMembers]     = useState<NoteUser[]>([]);
  const [currentUid,  setCurrentUid]  = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  // Slideout / form state
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'create' | 'edit'>('create');
  const [editNote,  setEditNote]  = useState<PersonalNote | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);

  // Accordion + delete state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  // ── data fetching ─────────────────────────────────────────────────────────

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/personal-notes`);
      if (res.ok) setNotes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchNotes();

    // Current user info
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const u = data.user;
        if (!u) return;
        setCurrentUid(u.id);
        const name = u.user_metadata?.display_name as string | undefined;
        if (name) setDisplayName(name);
      });

    // Campaign members for the sharing picker (exclude self after we know uid)
    fetch(`/api/campaigns/${campaignId}/members`)
      .then((r) => r.json())
      .then((data: { id: string; user_id: string; display_name?: string; email?: string }[]) => {
        if (!Array.isArray(data)) return;
        setMembers(
          data.map((m) => ({
            id:           m.user_id,
            display_name: m.display_name || m.email || m.user_id,
          })),
        );
      });
  }, [fetchNotes, campaignId]);

  // Filter self out of the member list once we know who we are
  const shareableMembers = members.filter((m) => m.id !== currentUid);

  // ── slideout helpers ──────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm);
    setEditNote(null);
    setSlideMode('create');
    setSlideOpen(true);
  };

  const openEdit = (note: PersonalNote) => {
    setForm({
      title:           note.title,
      content:         note.content,
      shared_with_all: note.shared_with_all,
      shared_with:     note.shared_with,
    });
    setEditNote(note);
    setSlideMode('edit');
    setSlideOpen(true);
  };

  const toggleSharedWith = (uid: string) => {
    setForm((f) => ({
      ...f,
      shared_with: f.shared_with.includes(uid)
        ? f.shared_with.filter((id) => id !== uid)
        : [...f.shared_with, uid],
    }));
  };

  // ── save / delete ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        shared_with: form.shared_with_all ? [] : form.shared_with,
      };
      if (slideMode === 'create') {
        const res = await fetch(`/api/campaigns/${campaignId}/personal-notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setNotes((prev) => [created, ...prev]);
        }
      } else if (editNote) {
        const res = await fetch(`/api/campaigns/${campaignId}/personal-notes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editNote.id, ...payload }),
        });
        if (res.ok) {
          const updated = await res.json();
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      }
      setSlideOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/campaigns/${campaignId}/personal-notes?id=${deleteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== deleteId));
      setDeleteId(null);
      setSlideOpen(false);
    }
  };

  // ── split notes ───────────────────────────────────────────────────────────

  const ownedNotes  = notes.filter((n) => n.is_owner);
  const sharedNotes = notes.filter((n) => !n.is_owner);

  // ── render ────────────────────────────────────────────────────────────────

  const NoteCard = ({ note }: { note: PersonalNote }) => (
    <div className="bg-card border border-border-subtle rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-card-hover transition-colors select-none"
        onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
      >
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-text-primary">{note.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-mono text-[0.65rem] text-text-muted">
              {note.updated_at && note.updated_at !== note.created_at
                ? `Updated ${formatDate(note.updated_at)}`
                : `Created ${formatDate(note.created_at)}`}
            </span>
            <SharingBadge note={note} />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {note.is_owner && (
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(note); }}
              className="text-text-muted hover:text-accent-gold text-xs font-mono transition-colors"
            >
              Edit
            </button>
          )}
          <span className={`text-accent-purple transition-transform ${expandedId === note.id ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {expandedId === note.id && (
        <div className="px-4 pb-4 pt-0 border-t border-border-subtle">
          <p className="text-text-secondary text-sm leading-relaxed mt-3 whitespace-pre-wrap">
            {note.content || <span className="italic text-text-muted">No content.</span>}
          </p>
          {note.is_owner && (
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={() => setDeleteId(note.id)}
                className="text-text-muted hover:text-accent-red text-xs font-mono transition-colors"
              >
                Delete note
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon="📓"
        title="My Notes"
        subtitle={displayName ? `Notes for ${displayName}` : 'Your personal notes'}
      >
        <Button onClick={openCreate}>+ New Note</Button>
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* My Notes */}
          <section>
            <h2 className="font-display text-xs tracking-widest text-text-muted uppercase mb-3">
              My Notes ({ownedNotes.length})
            </h2>
            {ownedNotes.length === 0 ? (
              <EmptyState icon="📓" message="No notes yet. Add your first one!" />
            ) : (
              <div className="flex flex-col gap-2">
                {ownedNotes.map((note) => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </section>

          {/* Shared with Me */}
          {sharedNotes.length > 0 && (
            <section>
              <h2 className="font-display text-xs tracking-widest text-text-muted uppercase mb-3">
                Shared with Me ({sharedNotes.length})
              </h2>
              <div className="flex flex-col gap-2">
                {sharedNotes.map((note) => <NoteCard key={note.id} note={note} />)}
              </div>
            </section>
          )}
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
              {saving ? 'Saving…' : slideMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 p-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Note title…"
          />
          <Textarea
            label="Content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={10}
            placeholder="Write your notes here…"
          />

          {/* Sharing */}
          <div className="border-t border-border-subtle pt-4">
            <p className="font-display text-xs tracking-widest text-text-muted uppercase mb-3">Sharing</p>

            {/* Share with all toggle */}
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <div
                onClick={() => setForm((f) => ({ ...f, shared_with_all: !f.shared_with_all, shared_with: [] }))}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                  form.shared_with_all ? 'bg-accent-purple' : 'bg-border-subtle'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  form.shared_with_all ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <div>
                <p className="text-sm text-text-primary font-display">Share with all members</p>
                <p className="text-[0.65rem] text-text-muted font-mono">Visible to everyone in this campaign</p>
              </div>
            </label>

            {/* Individual member list — only shown when not sharing with all */}
            {!form.shared_with_all && shareableMembers.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[0.65rem] text-text-muted mb-1">Or share with specific people:</p>
                {shareableMembers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-card-hover transition-colors"
                    onClick={() => toggleSharedWith(u.id)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                      form.shared_with.includes(u.id)
                        ? 'bg-accent-purple border-accent-purple'
                        : 'border-border-subtle bg-transparent'
                    }`}>
                      {form.shared_with.includes(u.id) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-text-secondary">{u.display_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </SlideOut>

      {/* Delete confirmation */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Note">
        <ConfirmDelete
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
