'use client';

import { useCrud } from './useCrud';
import { useCampaign } from './CampaignContext';

export function useCampaignCrud<T extends { id: string }>(entity: string) {
  const { campaign } = useCampaign();
  return useCrud<T>(`/api/campaigns/${campaign.id}/${entity}`);
}
