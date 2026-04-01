import { createClient } from '@supabase/supabase-js';
import type { Database } from './db/types';

// Trim whitespace and any trailing slash so that a common .env.local formatting
// mistake doesn't silently corrupt the functions endpoint URL
// (e.g. "https://abc.supabase.co/" → "https://abc.supabase.co").
const url     = (import.meta.env.VITE_SUPABASE_URL     as string | undefined)?.trim().replace(/\/$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!url || !anonKey) {
  console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — add them to .env.local and restart the dev server.');
} else {
  console.log('[Supabase] client initialised →', url);
}

export const supabase = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'placeholder');
