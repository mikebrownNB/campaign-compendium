'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaign } from '@/lib/CampaignContext';

export default function MapRoot() {
  const router = useRouter();
  const { campaign, maps } = useCampaign();

  useEffect(() => {
    if (maps.length > 0) {
      router.replace(`/c/${campaign.slug}/map/${maps[0].slug}`);
    }
  }, [maps, campaign.slug, router]);

  if (maps.length === 0) {
    return (
      <div className="fixed inset-0 md:left-56 flex items-center justify-center bg-[#12100d]">
        <p className="text-text-muted font-mono">No maps configured for this campaign.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 md:left-56 flex items-center justify-center bg-[#12100d]">
      <p className="text-text-muted font-mono text-sm">Loading map…</p>
    </div>
  );
}
