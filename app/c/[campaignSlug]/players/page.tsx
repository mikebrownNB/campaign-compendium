'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Button, Input } from '@/components/UI';
import { SlideOut } from '@/components/SlideOut';
import { Modal } from '@/components/Modal';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { useCampaign } from '@/lib/CampaignContext';

interface Player {
  id: string;
  name: string;
  dndbeyond_url: string;
  campaign_id: string;
  created_at: string;
}

interface DndCharacterData {
  avatarUrl: string | null;
  name: string | null;
  race: string | null;
  classes: { name: string; level: number }[];
}

const emptyForm = { name: '', dndbeyond_url: '' };

/** Extract the numeric character ID from a D&D Beyond character URL */
function extractCharacterId(url: string): string | null {
  const match = url.match(/\/characters?\/(\d+)/i);
  return match?.[1] ?? null;
}

/** Format class list as "Fighter 5 / Rogue 3" */
function formatClasses(classes: { name: string; level: number }[]): string {
  return classes.map(c => `${c.name} ${c.level}`).join(' / ');
}

export default function PlayersPage() {
  const { isDM } = useCampaign();
  const { items: players, create, remove, loading } = useCampaignCrud<Player>('players');
  const [selected, setSelected] = useState<Player | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar / character data keyed by player.id
  const [charData, setCharData] = useState<Record<string, DndCharacterData | null>>({});

  // Fetch character data from D&D Beyond for every player with a URL
  useEffect(() => {
    if (loading || players.length === 0) return;

    players.forEach(async (player) => {
      if (!player.dndbeyond_url) return;
      if (charData[player.id] !== undefined) return; // already fetched or fetching

      const characterId = extractCharacterId(player.dndbeyond_url);
      if (!characterId) return;

      try {
        const res = await fetch(`/api/dndbeyond/${characterId}`);
        if (!res.ok) {
          setCharData(prev => ({ ...prev, [player.id]: null }));
          return;
        }
        const data: DndCharacterData = await res.json();
        setCharData(prev => ({ ...prev, [player.id]: data }));
      } catch {
        setCharData(prev => ({ ...prev, [player.id]: null }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, players]);

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
        {isDM && (
          <Button onClick={() => { setForm(emptyForm); setError(null); setModal(true); }}>
            + Add Player
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No players yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((char) => {
            const data = charData[char.id];
            const avatarUrl = data?.avatarUrl ?? null;
            const classLine = data?.classes?.length ? formatClasses(data.classes) : null;
            const raceLine = data?.race ?? null;
            const isLoading = char.dndbeyond_url && charData[char.id] === undefined;

            return (
              <div key={char.id} className="group relative">
                <button
                  onClick={() => char.dndbeyond_url ? setSelected(char) : undefined}
                  className="w-full text-left"
                  disabled={!char.dndbeyond_url}
                >
                  <div className="bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300
                                  hover:bg-card-hover hover:border-border-glow hover:-translate-y-1
                                  hover:shadow-lg hover:shadow-accent-gold/10 relative overflow-hidden h-full">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Avatar */}
                    <div className="mb-3 flex items-center justify-center w-[75px] h-[75px] rounded overflow-hidden border border-accent-gold/20 bg-deep">
                      {isLoading ? (
                        <span className="text-text-muted animate-pulse text-xl">🎲</span>
                      ) : avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={char.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">🎲</span>
                      )}
                    </div>

                    <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider mb-1">
                      {char.name}
                    </h3>

                    {/* Race & class info from D&D Beyond */}
                    {(raceLine || classLine) && (
                      <div className="flex flex-col gap-0.5 mb-2">
                        {raceLine && (
                          <span className="font-mono text-[0.6rem] text-text-muted">{raceLine}</span>
                        )}
                        {classLine && (
                          <span className="font-mono text-[0.6rem] text-accent-purple/70">{classLine}</span>
                        )}
                      </div>
                    )}

                    {char.dndbeyond_url ? (
                      <div className="mt-2 flex items-center gap-1.5 text-accent-purple/60 group-hover:text-accent-purple transition-colors">
                        <span className="text-xs font-mono">View sheet →</span>
                      </div>
                    ) : (
                      <p className="text-text-muted text-xs font-mono">No sheet linked</p>
                    )}
                  </div>
                </button>

                {isDM && (
                  <button
                    onClick={() => handleRemove(char.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                               font-mono text-[0.6rem] text-text-muted hover:text-accent-red bg-card rounded px-1.5 py-0.5 border border-border-subtle"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isDM && (
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
              placeholder="https://www.dndbeyond.com/characters/12345678"
            />
            <p className="font-mono text-[0.6rem] text-text-muted -mt-1">
              Avatar and character info are fetched automatically. The character must be set to{' '}
              <span className="text-accent-gold">Public</span> in D&amp;D Beyond settings.
            </p>
            {error && (
              <p className="font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">✕ {error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Player'}</Button>
          </div>
        </Modal>
      )}

      {selected && (
        <SlideOut
          open={selected !== null}
          onClose={() => setSelected(null)}
          title={selected.name}
          subtitle={
            charData[selected.id]
              ? [charData[selected.id]?.race, charData[selected.id]?.classes?.length ? formatClasses(charData[selected.id]!.classes) : null]
                  .filter(Boolean).join(' · ')
              : 'D&D Beyond Character Sheet'
          }
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
