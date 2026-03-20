export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Verify auth and return the current user ID. All DB ops use supabaseAdmin
// so we never hit RLS policies (avoiding the personal_notes ↔ note_shares
// recursive policy loop). Auth is enforced here at the application level.
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Resolve display names for a set of user IDs
async function resolveNames(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  return Object.fromEntries(
    (data?.users ?? [])
      .filter((u) => ids.includes(u.id))
      .map((u) => [u.id, (u.user_metadata?.display_name as string) ?? u.email ?? 'Unknown']),
  );
}

// Shape a raw DB row into the full PersonalNote response shape
function formatNote(
  note: Record<string, unknown>,
  isOwner: boolean,
  ownerName?: string,
) {
  const shares = (note.note_shares as { user_id: string }[] | null) ?? [];
  return {
    id:              note.id,
    campaign_id:     note.campaign_id,
    user_id:         note.user_id,
    title:           note.title,
    content:         note.content,
    shared_with_all: note.shared_with_all ?? false,
    shared_with:     shares.map((s) => s.user_id),
    is_owner:        isOwner,
    owner_name:      ownerName,
    created_at:      note.created_at,
    updated_at:      note.updated_at,
  };
}

// GET /api/campaigns/[campaignId]/personal-notes
export async function GET(
  _req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { campaignId } = params;

    // Own notes (with share lists)
    const { data: ownRows, error: ownErr } = await supabaseAdmin
      .from('personal_notes')
      .select('*, note_shares(user_id)')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (ownErr) return NextResponse.json({ error: ownErr.message }, { status: 500 });

    // Note IDs individually shared with this user
    const { data: myShareRows } = await supabaseAdmin
      .from('note_shares')
      .select('note_id')
      .eq('user_id', userId);
    const sharedNoteIds = (myShareRows ?? []).map((r: { note_id: string }) => r.note_id);

    // Notes shared with this user (shared_with_all OR individually), not owned by them
    let sharedRows: Record<string, unknown>[] = [];
    {
      let q = supabaseAdmin
        .from('personal_notes')
        .select('*, note_shares(user_id)')
        .eq('campaign_id', campaignId)
        .neq('user_id', userId);

      if (sharedNoteIds.length > 0) {
        q = q.or(`shared_with_all.eq.true,id.in.(${sharedNoteIds.join(',')})`);
      } else {
        q = q.eq('shared_with_all', true);
      }

      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      sharedRows = (data ?? []) as Record<string, unknown>[];
    }

    // Resolve owner display names for shared notes
    const ownerIds = Array.from(new Set(sharedRows.map((n) => n.user_id as string)));
    const ownerMap = await resolveNames(ownerIds);

    const result = [
      ...(ownRows ?? []).map((n) => formatNote(n as Record<string, unknown>, true)),
      ...sharedRows.map((n) =>
        formatNote(n, false, ownerMap[n.user_id as string] ?? 'Unknown'),
      ),
    ];

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// POST /api/campaigns/[campaignId]/personal-notes
export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { campaignId } = params;

    const body = await req.json();
    const sharedWith: string[] = body.shared_with ?? [];

    const { data, error } = await supabaseAdmin
      .from('personal_notes')
      .insert({
        title:           body.title ?? '',
        content:         body.content ?? '',
        campaign_id:     campaignId,
        user_id:         userId,
        shared_with_all: body.shared_with_all ?? false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (sharedWith.length > 0) {
      await supabaseAdmin
        .from('note_shares')
        .insert(sharedWith.map((uid) => ({ note_id: data.id, user_id: uid })));
    }

    return NextResponse.json(
      formatNote({ ...data, note_shares: sharedWith.map((uid) => ({ user_id: uid })) }, true),
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[campaignId]/personal-notes
// Owners can edit everything (content + sharing settings).
// Recipients (individually shared or shared_with_all) can edit title/content only.
export async function PUT(
  req: NextRequest,
  { params: _params }: { params: { campaignId: string } },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, title, content, shared_with_all, shared_with } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Fetch the note to check ownership and current sharing state
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('personal_notes')
      .select('*, note_shares(user_id)')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const isOwner = existing.user_id === userId;

    if (!isOwner) {
      // Check whether this user is an authorised recipient
      const isSharedWithAll = existing.shared_with_all === true;
      const shares = (existing.note_shares as { user_id: string }[] | null) ?? [];
      const isRecipient = isSharedWithAll || shares.some((s) => s.user_id === userId);

      if (!isRecipient) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build the update — only the owner may change sharing settings
    const updateFields: Record<string, unknown> = {
      title,
      content,
      updated_at: new Date().toISOString(),
    };
    if (isOwner) {
      updateFields.shared_with_all = shared_with_all ?? false;
    }

    const { data, error } = await supabaseAdmin
      .from('personal_notes')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Only the owner may replace the individual share list
    let currentShares: string[];
    if (isOwner) {
      const sharedWith: string[] = shared_with ?? [];
      await supabaseAdmin.from('note_shares').delete().eq('note_id', id);
      if (sharedWith.length > 0) {
        await supabaseAdmin
          .from('note_shares')
          .insert(sharedWith.map((uid) => ({ note_id: id, user_id: uid })));
      }
      currentShares = sharedWith;
    } else {
      // Return the existing share list unchanged for recipients
      const shares = (existing.note_shares as { user_id: string }[] | null) ?? [];
      currentShares = shares.map((s) => s.user_id);
    }

    return NextResponse.json(
      formatNote(
        { ...data, note_shares: currentShares.map((uid) => ({ user_id: uid })) },
        isOwner,
      ),
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId]/personal-notes?id=<uuid>
export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: { campaignId: string } },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Only delete if the note belongs to the current user
    const { error } = await supabaseAdmin
      .from('personal_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
