'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useCampaign } from '@/lib/CampaignContext';
import type { PersonalNote, NoteUser } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { SlideOut } from '@/components/SlideOut';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';

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
        <Icon name="person" className="text-xs" /> from {note.owner_name}
      </span>
    );
  }
  if (note.shared_with_all) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
        <Icon name="public" className="text-xs" /> All members
      </span>
    );
  }
  if (note.shared_with.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
        <Icon name="groups" className="text-xs" /> {note.shared_with.length} {note.shared_with.length === 1 ? 'person' : 'people'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-card text-text-muted border border-border-subtle">
      <Icon name="lock" className="text-xs" /> Private
    </span>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

type Toast = { id: string; message: string };

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-4 bg-card border border-accent-purple/40 text-text-primary text-sm font-mono px-8 py-5 rounded-xl shadow-lg animate-fade-in"
        >
          <span className="text-accent-purple">✎</span>
          {t.message}
        </div>
      ))}
    </div>
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
  const [slideOpen,  setSlideOpen]  = useState(false);
  const [slideMode,  setSlideMode]  = useState<'create' | 'edit'>('create');
  const [editNote,   setEditNote]   = useState<PersonalNote | null>(null);
  const [form,       setForm]       = useState(emptyForm);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // Accordion + delete state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  // Toast notifications
  const [toasts,    setToasts]    = useState<Toast[]>([]);
  const suppressRef = useRef<Set<string>>(new Set()); // note IDs we just saved ourselves
  const membersRef  = useRef<NoteUser[]>([]);          // latest members for realtime handler

  const addToast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

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

    const supabase = getSupabaseBrowser();

    // Current user info
    supabase.auth.getUser().then(({ data }) => {
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
        const mapped = data.map((m) => ({
          id:           m.user_id,
          display_name: m.display_name || m.email || m.user_id,
        }));
        setMembers(mapped);
        membersRef.current = mapped;
      });

    // ── Realtime: watch for note updates by other users ──────────────────────
    const channel = supabase
      .channel(`personal_notes_updates_${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'personal_notes' },
        (payload) => {
          const updated = payload.new as { id: string; title: string; content: string; user_id: string; updated_at: string; updated_by?: string };

          // Skip events we triggered ourselves
          if (suppressRef.current.has(updated.id)) {
            suppressRef.current.delete(updated.id);
            return;
          }

          // Only act if this note is already visible to us
          setNotes((prev) => {
            const existing = prev.find((n) => n.id === updated.id);
            if (!existing) return prev;

            const editorName = updated.updated_by
              ? (membersRef.current.find((m) => m.id === updated.updated_by)?.display_name ?? 'Someone')
              : 'Someone';
            addToast(`"${updated.title}" was updated by ${editorName}`);

            return prev.map((n) =>
              n.id === updated.id
                ? { ...n, title: updated.title, content: updated.content, updated_at: updated.updated_at, updated_by: updated.updated_by, updated_by_name: updated.updated_by ? (membersRef.current.find((m) => m.id === updated.updated_by)?.display_name) : undefined }
                : n,
            );
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotes, campaignId, addToast]);

  // Filter self out of the member list once we know who we are
  const shareableMembers = members.filter((m) => m.id !== currentUid);

  // ── slideout helpers ──────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm);
    setEditNote(null);
    setSlideMode('create');
    setSaveError(null);
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
    setSaveError(null);
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
    setSaveError(null);
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
          setSlideOpen(false);
        } else {
          const body = await res.json().catch(() => ({}));
          setSaveError(body.error ?? `Save failed (HTTP ${res.status})`);
        }
      } else if (editNote) {
        // Suppress the realtime echo for our own save
        suppressRef.current.add(editNote.id);
        const res = await fetch(`/api/campaigns/${campaignId}/personal-notes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editNote.id, ...payload }),
        });
        if (res.ok) {
          const updated = await res.json();
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          setSlideOpen(false);
        } else {
          // Save failed — remove suppress so the next real event isn't swallowed
          suppressRef.current.delete(editNote.id);
          const body = await res.json().catch(() => ({}));
          setSaveError(body.error ?? `Save failed (HTTP ${res.status})`);
        }
      }
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
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(note); }}
            className="text-text-muted hover:text-accent-gold text-xs font-mono transition-colors"
          >
            Edit
          </button>
          <span className={`text-accent-purple transition-transform ${expandedId === note.id ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {expandedId === note.id && (
        <div className="px-4 pb-4 pt-0 border-t border-border-subtle">
          <p className="text-text-secondary text-sm leading-relaxed mt-3 whitespace-pre-wrap">
            {note.content || <span className="italic text-text-muted">No content.</span>}
          </p>
          {note.is_owner && (
            <div className="mt-3">
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
        icon="edit_note"
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
              <EmptyState icon="edit_note" message="No notes yet. Add your first one!" />
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
            {slideMode === 'edit' && editNote?.is_owner && (
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

          {slideMode === 'edit' && editNote?.updated_at && (
            <p className="font-mono text-[0.6rem] text-text-muted/60">
              Last updated {formatDate(editNote.updated_at)}
              {editNote.updated_by_name && ` by ${editNote.updated_by_name}`}
            </p>
          )}

          {saveError && (
            <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
              <Icon name="close" className="text-sm align-middle" /> {saveError}
            </p>
          )}

          {/* Sharing — only the note owner can change sharing settings */}
          {(slideMode === 'create' || editNote?.is_owner) && (
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
          )}
        </div>
      </SlideOut>

      {/* Delete confirmation */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Note">
        <ConfirmDelete
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>

      {/* ── Realtime toasts ── */}
      <ToastStack toasts={toasts} />
    </div>
  );
}
