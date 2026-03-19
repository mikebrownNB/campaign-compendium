import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Next.js App Router patches the global `fetch` and caches responses from all
// downstream HTTP calls (the "Data Cache"). Supabase JS uses fetch internally
// when hitting PostgREST, so without this override every read would return a
// stale cached result even after a write succeeded in the DB.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
  },
});
