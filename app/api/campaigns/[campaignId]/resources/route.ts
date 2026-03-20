import { NextRequest } from 'next/server';
import { createCampaignCrudHandlers } from '@/lib/crud';

export async function GET(_req: NextRequest, { params }: { params: { campaignId: string } }) {
  const h = createCampaignCrudHandlers('resources', 'sort_order', params.campaignId);
  return h.GET();
}

export async function POST(req: NextRequest, { params }: { params: { campaignId: string } }) {
  const h = createCampaignCrudHandlers('resources', 'sort_order', params.campaignId);
  return h.POST(req);
}

export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  const h = createCampaignCrudHandlers('resources', 'sort_order', params.campaignId);
  return h.PUT(req);
}

export async function DELETE(req: NextRequest, { params }: { params: { campaignId: string } }) {
  const h = createCampaignCrudHandlers('resources', 'sort_order', params.campaignId);
  return h.DELETE(req);
}
