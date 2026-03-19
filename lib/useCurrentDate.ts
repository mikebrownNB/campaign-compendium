'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCampaign } from '@/lib/CampaignContext';

export interface CurrentDate {
  year: number;
  month: number;
  day: number;
}

const DEFAULT: CurrentDate = { year: 1, month: 0, day: 1 };
export const CAMPAIGN_DATE_KEY = 'campaign_date';

function lsKey(campaignId: string) {
  return `cc_campaign_date_${campaignId}`;
}

function readLocalStorage(campaignId: string): CurrentDate | null {
  try {
    const raw = localStorage.getItem(lsKey(campaignId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'year' in parsed) {
      return parsed as CurrentDate;
    }
  } catch {}
  return null;
}

export function writeLocalStorage(campaignId: string, d: CurrentDate) {
  try { localStorage.setItem(lsKey(campaignId), JSON.stringify(d)); } catch {}
}

export function useCurrentDate() {
  const { campaign } = useCampaign();
  const [currentDate, setCurrentDate] = useState<CurrentDate>(DEFAULT);
  const [mounted, setMounted] = useState(false);

  const fetchDate = useCallback(async () => {
    // Try localStorage first for instant paint
    const local = readLocalStorage(campaign.id);
    if (local) setCurrentDate(local);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/settings?key=${CAMPAIGN_DATE_KEY}`, { cache: 'no-store' });
      if (!res.ok) {
        console.error('[useCurrentDate] GET failed:', res.status);
        return;
      }
      const val = await res.json();
      if (val && typeof val === 'object' && 'year' in val) {
        setCurrentDate(val as CurrentDate);
        writeLocalStorage(campaign.id, val as CurrentDate);
      }
    } catch (err) {
      console.error('[useCurrentDate] fetch error:', err);
    } finally {
      setMounted(true);
    }
  }, [campaign.id]);

  useEffect(() => { fetchDate(); }, [fetchDate]);

  const applyDate = useCallback((d: CurrentDate) => {
    setCurrentDate(d);
    writeLocalStorage(campaign.id, d);
  }, [campaign.id]);

  return { currentDate, applyDate, mounted };
}
