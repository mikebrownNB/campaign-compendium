'use client';

import { useState } from 'react';
import { PageHeader, Button, Input } from '@/components/UI';
import { SlideOut } from '@/components/SlideOut';
import { Modal } from '@/components/Modal';
import { useCampaignCrud } from '@/lib/useCampaignCrud';

interface Player {
  id: string;
  name: string;
  dndbeyond_url: string;
  campaign_id: string;
  created_at: string;
}

const emptyForm = { name: '', dndbeyond_url: '' };

export default function PlayersPage() {
  const { items: players, create, remove, loading } = useCampaignCrud<Player>('players');
  const [selected, setSelected] = useState<Player | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError(null);
    try {
      await create(form);
      setForm(emptyForm);
      setModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add player.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await remove(id);
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="🎲" title="Player Characters">
        <Button onClick={() => { setForm(emptyForm); setError(null); setModal(true); }}>
          + Add Player
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No players yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((char, i) => (
            <div key={char.id} className="group relative">
              <button
                onClick={() => char.dndbeyond_url ? setSelected(char) : undefined}
                className="w-full text-left"
              >
                <div className="bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300
                                hover:bg-card-hover hover:border-border-glow hover:-translate-y-1
                                hover:shadow-lg hover:shadow-accent-gold/10 relative overflow-hidden h-full">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">🎲</span>
                    <span className="font-mono text-xs text-text-muted border border-border-subtle rounded px-1.5 py-0.5">
                      PC {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider mb-1">
                    {char.name}
                  </h3>
                  {char.dndbeyond_url ? (
                    <div className="mt-3 flex items-center gap-1.5 text-accent-purple/60 group-hover:text-accent-purple transition-colors">
                      <span className="text-xs font-mono">View sheet →</span>
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs font-mono">No sheet linked</p>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleRemove(char.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                           font-mono text-[0.6rem] text-text-muted hover:text-accent-red bg-card rounded px-1.5 py-0.5 border border-border-subtle"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Player">
        <div className="flex flex-col gap-3">
          <Input
            label="Character Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Doc"
          />
          <Input
            label="D&D Beyond URL"
            value={form.dndbeyond_url}
            onChange={e => setForm(f => ({ ...f, dndbeyond_url: e.target.value }))}
            placeholder="https://www.dndbeyond.com/characters/..."
          />
          {error && (
            <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">✕ {error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Player'}</Button>
        </div>
      </Modal>

      {selected && (
        <SlideOut
          open={selected !== null}
          onClose={() => setSelected(null)}
          title={selected.name}
          subtitle="D&D Beyond Character Sheet"
          headerExtra={
            <a
              href={selected.dndbeyond_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-accent-gold border border-accent-gold/30 rounded px-2 py-1
                         hover:bg-accent-gold/10 transition-colors whitespace-nowrap"
            >
              Open ↗
            </a>
          }
        >
          <div className="w-full" style={{ height: 'calc(100vh - 140px)' }}>
            <iframe
              src={selected.dndbeyond_url}
              className="w-full h-full rounded-lg border border-border-subtle"
              title={`${selected.name} — Character Sheet`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </SlideOut>
      )}
    </div>
  );
}
