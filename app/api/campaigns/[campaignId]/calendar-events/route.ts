export const dynamic = "force-dynamic";

import { supabase } from '@/lib/supabase';
import { createCampaignCrudHandlers } from '@/lib/crud';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('campaign_id', params.campaignId)
      .order('year')
      .order('month')
      .order('day');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('calendar_events', 'created_at', params.campaignId).POST(req);
}
export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('calendar_events', 'created_at', params.campaignId).PUT(req);
}
export async function DELETE(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('calendar_events', 'created_at', params.campaignId).DELETE(req);
}
