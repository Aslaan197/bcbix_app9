import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionProgramRow {
  session_id: string;
  program_id: string;
}

export interface SessionTargetRow {
  session_id: string;
  program_id: string;
  target_id:  string;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveSessionMappings(
  sessionId: string,
  programs:  Array<{ id: string }>,
  targets:   Array<{ id: string; program_id: string }>,
): Promise<void> {
  console.log('[saveSessionMappings] saving…', { sessionId, programs, targets });

  if (!sessionId) {
    console.error('[saveSessionMappings] sessionId is empty — aborting');
    return;
  }

  // 1. Delete existing rows for this session
  const { error: delPErr } = await supabase
    .from('session_programs')
    .delete()
    .eq('session_id', sessionId);
  if (delPErr) console.error('[saveSessionMappings] delete session_programs:', delPErr.message);

  const { error: delTErr } = await supabase
    .from('session_targets')
    .delete()
    .eq('session_id', sessionId);
  if (delTErr) console.error('[saveSessionMappings] delete session_targets:', delTErr.message);

  // 2. Insert programs
  if (programs.length === 0) {
    console.warn('[saveSessionMappings] no programs to insert');
    return;
  }

  const programRows: SessionProgramRow[] = programs.map(p => ({
    session_id: sessionId,
    program_id: p.id,
  }));
  console.log('[saveSessionMappings] inserting session_programs:', programRows);

  const { data: pData, error: pError } = await supabase
    .from('session_programs')
    .insert(programRows)
    .select();

  if (pError) {
    console.error('[saveSessionMappings] INSERT session_programs ERROR:', pError);
    throw pError;
  }
  console.log('[saveSessionMappings] session_programs saved:', pData);

  // 3. Insert targets
  if (targets.length === 0) {
    console.warn('[saveSessionMappings] no targets to insert');
    return;
  }

  const targetRows: SessionTargetRow[] = targets.map(t => ({
    session_id: sessionId,
    program_id: t.program_id,
    target_id:  t.id,
  }));
  console.log('[saveSessionMappings] inserting session_targets:', targetRows);

  const { data: tData, error: tError } = await supabase
    .from('session_targets')
    .insert(targetRows)
    .select();

  if (tError) {
    console.error('[saveSessionMappings] INSERT session_targets ERROR:', tError);
    throw tError;
  }
  console.log('[saveSessionMappings] session_targets saved:', tData);
  console.log('[saveSessionMappings] done ✓');
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getSessionMappings(sessionId: string): Promise<{
  programs: SessionProgramRow[];
  targets:  SessionTargetRow[];
}> {
  console.log('[getSessionMappings] fetching for session:', sessionId);

  const [{ data: programs, error: pError }, { data: targets, error: tError }] =
    await Promise.all([
      supabase.from('session_programs').select('session_id, program_id').eq('session_id', sessionId),
      supabase.from('session_targets').select('session_id, program_id, target_id').eq('session_id', sessionId),
    ]);

  if (pError) {
    console.error('[getSessionMappings] session_programs error:', pError);
    throw pError;
  }
  if (tError) {
    console.error('[getSessionMappings] session_targets error:', tError);
    throw tError;
  }

  console.log('[getSessionMappings] loaded programs:', programs);
  console.log('[getSessionMappings] loaded targets:', targets);

  return {
    programs: (programs ?? []) as SessionProgramRow[],
    targets:  (targets  ?? []) as SessionTargetRow[],
  };
}
