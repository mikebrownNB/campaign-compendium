'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PageHeader } from '@/components/UI';

type Tab =
  | { id: string; label: string; icon: string; desc: string; type: 'pdf';   src: string }
  | { id: string; label: string; icon: string; desc: string; type: 'image'; src: string };

const TABS: Tab[] = [
  {
    id:    'smoke-and-thunder',
    label: 'Smoke & Thunder',
    icon:  '\uD83D\uDD2B',
    type:  'pdf',
    src:   '/pdfs/smoke-and-thunder.pdf',
    desc:  'Firearms supplement \u2014 rules, weapons & crafting',
  },
  {
    id:    'shipbuilding-rules',
    label: 'Shipbuilding Rules',
    icon:  '\u2693',
    type:  'pdf',
    src:   '/pdfs/spelljammer-shipyard.pdf',
    desc:  'Spelljammer Shipyard \u2014 vessel construction & stats',
  },
  {
    id:    'inspiration-hand',
    label: 'Inspiration Hand',
    icon:  '\uD83C\uDCCF',
    type:  'image',
    src:   '/inspiration-hand.png',
    desc:  'Tarot-style inspiration card effects reference',
  },
];

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <PageHeader icon="\uD83D\uDCDA" title="Reference Library" />

      {/* Tab bar */}
      <div className="flex items-end gap-1 border-b border-border-subtle mb-4 -mt-2 flex-wrap">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group relative flex items-center gap-2 px-4 py-2.5 text-xs font-display tracking-wider
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
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}

        {/* Right-side descriptor */}
        <span className="ml-auto pb-2.5 font-mono text-[0.6rem] text-text-muted hidden sm:block">
          {current.desc}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`w-full h-full ${tab.id === activeTab ? 'block' : 'hidden'}`}
          >
            {tab.type === 'pdf' ? (
              <iframe
                src={tab.src}
                title={tab.label}
                className="w-full h-full rounded-lg border border-border-subtle"
                style={{ minHeight: '70vh' }}
              />
            ) : (
              <div className="flex items-start justify-center overflow-auto h-full py-2">
                <Image
                  src={tab.src}
                  alt={tab.label}
                  width={900}
                  height={1200}
                  className="rounded-lg border border-border-subtle max-w-full h-auto"
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer strip */}
      <div className="mt-3 flex items-center justify-end gap-3">
        <a
          href={current.src}
          download
          className="font-mono text-xs text-accent-gold border border-accent-gold/30 rounded px-2 py-1
                     hover:bg-accent-gold/10 transition-colors"
        >
          Download \u2193
        </a>
        <a
          href={current.src}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-accent-purple border border-accent-purple/30 rounded px-2 py-1
                     hover:bg-accent-purple/10 transition-colors"
        >
          Open in new tab \u2197
        </a>
      </div>
    </div>
  );
}
