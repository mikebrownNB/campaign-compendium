import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

/**
 * Pick the best available avatar URL from a D&D Beyond character data object.
 * The v5 API nests the avatar under `decorations.avatarUrl`; older fields
 * are checked as fallbacks.
 */
function pickAvatar(character: Record<string, any>): string | null {
  return (
    character.decorations?.avatarUrl ||
    character.decorations?.frameAvatarUrl ||
    character.decoratedAvatarUrl ||
    character.avatarUrl ||
    character.frameAvatarUrl ||
    character.backdropAvatarUrl ||
    null
  );
}

/**
 * Try the newer character-service API (v5).
 * Returns null if inaccessible or character has no avatar fields.
 */
async function tryCharacterService(characterId: string) {
  const res = await fetch(
    `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
    { headers: HEADERS, next: { revalidate: 300 } },
  );

  if (!res.ok) {
    console.error(`[dndbeyond] character-service ${characterId} → HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  const character = json?.data;

  if (!character) {
    console.error(`[dndbeyond] character-service ${characterId} → no data field. Keys: ${Object.keys(json ?? {}).join(', ')}`);
    return null;
  }

  console.log(
    `[dndbeyond] character-service ${characterId} → name="${character.name}" ` +
    `decorations.avatarUrl="${character.decorations?.avatarUrl}" ` +
    `avatarUrl="${character.avatarUrl}" decoratedAvatarUrl="${character.decoratedAvatarUrl}"`,
  );

  return character;
}

/**
 * Fall back to the older www.dndbeyond.com/character/{id}/json endpoint.
 */
async function tryLegacyEndpoint(characterId: string) {
  const res = await fetch(
    `https://www.dndbeyond.com/character/${characterId}/json`,
    { headers: HEADERS, next: { revalidate: 300 } },
  );

  if (!res.ok) {
    console.error(`[dndbeyond] legacy ${characterId} → HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  const character = json?.data;

  if (!character) {
    console.error(`[dndbeyond] legacy ${characterId} → no data field`);
    return null;
  }

  console.log(
    `[dndbeyond] legacy ${characterId} → name="${character.name}" ` +
    `avatarUrl="${character.avatarUrl}" decoratedAvatarUrl="${character.decoratedAvatarUrl}"`,
  );

  return character;
}

/**
 * GET /api/dndbeyond/[characterId]
 *
 * Server-side proxy to D&D Beyond's character APIs (avoids browser CORS).
 * Tries the v5 character-service first, then falls back to the legacy JSON endpoint.
 * Returns avatarUrl, name, race, and class/level breakdown.
 *
 * Note: private characters on D&D Beyond will return no data without auth.
 * Characters must be set to "Public" in D&D Beyond settings for this to work.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { characterId: string } },
) {
  const { characterId } = params;

  if (!/^\d+$/.test(characterId)) {
    return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
  }

  try {
    // Try v5 character-service, then legacy endpoint
    let character = await tryCharacterService(characterId);
    if (!character) {
      character = await tryLegacyEndpoint(characterId);
    }

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or set to private on D&D Beyond' },
        { status: 404 },
      );
    }

    const avatarUrl = pickAvatar(character);

    return NextResponse.json({
      avatarUrl,
      name: character.name ?? null,
      race:
        character.race?.fullName ??
        character.race?.baseName ??
        character.race?.definition?.fullName ??
        null,
      classes: (character.classes ?? []).map((c: any) => ({
        name: c.definition?.name ?? c.subclassDefinition?.name ?? '',
        level: c.level ?? 0,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[dndbeyond] fetch error for ${characterId}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
