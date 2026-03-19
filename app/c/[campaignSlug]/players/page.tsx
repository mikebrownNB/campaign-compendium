'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/UI';
import { SlideOut } from '@/components/SlideOut';

const CHARACTERS = [
  { id: '142445729', name: 'Doc' },
  { id: '156727082', name: 'Kai' },
  { id: '94200587',  name: 'St Peter' },
  { id: '156455906', name: 'Nobjob Bob' },
  { id: '93328851',  name: 'Crankshaft' },
  { id: '156558083', name: 'Sir. Hammondstock' },
  { id: '93849241',  name: 'Korvak' },
];

type Character = typeof CHARACTERS[number];

const DNDBB_BASE = 'https://www.dndbeyond.com/characters/';

export default function PlayersPage() {
  const [selected, setSelected] = useState<Character | null>(null);

  return (
    <div className="animate-fade-in">
      <PageHeader icon="\uD83C\uDFB2" title="Player Characters" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHARACTERS.map((char, i) => (
          <button
            key={char.id}
            onClick={() => setSelected(char)}
            className="group text-left"
          >
            <div className="bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300
                            hover:bg-card-hover hover:border-border-glow hover:-translate-y-1
                            hover:shadow-lg hover:shadow-accent-gold/10 relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">\uD83C\uDFB2</span>
                <span className="font-mono text-xs text-text-muted border border-border-subtle rounded px-1.5 py-0.5">
                  PC {i + 1}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider mb-1">
                {char.name}
              </h3>
              <p className="text-text-muted text-xs font-mono">D&amp;D Beyond Sheet</p>
              <div className="mt-3 flex items-center gap-1.5 text-accent-purple/60 group-hover:text-accent-purple transition-colors">
                <span className="text-xs font-mono">View sheet \u2192</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <SlideOut
          open={selected !== null}
          onClose={() => setSelected(null)}
          title={selected.name}
          subtitle="D&D Beyond Character Sheet"
          headerExtra={
            <a
              href={`${DNDBB_BASE}${selected.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-accent-gold border border-accent-gold/30 rounded px-2 py-1
                         hover:bg-accent-gold/10 transition-colors whitespace-nowrap"
            >
              Open \u2197
            </a>
          }
        >
          <div className="w-full" style={{ height: 'calc(100vh - 140px)' }}>
            <iframe
              src={`${DNDBB_BASE}${selected.id}`}
              className="w-full h-full rounded-lg border border-border-subtle"
              title={`${selected.name} \u2014 Character Sheet`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </SlideOut>
      )}
    </div>
  );
}
