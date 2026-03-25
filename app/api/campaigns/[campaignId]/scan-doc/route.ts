export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { getSupabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an assistant that extracts structured D&D campaign entities from session notes.

Given the full text of a D&D session document, extract every entity you can find and generate a session summary. Return ONLY valid JSON, no markdown fences, no explanation.

Schema:
{
  "summary": string,
  "npcs": [{ "name": string, "role": string, "faction": string|null, "location": string|null, "description": string, "tags": string[], "status": "Alive"|"Deceased"|"Unknown" }],
  "loot": [{ "name": string, "details": string, "source": string, "holder": string|null, "status": "Carried"|"Known"|"Sold"|"Lost" }],
  "threads": [{ "title": string, "status": "urgent"|"active"|"dormant"|"resolved", "priority": "urgent"|"active"|"cosmic"|"personal"|"mystery", "tags": string[], "description": string }],
  "locations": [{ "name": string, "category": string, "tags": string[], "description": string }],
  "factions": [{ "name": string, "status": string, "description": string, "tags": string[] }]
}

Rules:
- "summary" should be a concise 2-4 sentence narrative summary of the key events of the session, written in past tense.
- Extract ALL named NPCs, items, plot threads, locations, and factions mentioned in the text.
- For NPCs, infer role/faction/location from context if possible. Default status to "Alive" unless death is mentioned.
- For loot, "source" is who/where the item came from. Default status to "Carried" unless the text says otherwise.
- For threads, infer priority from urgency cues in the text. Default status to "active".
- For locations, "category" should be a short type like "City", "Dungeon", "Tavern", "Region", etc.
- Keep descriptions concise (1-2 sentences).
- Tags should be lowercase, relevant keywords.
- Do NOT include entities that appear in the "already known" lists below — those already exist in the database.
- NEVER extract Player Characters as NPCs. Player characters are listed separately below — ignore them completely.
- If there are no entities of a given type, return an empty array for that type.`;

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function parseJson(text: string): unknown {
  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    // Auth
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaignId } = params;

    // Parse request
    const { doc_url } = await req.json();
    if (!doc_url) return NextResponse.json({ error: 'doc_url required' }, { status: 400 });

    const docId = extractDocId(doc_url);
    if (!docId) return NextResponse.json({ error: 'Invalid Google Docs URL' }, { status: 400 });

    // Fetch doc content
    let docText: string;
    try {
      const docRes = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!docRes.ok) {
        return NextResponse.json(
          { error: "Could not fetch document. Is it shared as 'Anyone with the link'?" },
          { status: 502 },
        );
      }
      docText = await docRes.text();
    } catch {
      return NextResponse.json(
        { error: "Could not fetch document. Is it shared as 'Anyone with the link'?" },
        { status: 502 },
      );
    }

    // Truncate if huge
    const MAX_CHARS = 100_000;
    if (docText.length > MAX_CHARS) {
      docText = docText.slice(0, MAX_CHARS);
    }

    // Fetch existing entities for dedup + player names to exclude
    const [existingNpcs, existingLoot, existingThreads, existingLocations, existingFactions, existingPlayers] = await Promise.all([
      supabaseAdmin.from('npcs').select('name').eq('campaign_id', campaignId),
      supabaseAdmin.from('loot_items').select('name').eq('campaign_id', campaignId),
      supabaseAdmin.from('threads').select('title').eq('campaign_id', campaignId),
      supabaseAdmin.from('locations').select('name').eq('campaign_id', campaignId),
      supabaseAdmin.from('factions').select('name').eq('campaign_id', campaignId),
      supabaseAdmin.from('players').select('name').eq('campaign_id', campaignId),
    ]);

    const playerNames   = new Set((existingPlayers.data ?? []).map(p => p.name.toLowerCase()));
    const npcNames      = new Set((existingNpcs.data ?? []).map(n => n.name.toLowerCase()));
    const lootNames     = new Set((existingLoot.data ?? []).map(l => l.name.toLowerCase()));
    const threadTitles  = new Set((existingThreads.data ?? []).map(t => t.title.toLowerCase()));
    const locationNames = new Set((existingLocations.data ?? []).map(l => l.name.toLowerCase()));
    const factionNames  = new Set((existingFactions.data ?? []).map(f => f.name.toLowerCase()));

    // Add player names to NPC dedup set so they're never created as NPCs
    for (const name of playerNames) npcNames.add(name);

    // Build the user message with existing names for Claude context
    const knownSection = [
      `Player Characters (NEVER extract these as NPCs): ${(existingPlayers.data ?? []).map(p => p.name).join(', ') || '(none)'}`,
      `NPCs: ${(existingNpcs.data ?? []).map(n => n.name).join(', ') || '(none)'}`,
      `Loot: ${(existingLoot.data ?? []).map(l => l.name).join(', ') || '(none)'}`,
      `Threads: ${(existingThreads.data ?? []).map(t => t.title).join(', ') || '(none)'}`,
      `Locations: ${(existingLocations.data ?? []).map(l => l.name).join(', ') || '(none)'}`,
      `Factions: ${(existingFactions.data ?? []).map(f => f.name).join(', ') || '(none)'}`,
    ].join('\n');

    const userMessage = `## Already known entities (skip these):\n${knownSection}\n\n## Session Document:\n${docText}`;

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let extracted: {
      summary?: string;
      npcs: { name: string; role: string; faction: string | null; location: string | null; description: string; tags: string[]; status: string }[];
      loot: { name: string; details: string; source: string; holder: string | null; status: string }[];
      threads: { name?: string; title: string; status: string; priority: string; tags: string[]; description: string }[];
      locations: { name: string; category: string; tags: string[]; description: string }[];
      factions: { name: string; status: string; description: string; tags: string[] }[];
    };

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type');
      extracted = parseJson(content.text) as typeof extracted;
    } catch (e) {
      console.error('Claude extraction failed:', e);
      return NextResponse.json(
        { error: 'AI extraction failed. Please try again.' },
        { status: 502 },
      );
    }

    // Deduplicate and split into created/skipped
    const dedup = <T extends { name?: string; title?: string }>(
      items: T[],
      existingSet: Set<string>,
      keyField: 'name' | 'title',
    ) => {
      const created: T[] = [];
      const skipped: T[] = [];
      for (const item of items) {
        const key = (item[keyField] as string || '').toLowerCase();
        if (!key || existingSet.has(key)) skipped.push(item);
        else created.push(item);
      }
      return { created, skipped };
    };

    const npcResult      = dedup(extracted.npcs ?? [], npcNames, 'name');
    const lootResult     = dedup(extracted.loot ?? [], lootNames, 'name');
    const threadResult   = dedup(extracted.threads ?? [], threadTitles, 'title');
    const locationResult = dedup(extracted.locations ?? [], locationNames, 'name');
    const factionResult  = dedup(extracted.factions ?? [], factionNames, 'name');

    // Batch insert new entities
    const inserts = [];

    if (npcResult.created.length > 0) {
      inserts.push(
        supabaseAdmin.from('npcs').insert(
          npcResult.created.map(n => ({
            campaign_id: campaignId,
            name: n.name,
            role: n.role || '',
            faction: n.faction || null,
            location: n.location || null,
            description: n.description || '',
            tags: n.tags || [],
            status: n.status || 'Alive',
          })),
        ),
      );
    }

    if (lootResult.created.length > 0) {
      inserts.push(
        supabaseAdmin.from('loot_items').insert(
          lootResult.created.map(l => ({
            campaign_id: campaignId,
            name: l.name,
            details: l.details || '',
            source: l.source || '',
            holder: l.holder || null,
            status: l.status || 'Carried',
          })),
        ),
      );
    }

    if (threadResult.created.length > 0) {
      inserts.push(
        supabaseAdmin.from('threads').insert(
          threadResult.created.map(t => ({
            campaign_id: campaignId,
            title: t.title,
            status: t.status || 'active',
            priority: t.priority || 'active',
            tags: t.tags || [],
            description: t.description || '',
          })),
        ),
      );
    }

    if (locationResult.created.length > 0) {
      inserts.push(
        supabaseAdmin.from('locations').insert(
          locationResult.created.map(l => ({
            campaign_id: campaignId,
            name: l.name,
            category: l.category || '',
            tags: l.tags || [],
            description: l.description || '',
          })),
        ),
      );
    }

    if (factionResult.created.length > 0) {
      inserts.push(
        supabaseAdmin.from('factions').insert(
          factionResult.created.map(f => ({
            campaign_id: campaignId,
            name: f.name,
            status: f.status || '',
            description: f.description || '',
            tags: f.tags || [],
          })),
        ),
      );
    }

    if (inserts.length > 0) {
      const results = await Promise.all(inserts);
      const insertError = results.find(r => r.error);
      if (insertError?.error) {
        console.error('Insert error:', insertError.error);
        return NextResponse.json(
          { error: `Failed to save some entities: ${insertError.error.message}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      summary: extracted.summary || null,
      created: {
        npcs:      npcResult.created.map(n => n.name),
        loot:      lootResult.created.map(l => l.name),
        threads:   threadResult.created.map(t => t.title),
        locations: locationResult.created.map(l => l.name),
        factions:  factionResult.created.map(f => f.name),
      },
      skipped: {
        npcs:      npcResult.skipped.map(n => n.name),
        loot:      lootResult.skipped.map(l => l.name),
        threads:   threadResult.skipped.map(t => t.title),
        locations: locationResult.skipped.map(l => l.name),
        factions:  factionResult.skipped.map(f => f.name),
      },
    });
  } catch (e) {
    console.error('Scan doc error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
