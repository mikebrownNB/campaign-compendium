import { createCampaignCrudHandlers } from '@/lib/crud';
import { NextRequest } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('npcs', 'name', params.campaignId).GET();
}
export async function POST(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('npcs', 'name', params.campaignId).POST(req);
}
export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('npcs', 'name', params.campaignId).PUT(req);
}
export async function DELETE(req: NextRequest, { params }: { params: { campaignId: string } }) {
  return createCampaignCrudHandlers('npcs', 'name', params.campaignId).DELETE(req);
}
