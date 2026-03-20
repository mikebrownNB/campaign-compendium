import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dndbeyond/[characterId]
 *
 * Server-side proxy to D&D Beyond's character service API.
 * Avoids CORS errors from the browser, and returns just the avatar URL
 * and a few useful fields rather than the full character blob.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { characterId: string } },
) {
  const { characterId } = params;

  // Validate: must be a numeric ID
  if (!/^\d+$/.test(characterId)) {
    return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        // Cache for 5 minutes so repeated page loads don't hammer D&D Beyond
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `D&D Beyond returned ${res.status}` },
        { status: res.status },
      );
    }

    const json = await res.json();
    const character = json?.data;

    if (!character) {
      return NextResponse.json({ error: 'No character data' }, { status: 404 });
    }

    // D&D Beyond avatar fields (fall through in order of preference)
    const avatarUrl: string | null =
      character.decoratedAvatarUrl ||
      character.avatarUrl ||
      null;

    return NextResponse.json({
      avatarUrl,
      name: character.name ?? null,
      race: character.race?.fullName ?? character.race?.baseName ?? null,
      classes: (character.classes ?? []).map((c: any) => ({
        name: c.definition?.name ?? '',
        level: c.level ?? 0,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
