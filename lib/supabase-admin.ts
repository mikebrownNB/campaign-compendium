import { createClient } from '@supabase/supabase-js';

// Server-only admin client — uses the service role key.
// NEVER import this in client components or expose to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
