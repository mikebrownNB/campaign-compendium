'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useCampaign } from '@/lib/CampaignContext';
import type { User } from '@supabase/supabase-js';

// Shared link class helpers
const linkBase  = 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-display text-xs tracking-[0.08em] uppercase';
const linkActive = 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20';
const linkIdle   = 'text-text-secondary hover:text-text-primary hover:bg-card';

export function NavSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open,       setOpen]       = useState(false);
  const [user,       setUser]       = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const { campaign, isDM } = useCampaign();
  const base = `/c/${campaign.slug}`;

  const NAV_ITEMS = [
    { href: base,                label: 'Dashboard', icon: '⚡' },
    { href: `${base}/map`,       label: 'Map',       icon: '🗾', activePrefix: `${base}/map` },
    { href: `${base}/threads`,   label: 'Threads',   icon: '🧵' },
    { href: `${base}/calendar`,  label: 'Calendar',  icon: '📅' },
    { href: `${base}/factions`,  label: 'Factions',  icon: '⚔️' },
    { href: `${base}/locations`, label: 'Locations', icon: '🗺️' },
    { href: `${base}/npcs`,      label: 'NPCs',      icon: '👥' },
    { href: `${base}/players`,   label: 'Players',   icon: '🧙' },
    { href: `${base}/loot`,      label: 'Loot',      icon: '💰' },
    { href: `${base}/sessions`,  label: 'Sessions',  icon: '📜' },
    { href: `${base}/resources`, label: 'Resources', icon: '📚' },
    { href: `${base}/dice`,      label: 'Dice',      icon: '🎲' },
    { href: `${base}/notes`,     label: 'My Notes',  icon: '📓' },
  ];

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isAdmin      = user?.app_metadata?.role === 'admin' || user?.app_metadata?.role === 'super_admin';
  const isSuperAdmin = user?.app_metadata?.role === 'super_admin';
  const displayName  = (user?.user_metadata?.display_name as string) ?? '';
  const emailLabel   = user?.email ?? '';
  const tagline     = campaign.settings?.tagline;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border-subtle rounded-lg p-2 text-accent-gold"
        aria-label="Toggle navigation"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-56 bg-deep/95 backdrop-blur-xl border-r border-border-subtle z-40
        transition-transform duration-300 ease-in-out flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Logo — campaign branding */}
        <div className="p-6 border-b border-border-subtle">
          <Link href={base} onClick={() => setOpen(false)}>
            <h1 className="font-display text-accent-gold text-sm font-black tracking-[0.15em] leading-tight">
              {campaign.name.toUpperCase()}
            </h1>
            {campaign.subtitle && (
              <p className="font-mono text-[0.6rem] text-text-muted mt-1 tracking-wider">{campaign.subtitle.toUpperCase()}</p>
            )}
          </Link>
        </div>

        {/* Main nav */}
        <nav className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.activePrefix
              ? pathname.startsWith(item.activePrefix)
              : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`${linkBase} ${isActive ? linkActive : linkIdle}`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-border-subtle/50" />

          {/* Campaign Settings — DM only */}
          {isDM && (
            <Link
              href={`${base}/settings`}
              onClick={() => setOpen(false)}
              className={`${linkBase} ${pathname === `${base}/settings` ? linkActive : linkIdle}`}
            >
              <span className="text-base">🛠️</span>
              Campaign Settings
            </Link>
          )}

          {/* Account */}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${pathname === '/account' ? linkActive : linkIdle}`}
          >
            <span className="text-base">⚙️</span>
            Account
          </Link>

          {/* Users — admin only */}
          {isAdmin && (
            <Link
              href="/admin/users"
              onClick={() => setOpen(false)}
              className={`${linkBase} ${pathname === '/admin/users' ? linkActive : linkIdle}`}
            >
              <span className="text-base">🛡️</span>
              Users
            </Link>
          )}

          {/* Campaigns — super admin only */}
          {isSuperAdmin && (
            <Link
              href="/admin/campaigns"
              onClick={() => setOpen(false)}
              className={`${linkBase} ${pathname === '/admin/campaigns' ? linkActive : linkIdle}`}
            >
              <span className="text-base">🗺️</span>
              Campaigns
            </Link>
          )}

          {/* Switch Campaign */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={`${linkBase} text-text-muted hover:text-accent-purple hover:bg-card`}
          >
            <span className="text-base">↩</span>
            Switch Campaign
          </Link>
        </nav>

        {/* Bottom: user info + logout */}
        <div className="p-4 border-t border-border-subtle">
          {user && (
            <div className="mb-3">
              <p className="font-mono text-[0.65rem] text-text-primary truncate">{displayName || emailLabel}</p>
              {displayName && <p className="font-mono text-[0.55rem] text-text-muted truncate">{emailLabel}</p>}
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full text-left flex items-center gap-2 font-mono text-[0.65rem] text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
          >
            <span>→</span>
            {signingOut ? 'Signing out...' : 'Log Out'}
          </button>
          {tagline && (
            <p className="font-mono text-[0.5rem] text-text-muted text-center leading-relaxed mt-3">
              &ldquo;{tagline}&rdquo;
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
