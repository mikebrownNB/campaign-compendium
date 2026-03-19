import React from 'react';
import { supabase } from '@/lib/supabase';
import { getSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { CampaignShell } from './CampaignShell';

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { campaignSlug: string };
}) {
  const { campaignSlug } = params;

  // Get current user
  const serverSupabase = await getSupabaseServer();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) redirect('/login');

  // Look up campaign by slug
  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', campaignSlug)
    .single();

  if (campErr || !campaign) redirect('/');

  // Verify membership
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/');

  // Fetch maps
  const { data: maps } = await supabase
    .from('campaign_maps')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('sort_order');

  return (
    <CampaignShell
      campaign={campaign}
      membership={membership}
      maps={maps ?? []}
    >
      {children}
    </CampaignShell>
  );
}
