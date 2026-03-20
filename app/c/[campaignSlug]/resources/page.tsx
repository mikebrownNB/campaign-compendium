'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { PageHeader, Button, Input } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { useCampaign } from '@/lib/CampaignContext';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface Resource {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  type: 'pdf' | 'image' | 'link';
  url: string;
  sort_order: number;
  created_at: string;
}

type ResourceType = 'pdf' | 'image' | 'link';

const TYPE_ICONS: Record<ResourceType, string> = { pdf: '📄', image: '🖼️', link: '🔗' };

const emptyForm = { name: '', description: '', type: 'pdf' as ResourceType, url: '' };

export default function ResourcesPage() {
  const { isDM, campaign } = useCampaign();
  const { items: resources, create, remove, loading } = useCampaignCrud<Resource>('resources');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...resources].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const current = sorted.find((r) => r.id === activeId) ?? sorted[0] ?? null;

  const openModal = () => {
    setForm(emptyForm);
    setFile(null);
    setError(null);
    setModal(true);
  };

  const handleTypeChange = (type: ResourceType) => {
    setForm(f => ({ ...f, type, url: '' }));
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }

    let url = form.url.trim();

    if (form.type === 'pdf' || form.type === 'image') {
      if (!file) { setError('Please select a file to upload.'); return; }
      setSaving(true); setError(null);
      try {
        const supabase = getSupabaseBrowser();
        const ext = file.name.split('.').pop() ?? '';
        const path = `${campaign.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('resources').upload(path, file);
        if (uploadErr) throw new Error(uploadErr.message);
        const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(path);
        url = publicUrl;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
        setSaving(false);
        return;
      }
    } else {
      if (!url) { setError('URL is required.'); return; }
      setSaving(true); setError(null);
    }

    try {
      const newResource = await create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        url,
        sort_order: sorted.length,
      });
      setModal(false);
      setActiveId(newResource.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add resource.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await remove(id);
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <PageHeader icon="📚" title="Reference Library">
        {isDM && (
          <Button onClick={openModal}>+ Add Resource</Button>
        )}
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No resources yet.{isDM ? ' Add one above.' : ''}</p>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex items-end gap-1 border-b border-border-subtle mb-4 -mt-2 flex-wrap">
            {sorted.map((r) => {
              const isActive = (current?.id === r.id);
              return (
                <div key={r.id} className="relative group/tab flex items-end">
                  <button
                    onClick={() => setActiveId(r.id)}
                    className={`
                      relative flex items-center gap-2 px-4 py-2.5 text-xs font-display tracking-wider
                      uppercase transition-all duration-200 rounded-t-lg border border-b-0
                      ${isActive
                        ? 'bg-card border-border-glow text-accent-gold -mb-px z-10'
                        : 'bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-card/50'
                      }
                    `}
                  >
                    {isActive && (
                      <span className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg bg-gradient-to-r from-accent-gold to-accent-purple" />
                    )}
                    <span>{TYPE_ICONS[r.type]}</span>
                    {r.name}
                  </button>
                  {isDM && (
                    <button
                      onClick={() => handleRemove(r.id)}
                      className="absolute -top-1.5 -right-1 z-20 opacity-0 group-hover/tab:opacity-100 transition-opacity
                                 font-mono text-[0.55rem] text-text-muted hover:text-accent-red bg-card rounded px-1 py-0.5 border border-border-subtle"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {current?.description && (
              <span className="ml-auto pb-2.5 font-mono text-[0.6rem] text-text-muted hidden sm:block">
                {current.description}
              </span>
            )}
          </div>

          {/* Content area */}
          {current && (
            <>
              <div className="flex-1 min-h-0">
                {sorted.map((r) => (
                  <div
                    key={r.id}
                    className={`w-full h-full ${r.id === current.id ? 'block' : 'hidden'}`}
                  >
                    {r.type === 'image' ? (
                      <div className="flex items-start justify-center overflow-auto h-full py-2">
                        <Image
                          src={r.url}
                          alt={r.name}
                          width={900}
                          height={1200}
                          className="rounded-lg border border-border-subtle max-w-full h-auto"
                          style={{ objectFit: 'contain' }}
                          priority
                          unoptimized
                        />
                      </div>
                    ) : (
                      <iframe
                        src={r.url}
                        title={r.name}
                        className="w-full h-full rounded-lg border border-border-subtle"
                        style={{ minHeight: '70vh' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer strip */}
              <div className="mt-3 flex items-center justify-end gap-3">
                {current.type !== 'link' && (
                  <a
                    href={current.url}
                    download
                    className="font-mono text-xs text-accent-gold border border-accent-gold/30 rounded px-2 py-1
                               hover:bg-accent-gold/10 transition-colors"
                  >
                    Download ↓
                  </a>
                )}
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-accent-purple border border-accent-purple/30 rounded px-2 py-1
                             hover:bg-accent-purple/10 transition-colors"
                >
                  Open in new tab ↗
                </a>
              </div>
            </>
          )}
        </>
      )}

      {/* Add Resource Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Resource">
        <div className="flex flex-col gap-3">
          <Input
            label="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Smoke & Thunder"
          />
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description shown in the tab bar"
          />

          {/* Type selector */}
          <div>
            <p className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-1.5">Type</p>
            <div className="flex gap-2">
              {(['pdf', 'image', 'link'] as ResourceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-colors
                    ${form.type === t
                      ? 'border-accent-gold/60 bg-accent-gold/10 text-accent-gold'
                      : 'border-border-subtle text-text-muted hover:border-border-glow hover:text-text-primary'
                    }`}
                >
                  {TYPE_ICONS[t]} {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* File upload or URL input */}
          {form.type === 'pdf' || form.type === 'image' ? (
            <div>
              <p className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-1.5">
                {form.type === 'pdf' ? 'PDF File' : 'Image File'}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept={form.type === 'pdf' ? '.pdf' : 'image/*'}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full font-mono text-xs text-text-primary bg-card border border-border-subtle rounded px-3 py-2
                           file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-border-subtle
                           file:bg-card-hover file:text-text-primary file:font-mono file:text-xs file:cursor-pointer
                           hover:border-border-glow transition-colors"
              />
              {file && (
                <p className="font-mono text-[0.6rem] text-text-muted mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              )}
            </div>
          ) : (
            <Input
              label="URL"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
            />
          )}

          {error && (
            <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">✕ {error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? 'Uploading…' : 'Add Resource'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
