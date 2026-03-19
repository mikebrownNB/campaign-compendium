import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Resolves a display name to the corresponding email so the login form
// only needs to ask for a name + password (no email exposed to users).
export async function GET(request: NextRequest) {
  const name = new URL(request.url).searchParams.get('name')?.trim().toLowerCase();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const match = data.users.find(
    (u) => (u.user_metadata?.display_name as string | undefined)
      ?.trim().toLowerCase() === name,
  );

  if (!match) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ email: match.email });
}
