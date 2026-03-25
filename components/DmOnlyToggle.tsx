'use client';

import { Icon } from '@/components/Icon';

interface DmOnlyToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Toggle for marking an entity as DM-only (hidden from players). Only render when isDM is true. */
export function DmOnlyToggle({ value, onChange }: DmOnlyToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-3 rounded-lg border border-border-subtle bg-accent-purple/5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon name="lock" className="text-sm text-accent-purple shrink-0" />
        <div className="min-w-0">
          <p className="font-mono text-xs text-text-primary">DM Only</p>
          <p className="font-mono text-[0.6rem] text-text-muted">Hidden from players</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                   transition-colors duration-200 ease-in-out focus:outline-none
                   ${value ? 'bg-accent-purple' : 'bg-border-subtle'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
                     transform transition duration-200 ease-in-out
                     ${value ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

/** Small badge shown next to entity names when dm_only is true */
export function DmOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[0.6rem] text-accent-purple bg-accent-purple/10 border border-accent-purple/30 rounded px-1.5 py-0.5 shrink-0">
      <Icon name="lock" className="text-[10px]" />
      DM
    </span>
  );
}
