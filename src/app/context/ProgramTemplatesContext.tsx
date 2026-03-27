import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  ProgramTemplate, Category, TemplateStatus, Target,
} from '../components/ProgramTemplatesPage';
import { supabase } from '../lib/supabase';
import type { DbProgramTemplate, DbTemplateCategory, DbTemplateStatus } from '../lib/db/types';

// ─── Default categories & statuses (kept for seeding reference) ───────────────

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'skill',    name: 'Skill',    color: '#4F83CC', isDefault: true },
  { id: 'behavior', name: 'Behavior', color: '#E07B39', isDefault: true },
];

export const DEFAULT_STATUSES: TemplateStatus[] = [
  { id: 'disconnected', name: 'Disconnected', color: '#9CA3AF', isDefault: true },
  { id: 'not-active',   name: 'Not Active',   color: '#6B7280', isDefault: true },
  { id: 'in-progress',  name: 'In Progress',  color: '#4F83CC', isDefault: true },
  { id: 'on-hold',      name: 'On Hold',      color: '#E07B39', isDefault: true },
  { id: 'met',          name: 'Met',          color: '#2E9E63', isDefault: true },
];

// ─── DB → App mappers ─────────────────────────────────────────────────────────

function dbTemplateToApp(row: DbProgramTemplate): ProgramTemplate {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description ?? '',
    categoryId:  row.category_id ?? '',
    color:       row.color,
    statusId:    row.status_id ?? '',
    targets:     (row.targets as Target[]) ?? [],
    lastUpdated: new Date(row.last_updated),
  };
}

function dbCategoryToApp(row: DbTemplateCategory): Category {
  return { id: row.id, name: row.name, color: row.color, isDefault: row.is_default };
}

function dbStatusToApp(row: DbTemplateStatus): TemplateStatus {
  return { id: row.id, name: row.name, color: row.color, isDefault: row.is_default };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProgramTemplatesContextValue {
  templates:  ProgramTemplate[];
  categories: Category[];
  statuses:   TemplateStatus[];
  loading:    boolean;
  addTemplate:       (data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>) => void;
  updateTemplate:    (id: string, data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>) => void;
  deleteTemplate:    (id: string) => void;
  duplicateTemplate: (tpl: ProgramTemplate) => void;
  addCategory: (cat: Category) => void;
  addStatus:   (status: TemplateStatus) => void;
}

const ProgramTemplatesContext = createContext<ProgramTemplatesContextValue | null>(null);

export function ProgramTemplatesProvider({ children }: { children: React.ReactNode }) {
  const [templates,  setTemplates]  = useState<ProgramTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [statuses,   setStatuses]   = useState<TemplateStatus[]>(DEFAULT_STATUSES);
  const [loading,    setLoading]    = useState(true);

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: tplData }, { data: catData }, { data: stData }] = await Promise.all([
        supabase.from('program_templates').select('*').order('created_at'),
        supabase.from('template_categories').select('*'),
        supabase.from('template_statuses').select('*'),
      ]);
      if (cancelled) return;
      if (tplData) setTemplates(tplData.map(dbTemplateToApp));
      if (catData && catData.length > 0) setCategories(catData.map(dbCategoryToApp));
      if (stData  && stData.length  > 0) setStatuses(stData.map(dbStatusToApp));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Templates ────────────────────────────────────────────────────────────

  const addTemplate = (data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>) => {
    const id  = crypto.randomUUID();
    const now = new Date();
    const tpl: ProgramTemplate = { ...data, id, lastUpdated: now };
    setTemplates(prev => [...prev, tpl]);
    supabase.from('program_templates').insert({
      id,
      title:        data.title,
      description:  data.description || null,
      category_id:  data.categoryId  || null,
      color:        data.color,
      status_id:    data.statusId    || null,
      targets:      data.targets     as unknown as never,
      last_updated: now.toISOString(),
    }).then(({ error }) => { if (error) console.error('[Supabase] addTemplate:', error.message); });
  };

  const updateTemplate = (id: string, data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>) => {
    const now = new Date();
    setTemplates(prev => prev.map(t => t.id === id ? { ...data, id, lastUpdated: now } : t));
    supabase.from('program_templates').update({
      title:        data.title,
      description:  data.description || null,
      category_id:  data.categoryId  || null,
      color:        data.color,
      status_id:    data.statusId    || null,
      targets:      data.targets     as unknown as never,
      last_updated: now.toISOString(),
    }).eq('id', id)
      .then(({ error }) => { if (error) console.error('[Supabase] updateTemplate:', error.message); });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    supabase.from('program_templates').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[Supabase] deleteTemplate:', error.message); });
  };

  const duplicateTemplate = (tpl: ProgramTemplate) => {
    const id  = crypto.randomUUID();
    const now = new Date();
    const copy: ProgramTemplate = {
      ...tpl,
      id,
      title:       `${tpl.title} (Copy)`,
      lastUpdated: now,
      targets:     tpl.targets.map(t => ({ ...t, id: `dup-${crypto.randomUUID()}` })),
    };
    setTemplates(prev => [...prev, copy]);
    supabase.from('program_templates').insert({
      id,
      title:        copy.title,
      description:  copy.description || null,
      category_id:  copy.categoryId  || null,
      color:        copy.color,
      status_id:    copy.statusId    || null,
      targets:      copy.targets     as unknown as never,
      last_updated: now.toISOString(),
    }).then(({ error }) => { if (error) console.error('[Supabase] duplicateTemplate:', error.message); });
  };

  // ── Categories & Statuses ─────────────────────────────────────────────────

  const addCategory = (cat: Category) => {
    setCategories(prev => [...prev, cat]);
    supabase.from('template_categories')
      .insert({ id: cat.id, name: cat.name, color: cat.color, is_default: cat.isDefault })
      .then(({ error }) => { if (error) console.error('[Supabase] addCategory:', error.message); });
  };

  const addStatus = (status: TemplateStatus) => {
    setStatuses(prev => [...prev, status]);
    supabase.from('template_statuses')
      .insert({ id: status.id, name: status.name, color: status.color, is_default: status.isDefault })
      .then(({ error }) => { if (error) console.error('[Supabase] addStatus:', error.message); });
  };

  return (
    <ProgramTemplatesContext.Provider value={{
      templates, categories, statuses, loading,
      addTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
      addCategory, addStatus,
    }}>
      {children}
    </ProgramTemplatesContext.Provider>
  );
}

export function useProgramTemplates(): ProgramTemplatesContextValue {
  const ctx = useContext(ProgramTemplatesContext);
  if (!ctx) throw new Error('useProgramTemplates must be used inside ProgramTemplatesProvider');
  return ctx;
}
