'use client';

import { useState } from 'react';
import type { WidgetConfig } from '@/lib/types';

interface Props {
  widget: WidgetConfig;
  campaignId: string;
  isDM: boolean;
}

export function WidgetCard({ widget, campaignId, isDM }: Props) {
  const [fields, setFields] = useState(widget.fields);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save updated widget fields via settings API
      const res = await fetch(`/api/campaigns/${campaignId}/settings?key=widget_${widget.id}`);
      const existing = res.ok ? await res.json() : null;

      await fetch(`/api/campaigns/${campaignId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `widget_${widget.id}`,
          value: { ...widget, fields },
        }),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (widget.type === 'stat-tracker') {
    return (
      <div className="bg-card border border-accent-gold/20 rounded-lg p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold/40 to-accent-purple/40" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-accent-gold tracking-wider">{widget.name}</h3>
          {isDM && (
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className="font-mono text-[0.6rem] text-text-muted hover:text-accent-gold transition-colors"
            >
              {saving ? 'Saving...' : editing ? 'Save' : 'Edit'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f, i) => (
            <div key={i} className="bg-deep/50 rounded-lg p-3 text-center">
              <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider mb-1">{f.label}</p>
              {editing ? (
                <input
                  value={f.value}
                  onChange={e => {
                    const updated = [...fields];
                    updated[i] = { ...f, value: e.target.value };
                    setFields(updated);
                  }}
                  className="w-full bg-transparent text-center font-display text-lg font-bold text-accent-gold border-b border-border-subtle focus:outline-none focus:border-accent-gold"
                />
              ) : (
                <p className="font-display text-lg font-bold text-accent-gold">{f.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
