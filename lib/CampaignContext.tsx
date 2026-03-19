'use client';

import { createContext, useContext } from 'react';
import type { Campaign, CampaignMember, CampaignMap } from './types';

interface CampaignContextValue {
  campaign: Campaign;
  membership: CampaignMember;
  maps: CampaignMap[];
  isDM: boolean;
}

export const CampaignContext = createContext<CampaignContextValue | null>(null);

export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within a CampaignProvider');
  return ctx;
}

export function CampaignProvider({
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
  const isDM = membership.role === 'dm';

  return (
    <CampaignContext.Provider value={{ campaign, membership, maps, isDM }}>
      {children}
    </CampaignContext.Provider>
  );
}
