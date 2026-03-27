import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProgramTemplate, Target } from '../components/ProgramTemplatesPage';
import { supabase } from '../lib/supabase';
import type { DbLearnerProgram } from '../lib/db/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LearnerProgram {
  id: string;
  learnerId: string;
  learnerName: string;
  title: string;
  description?: string;
  categoryId: string;
  color: string;
  statusId: string;
  targets: Target[];
  lastUpdated: Date;
  progress: number;
}

interface LearnerProgramsContextValue {
  programs: LearnerProgram[];
  loading:  boolean;
  getProgramsForLearner: (learnerId: string) => LearnerProgram[];
  getProgramsByName:     (learnerName: string) => LearnerProgram[];
  addProgram:    (learnerId: string, learnerName: string, data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>) => void;
  updateProgram: (id: string, data: Partial<Omit<LearnerProgram, 'id'>>) => void;
  deleteProgram: (id: string) => void;
}

// ─── DB mapper ────────────────────────────────────────────────────────────────

function dbProgramToApp(row: DbLearnerProgram): LearnerProgram {
  return {
    id:          row.id,
    learnerId:   row.learner_id,
    learnerName: row.learner_name,
    title:       row.title,
    description: row.description ?? undefined,
    categoryId:  row.category_id ?? '',
    color:       row.color,
    statusId:    row.status_id ?? '',
    targets:     (row.targets as Target[]) ?? [],
    progress:    row.progress,
    lastUpdated: new Date(row.last_updated),
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LearnerProgramsContext = createContext<LearnerProgramsContextValue | null>(null);

export function LearnerProgramsProvider({ children }: { children: React.ReactNode }) {
  const [programs, setPrograms] = useState<LearnerProgram[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from('learner_programs')
        .select('*')
        .order('created_at');
      if (cancelled) return;
      if (error) console.error('[Supabase] loadPrograms:', error.message);
      if (data)  setPrograms(data.map(dbProgramToApp));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────

  const getProgramsForLearner = (learnerId: string) =>
    programs.filter(p => p.learnerId === learnerId);

  const getProgramsByName = (learnerName: string) =>
    programs.filter(p => p.learnerName === learnerName);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addProgram = (
    learnerId:   string,
    learnerName: string,
    data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>,
  ) => {
    const id  = crypto.randomUUID();
    const now = new Date();
    const program: LearnerProgram = {
      ...data,
      id,
      learnerId,
      learnerName,
      lastUpdated: now,
      progress: 0,
      targets: data.targets.map(t => ({ ...t, config: { ...t.config } })),
    };
    setPrograms(prev => [...prev, program]);
    supabase.from('learner_programs').insert({
      id,
      learner_id:   learnerId,
      learner_name: learnerName,
      title:        data.title,
      description:  data.description || null,
      category_id:  data.categoryId  || null,
      color:        data.color,
      status_id:    data.statusId    || null,
      targets:      data.targets     as unknown as never,
      progress:     0,
      last_updated: now.toISOString(),
    }).then(({ error }) => { if (error) console.error('[Supabase] addProgram:', error.message); });
  };

  const updateProgram = (id: string, data: Partial<Omit<LearnerProgram, 'id'>>) => {
    const now = new Date();
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data, lastUpdated: now } : p));

    const patch: Record<string, unknown> = { last_updated: now.toISOString() };
    if (data.title       !== undefined) patch.title        = data.title;
    if (data.description !== undefined) patch.description  = data.description || null;
    if (data.categoryId  !== undefined) patch.category_id  = data.categoryId  || null;
    if (data.color       !== undefined) patch.color        = data.color;
    if (data.statusId    !== undefined) patch.status_id    = data.statusId    || null;
    if (data.targets     !== undefined) patch.targets      = data.targets as unknown;
    if (data.progress    !== undefined) patch.progress     = data.progress;

    supabase.from('learner_programs').update(patch as never).eq('id', id)
      .then(({ error }) => { if (error) console.error('[Supabase] updateProgram:', error.message); });
  };

  const deleteProgram = (id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    supabase.from('learner_programs').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[Supabase] deleteProgram:', error.message); });
  };

  return (
    <LearnerProgramsContext.Provider
      value={{ programs, loading, getProgramsForLearner, getProgramsByName, addProgram, updateProgram, deleteProgram }}
    >
      {children}
    </LearnerProgramsContext.Provider>
  );
}

export function useLearnerPrograms(): LearnerProgramsContextValue {
  const ctx = useContext(LearnerProgramsContext);
  if (!ctx) throw new Error('useLearnerPrograms must be used inside LearnerProgramsProvider');
  return ctx;
}
