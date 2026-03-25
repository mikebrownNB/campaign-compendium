'use client';

import React, { useEffect } from 'react';
import { Icon } from '@/components/Icon';

interface SlideOutProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  headerImage?: string;
  children: React.ReactNode;
  /** Stacking layer — use 1 (default) for normal slideouts, 2 for slideouts on top of other slideouts */
  layer?: 1 | 2;
}

export function SlideOut({ open, onClose, title, subtitle, headerExtra, headerImage, children, layer = 1 }: SlideOutProps) {
  const overlayZ = layer === 2 ? 'z-[250]' : 'z-[150]';
  const panelZ   = layer === 2 ? 'z-[260]' : 'z-[160]';

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    // Layer 2 registers in the capture phase so it fires (and stops) the event
    // before layer 1's bubble-phase listener can also trigger.
    const capture = layer === 2;
    if (open) {
      document.addEventListener('keydown', handleEsc, capture);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc, capture);
      document.body.style.overflow = '';
    };
  }, [open, onClose, layer]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 ${overlayZ} transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xl bg-deep border-l border-border-glow ${panelZ}
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}
                    overflow-y-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-deep/95 backdrop-blur-xl border-b border-border-subtle p-6 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {headerImage && (
                <img
                  src={headerImage}
                  alt=""
                  className="w-[125px] h-[125px] rounded-lg object-cover border border-border-subtle shrink-0"
                />
              )}
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-accent-gold tracking-wider">{title}</h2>
                {subtitle && <p className="font-mono text-xs text-text-muted mt-1">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerExtra}
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors text-2xl leading-none p-1"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </>
  );
}

/* Section inside the slideout */
export function SlideOutSection({ icon, title, children, empty }: {
  icon: string;
  title: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="font-display text-sm font-bold text-text-primary tracking-wider flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
        <Icon name={icon} className="text-base" /> {title}
      </h3>
      {children}
      {empty && (
        <p className="text-text-muted text-sm font-mono italic">{empty}</p>
      )}
    </div>
  );
}
