'use client';

import React from 'react';
import { Icon } from '@/components/Icon';

// ===== Page Header =====
export function PageHeader({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-4 border-b-2 border-border-subtle">
      <div>
        <h2 className="font-display text-xl md:text-2xl font-bold text-accent-gold flex items-center gap-3 tracking-wider">
          <Icon name={icon} className="text-xl" /> {title}
        </h2>
        {subtitle && <p className="font-mono text-[0.65rem] text-text-muted mt-1 ml-9">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ===== Button =====
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'font-display text-xs tracking-wider uppercase rounded-lg transition-all duration-200 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-[0.65rem]', md: 'px-4 py-2.5' };
  const variants = {
    primary: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/30 hover:bg-accent-gold/20',
    secondary: 'bg-card text-text-secondary border border-border-subtle hover:text-text-primary hover:border-border-glow',
    danger: 'bg-accent-red/10 text-accent-red border border-accent-red/30 hover:bg-accent-red/20',
    ghost: 'text-text-muted hover:text-text-primary',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

// ===== Input =====
export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-3">
      {label && <label className="block font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{label}</label>}
      <input
        className="w-full bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm
                   focus:outline-none focus:border-accent-purple transition-colors placeholder:text-text-muted/50"
        {...props}
      />
    </div>
  );
}

// ===== Textarea =====
export function Textarea({ label, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="mb-3">
      {label && <label className="block font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{label}</label>}
      <textarea
        className="w-full bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm
                   focus:outline-none focus:border-accent-purple transition-colors placeholder:text-text-muted/50 min-h-[80px] resize-y"
        {...props}
      />
    </div>
  );
}

// ===== Select =====
export function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-3">
      {label && <label className="block font-mono text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{label}</label>}
      <select
        className="w-full bg-deep border border-border-subtle rounded-lg px-3 py-2 text-text-primary font-body text-sm
                   focus:outline-none focus:border-accent-purple transition-colors"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ===== Tag =====
const TAG_COLORS: Record<string, string> = {
  faction: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
  location: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
  quest: 'bg-accent-gold/20 text-accent-gold border-accent-gold/30',
  danger: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  npc: 'bg-accent-teal/20 text-accent-teal border-accent-teal/30',
  item: 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
  personal: 'bg-accent-pink/20 text-accent-pink border-accent-pink/30',
  ally: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  crew: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
  mystery: 'bg-accent-teal/20 text-accent-teal border-accent-teal/30',
  fungal: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  default: 'bg-card text-text-secondary border-border-subtle',
};

export function Tag({ children, variant }: { children: React.ReactNode; variant?: string }) {
  const colorClass = (variant && TAG_COLORS[variant]) || TAG_COLORS.default;
  return (
    <span className={`inline-block font-mono text-[0.6rem] tracking-wider uppercase px-2 py-0.5 rounded border ${colorClass}`}>
      {children}
    </span>
  );
}

// ===== Card wrapper =====
export function Card({ children, className = '', ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-card border border-border-subtle rounded-lg p-5 transition-all duration-300
                     hover:bg-card-hover hover:border-border-glow hover:-translate-y-0.5
                     hover:shadow-lg hover:shadow-accent-purple/5 relative overflow-hidden group ${className}`} {...props}>
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-purple to-accent-gold opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </div>
  );
}

// ===== Empty State =====
export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-16 text-text-muted">
      <Icon name={icon} className="text-4xl block mb-3" />
      <p className="font-body text-sm">{message}</p>
    </div>
  );
}

// ===== Confirm dialog =====
export function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle">
      <p className="text-accent-red text-sm font-body flex-1">Are you sure? This cannot be undone.</p>
      <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      <Button variant="danger" size="sm" onClick={onConfirm}>Delete</Button>
    </div>
  );
}
