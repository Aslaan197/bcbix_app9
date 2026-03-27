import { createClient } from '@supabase/supabase-js';
import type { Database } from './db/types';

const url     = import.meta.env.VITE_SUPABASE_URL     as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn('[Supabase] Missing env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — running in offline mode.');
}

export const supabase = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'placeholder');
