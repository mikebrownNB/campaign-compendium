'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCampaign } from '@/lib/CampaignContext';
import { WidgetCard } from '@/components/WidgetCard';

export default function CampaignDashboardPage() {
  const { campaign, isDM } = useCampaign();
  const base = `/c/${campaign.slug}`;

  const SECTIONS = [
    { href: `${base}/threads`,   icon: '🧵', label: 'Campaign Threads', entity: 'threads',         desc: 'Active storylines and plot hooks' },
    { href: `${base}/calendar`,  icon: '📅', label: 'Calendar',         entity: 'calendar-events',  desc: 'In-game calendar with events' },
    { href: `${base}/factions`,  icon: '⚔️', label: 'Factions',         entity: 'factions',         desc: 'Organizations, guilds, and empires' },
    { href: `${base}/locations`, icon: '🗺️', label: 'Locations',        entity: 'locations',        desc: 'Cities, dungeons, and points of interest' },
    { href: `${base}/npcs`,      icon: '👥', label: 'NPCs',             entity: 'npcs',             desc: 'People and creatures of note' },
    { href: `${base}/players`,   icon: '🎲', label: 'Player Characters', entity: '',                desc: 'Party character sheets' },
    { href: `${base}/loot`,      icon: '💰', label: 'Loot & Items',     entity: 'loot-items',       desc: 'Weapons, artifacts, and treasure' },
    { href: `${base}/sessions`,  icon: '📜', label: 'Session Log',      entity: 'sessions',         desc: 'Record of each game session' },
    { href: `${base}/resources`, icon: '📚', label: 'Reference Library', entity: '',                desc: 'Rulebooks, supplements & resources' },
  ];

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      const results: Record<string, number> = {};
      await Promise.all(
        SECTIONS.filter(s => s.entity).map(async (s) => {
          try {
            const res = await fetch(`/api/campaigns/${campaign.id}/${s.entity}`);
            const data = await res.json();
            results[s.entity] = Array.isArray(data) ? data.length : 0;
          } catch {
            results[s.entity] = 0;
          }
        })
      );
      setCounts(results);
      setLoading(false);
    }
    fetchCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const widgets = campaign.settings?.widgets ?? [];

  return (
    <div className="animate-fade-in">
      <div className="text-center py-12 mb-8 border-b border-border-subtle">
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-[0.12em] uppercase bg-gradient-to-r from-accent-gold via-white to-accent-gold bg-clip-text text-transparent mb-3">
          {campaign.name}
        </h1>
        {campaign.subtitle && (
          <p className="font-display text-sm tracking-[0.25em] uppercase text-accent-purple mb-2">
            {campaign.subtitle} — Campaign Dossier
          </p>
        )}
        {campaign.settings?.tagline && (
          <p className="font-body italic text-text-secondary text-lg">
            &ldquo;{campaign.settings.tagline}&rdquo;
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <div className="bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300 hover:bg-card-hover hover:border-border-glow hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-purple/10 relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-purple to-accent-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="font-mono text-sm text-accent-gold font-bold">
                  {!s.entity ? '—' : loading ? '...' : (counts[s.entity] ?? 0)}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-text-primary tracking-wider mb-1">{s.label}</h3>
              <p className="text-text-secondary text-sm">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Configurable widgets */}
      {widgets.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map(w => (
            <WidgetCard key={w.id} widget={w} campaignId={campaign.id} isDM={isDM} />
          ))}
        </div>
      )}

      <footer className="text-center mt-12 pt-6 border-t border-border-subtle">
        <p className="font-mono text-[0.65rem] text-text-muted">{campaign.name}{campaign.subtitle ? ` — ${campaign.subtitle}` : ''}</p>
      </footer>
    </div>
  );
}
