import { useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DEBOUNCE_MS = 1500;

/**
 * Returns a `save` function that debounces upserts to `session_data`.
 * Call it whenever the user records a trial — it will flush after 1.5 s of inactivity.
 */
export function useSessionAutoSave(sessionId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (targetId: string, dataType: string, data: unknown) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const { error } = await supabase.from('session_data').upsert(
          {
            session_id: sessionId,
            target_id:  targetId,
            data_type:  dataType,
            data:       data as never,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,target_id' },
        );
        if (error) console.error('[Supabase] autoSave:', error.message);
      }, DEBOUNCE_MS);
    },
    [sessionId],
  );

  return { save };
}
