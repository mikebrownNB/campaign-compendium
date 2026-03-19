'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Button, Input, Textarea } from '@/components/UI';
import type { Campaign } from '@/lib/types';

export default function CampaignSelectionPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<(Campaign & { role: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', subtitle: '', description: '' });

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => { setCampaigns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const slug = form.slug.trim() || autoSlug(form.name);
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to create campaign');
        return;
      }
      const campaign = await res.json();
      router.push(`/c/${campaign.slug}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
      <div className="text-center py-12 mb-8 border-b border-border-subtle">
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-[0.12em] uppercase bg-gradient-to-r from-accent-gold via-white to-accent-gold bg-clip-text text-transparent mb-3">
          Campaign Compendium
        </h1>
        <p className="font-display text-sm tracking-[0.25em] uppercase text-accent-purple mb-2">
          Your TTRPG Campaign Dossiers
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <PageHeader icon="📚" title="My Campaigns" />
        <Button onClick={() => setShowCreate(true)}>+ New Campaign</Button>
      </div>

      {/* Create campaign form */}
      {showCreate && (
        <div className="bg-card border border-border-subtle rounded-lg p-6 mb-6">
          <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider mb-4">Create New Campaign</h3>
          <Input
            label="Campaign Name"
            value={form.name}
            onChange={e => {
              const name = e.target.value;
              setForm(f => ({ ...f, name, slug: autoSlug(name) }));
            }}
            placeholder="e.g. Curse of Strahd"
          />
          <Input
            label="URL Slug"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="curse-of-strahd"
          />
          <Input
            label="Subtitle"
            value={form.subtitle}
            onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            placeholder="e.g. Barovia"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of the campaign..."
          />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
              {creating ? 'Creating...' : 'Create Campaign'}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <p className="text-text-muted text-center py-8">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <span className="text-4xl block mb-3">📚</span>
          <p className="font-body text-sm">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campaigns.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/c/${c.slug}`)}
              className="text-left bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300 hover:bg-card-hover hover:border-border-glow hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-purple/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-purple to-accent-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display text-lg font-bold text-accent-gold tracking-wider">{c.name}</h3>
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-text-muted border border-border-subtle rounded px-2 py-0.5">
                  {c.role}
                </span>
              </div>
              {c.subtitle && (
                <p className="font-display text-xs text-accent-purple tracking-wider uppercase mb-2">{c.subtitle}</p>
              )}
              {c.description && (
                <p className="text-text-secondary text-sm line-clamp-2">{c.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
