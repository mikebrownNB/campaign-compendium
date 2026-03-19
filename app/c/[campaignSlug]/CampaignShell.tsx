'use client';

import React from 'react';
import { CampaignProvider } from '@/lib/CampaignContext';
import { NavSidebar } from '@/components/NavSidebar';
import type { Campaign, CampaignMember, CampaignMap } from '@/lib/types';

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
