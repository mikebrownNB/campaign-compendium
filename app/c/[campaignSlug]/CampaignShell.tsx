'use client';

import React, { useEffect } from 'react';
import { CampaignProvider } from '@/lib/CampaignContext';
import { NavSidebar } from '@/components/NavSidebar';
import type { Campaign, CampaignMember, CampaignMap } from '@/lib/types';

function DynamicFavicon({ url }: { url?: string }) {
  useEffect(() => {
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
    return () => {
      if (link) link.href = '/favicon.ico';
    };
  }, [url]);
  return null;
}

export function CampaignShell({
  campaign,
  membership,
  maps,
  children,
}: {
  campaign: Campaign;
  membership: CampaignMember;
  maps: CampaignMap[];
  children: React.ReactNode;
}) {
  return (
    <CampaignProvider campaign={campaign} membership={membership} maps={maps}>
      <DynamicFavicon url={campaign.settings?.favicon_url} />
      <div className="flex min-h-screen">
        <NavSidebar />
        <main className="flex-1 ml-0 md:ml-56 min-h-screen">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </CampaignProvider>
  );
}
