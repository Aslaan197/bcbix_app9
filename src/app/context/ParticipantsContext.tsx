import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { DbLearner, DbStaff } from '../lib/db/types';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  dob?: string;
}

export interface Provider {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
}

interface ParticipantsContextValue {
  students:  Student[];
  providers: Provider[];
  loading:   boolean;
  addStudent:     (name: string, dob?: string) => void;
  updateStudent:  (id: string, name: string) => void;
  deleteStudent:  (id: string) => void;
  addProvider:    (name: string) => void;
  updateProvider: (id: string, name: string) => void;
  deleteProvider: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  '#4F83CC', '#2E9E63', '#7C52D0', '#E05252',
  '#E07B39', '#D64F8A', '#2E9EA0', '#C4922A',
  '#5B7EF5', '#E8872B', '#17A2B8', '#6C6C6C',
];

function pickColor(index: number): string {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

function dbLearnerToStudent(row: DbLearner): Student {
  return { id: row.id, name: row.name, avatarColor: row.avatar_color, initials: row.initials, dob: row.dob ?? undefined };
}

function dbStaffToProvider(row: DbStaff): Provider {
  return { id: row.id, name: row.name, avatarColor: row.avatar_color, initials: row.initials };
}

// ─── Context ──────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __schedora_participantsCtx: ReturnType<typeof createContext<ParticipantsContextValue | null>> | undefined;
}

const ParticipantsContext: ReturnType<typeof createContext<ParticipantsContextValue | null>> =
  globalThis.__schedora_participantsCtx ??
  (globalThis.__schedora_participantsCtx = createContext<ParticipantsContextValue | null>(null));

export function ParticipantsProvider({ children }: { children: React.ReactNode }) {
  const [students,  setStudents]  = useState<Student[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading,   setLoading]   = useState(true);

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: learnersData }, { data: staffData }] = await Promise.all([
        supabase.from('learners').select('*').order('created_at'),
        supabase.from('staff').select('*').order('created_at'),
      ]);
      if (cancelled) return;
      if (learnersData) setStudents(learnersData.map(dbLearnerToStudent));
      if (staffData)    setProviders(staffData.map(dbStaffToProvider));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Students ─────────────────────────────────────────────────────────────

  function dbErr(op: string, msg: string) {
    toast.error(`Database error (${op}): ${msg}`);
  }

  // ── Students ─────────────────────────────────────────────────────────────

  const addStudent = (name: string, dob?: string) => {
    const id    = crypto.randomUUID();
    const color = pickColor(students.length);
    const item: Student = { id, name, avatarColor: color, initials: makeInitials(name), dob };
    setStudents(prev => [...prev, item]);

    // Build payload without dob first, add only if provided.
    // This avoids failing if the dob column hasn't been added yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { id, name, avatar_color: color, initials: item.initials };
    if (dob) payload.dob = dob;

    supabase.from('learners').insert(payload).then(({ error }) => {
      if (error) {
        // Roll back optimistic update on failure
        setStudents(prev => prev.filter(s => s.id !== id));
        dbErr('addStudent', error.message);
      }
    });
  };

  const updateStudent = (id: string, name: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name, initials: makeInitials(name) } : s));
    supabase.from('learners').update({ name, initials: makeInitials(name) }).eq('id', id)
      .then(({ error }) => { if (error) dbErr('updateStudent', error.message); });
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    supabase.from('learners').delete().eq('id', id)
      .then(({ error }) => { if (error) dbErr('deleteStudent', error.message); });
  };

  // ── Providers ────────────────────────────────────────────────────────────

  const addProvider = (name: string) => {
    const id    = crypto.randomUUID();
    const color = pickColor(providers.length);
    const item: Provider = { id, name, avatarColor: color, initials: makeInitials(name) };
    setProviders(prev => [...prev, item]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from('staff').insert({ id, name, role: 'Staff', avatar_color: color, initials: item.initials } as any)
      .then(({ error }) => {
        if (error) {
          setProviders(prev => prev.filter(p => p.id !== id));
          dbErr('addProvider', error.message);
        }
      });
  };

  const updateProvider = (id: string, name: string) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, name, initials: makeInitials(name) } : p));
    supabase.from('staff').update({ name, initials: makeInitials(name) }).eq('id', id)
      .then(({ error }) => { if (error) dbErr('updateProvider', error.message); });
  };

  const deleteProvider = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
    supabase.from('staff').delete().eq('id', id)
      .then(({ error }) => { if (error) dbErr('deleteProvider', error.message); });
  };

  return (
    <ParticipantsContext.Provider value={{
      students, providers, loading,
      addStudent, updateStudent, deleteStudent,
      addProvider, updateProvider, deleteProvider,
    }}>
      {children}
    </ParticipantsContext.Provider>
  );
}

export function useParticipants(): ParticipantsContextValue {
  const ctx = useContext(ParticipantsContext);
  if (!ctx) throw new Error('useParticipants must be used inside ParticipantsProvider');
  return ctx;
}
