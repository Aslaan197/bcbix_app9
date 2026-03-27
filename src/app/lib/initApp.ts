import { supabase } from './supabase';

// ─── Default seeds ────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: 'skill',    name: 'Skill',    color: '#4F83CC', is_default: true },
  { id: 'behavior', name: 'Behavior', color: '#E07B39', is_default: true },
];

const DEFAULT_STATUSES = [
  { id: 'disconnected', name: 'Disconnected', color: '#9CA3AF', is_default: true },
  { id: 'not-active',   name: 'Not Active',   color: '#6B7280', is_default: true },
  { id: 'in-progress',  name: 'In Progress',  color: '#4F83CC', is_default: true },
  { id: 'on-hold',      name: 'On Hold',      color: '#E07B39', is_default: true },
  { id: 'met',          name: 'Met',          color: '#2E9E63', is_default: true },
];

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedDefaultStaff(): Promise<void> {
  const { count, error } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true });

  if (error || count === null) return;

  if (count === 0) {
    await supabase.from('staff').insert({
      name: 'Agatha Jones',
      role: 'BCBA',
      avatar_color: '#4F83CC',
      initials: 'AJ',
    });
  }
}

async function seedCategories(): Promise<void> {
  const { count, error } = await supabase
    .from('template_categories')
    .select('*', { count: 'exact', head: true });

  if (error || count === null) return;

  if (count === 0) {
    await supabase.from('template_categories').insert(DEFAULT_CATEGORIES);
  }
}

async function seedStatuses(): Promise<void> {
  const { count, error } = await supabase
    .from('template_statuses')
    .select('*', { count: 'exact', head: true });

  if (error || count === null) return;

  if (count === 0) {
    await supabase.from('template_statuses').insert(DEFAULT_STATUSES);
  }
}

// ─── Main init ────────────────────────────────────────────────────────────────

export async function initApp(): Promise<void> {
  await Promise.all([
    seedDefaultStaff(),
    seedCategories(),
    seedStatuses(),
  ]);
}
