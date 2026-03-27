-- ============================================================
-- Schedora Database Schema
-- Run this in the Supabase SQL editor once per project.
-- ============================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- RUN THIS IN SUPABASE SQL EDITOR — drops and recreates session mapping tables
-- with the correct simple schema. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════════

drop table if exists session_targets cascade;
drop table if exists session_programs cascade;

create table session_programs (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  program_id uuid not null
);

create table session_targets (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  program_id uuid not null,
  target_id  text not null
);

alter table session_programs enable row level security;
alter table session_targets  enable row level security;

drop policy if exists "allow all" on session_programs;
drop policy if exists "allow all" on session_targets;

create policy "allow all" on session_programs for all using (true) with check (true);
create policy "allow all" on session_targets  for all using (true) with check (true);

create index if not exists idx_session_programs_session_id on session_programs(session_id);
create index if not exists idx_session_targets_session_id  on session_targets(session_id);

-- ── Migrations (safe to re-run) ───────────────────────────────────────────────
-- If you already ran an earlier version of this schema, run these ALTER TABLE
-- statements once to bring your existing tables up to date.

alter table if exists learners add column if not exists dob text;

-- ─────────────────────────────────────────────────────────────────────────────

-- Learners (students receiving therapy)
create table if not exists learners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  avatar_color text not null default '#4F83CC',
  initials     text not null,
  dob          text,
  created_at   timestamptz not null default now()
);

-- Staff (BCBAs, therapists, providers)
create table if not exists staff (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text not null default 'Staff',
  avatar_color text not null default '#4F83CC',
  initials     text not null,
  created_at   timestamptz not null default now()
);

-- Program template categories
create table if not exists template_categories (
  id         text primary key,
  name       text not null,
  color      text not null,
  is_default boolean not null default false
);

-- Program template statuses
create table if not exists template_statuses (
  id         text primary key,
  name       text not null,
  color      text not null,
  is_default boolean not null default false
);

-- Program templates (master library)
-- targets stored as jsonb to preserve full Target[] structure
create table if not exists program_templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category_id  text references template_categories(id),
  color        text not null default '#4F83CC',
  status_id    text references template_statuses(id),
  targets      jsonb not null default '[]',
  last_updated timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Learner-specific programs (instantiated from templates or from scratch)
create table if not exists learner_programs (
  id           uuid primary key default gen_random_uuid(),
  learner_id   uuid not null references learners(id) on delete cascade,
  learner_name text not null,
  title        text not null,
  description  text,
  category_id  text,
  color        text not null default '#4F83CC',
  status_id    text,
  targets      jsonb not null default '[]',
  progress     int  not null default 0,
  last_updated timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Therapy sessions
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  session_name text not null,
  students     text[] not null default '{}',
  providers    text[] not null default '{}',
  service_type text,
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  color        text not null default '#4F83CC',
  notes        text,
  status       text not null default 'scheduled',
  created_at   timestamptz not null default now()
);

-- Per-target data collected during a session
create table if not exists session_data (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  target_id  text not null,
  data_type  text not null,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (session_id, target_id)
);

-- Audit trail of phase transitions
create table if not exists phase_history (
  id              uuid primary key default gen_random_uuid(),
  target_id       text not null,
  session_id      uuid references sessions(id),
  from_phase      text not null,
  to_phase        text not null,
  transitioned_at timestamptz not null default now(),
  triggered_by    text not null default 'manual'
);

-- Session → program snapshot (learner_name + program_id per session)
-- Created at session save time so programs never drift after refresh.
create table if not exists session_programs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  learner_name text not null,
  program_id   uuid not null references learner_programs(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (session_id, learner_name, program_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_learner_programs_learner_id  on learner_programs(learner_id);
create index if not exists idx_sessions_start_time          on sessions(start_time);
create index if not exists idx_session_data_session_id      on session_data(session_id);
create index if not exists idx_phase_history_target_id      on phase_history(target_id);
create index if not exists idx_session_programs_session_id  on session_programs(session_id);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table learners            enable row level security;
alter table staff               enable row level security;
alter table template_categories enable row level security;
alter table template_statuses   enable row level security;
alter table program_templates   enable row level security;
alter table learner_programs    enable row level security;
alter table sessions            enable row level security;
alter table session_data        enable row level security;
alter table phase_history       enable row level security;
alter table session_programs    enable row level security;

-- Permissive policies.
-- IMPORTANT: USING (true) only covers SELECT/UPDATE/DELETE.
-- WITH CHECK (true) is required for INSERT to work with the anon key.
-- Drop first so this script is safe to re-run.

drop policy if exists "allow all" on learners;
drop policy if exists "allow all" on staff;
drop policy if exists "allow all" on template_categories;
drop policy if exists "allow all" on template_statuses;
drop policy if exists "allow all" on program_templates;
drop policy if exists "allow all" on learner_programs;
drop policy if exists "allow all" on sessions;
drop policy if exists "allow all" on session_data;
drop policy if exists "allow all" on phase_history;
drop policy if exists "allow all" on session_programs;

create policy "allow all" on learners            for all using (true) with check (true);
create policy "allow all" on staff               for all using (true) with check (true);
create policy "allow all" on template_categories for all using (true) with check (true);
create policy "allow all" on template_statuses   for all using (true) with check (true);
create policy "allow all" on program_templates   for all using (true) with check (true);
create policy "allow all" on learner_programs    for all using (true) with check (true);
create policy "allow all" on sessions            for all using (true) with check (true);
create policy "allow all" on session_data        for all using (true) with check (true);
create policy "allow all" on phase_history       for all using (true) with check (true);
create policy "allow all" on session_programs    for all using (true) with check (true);

-- ── New tables (migration-safe: use CREATE IF NOT EXISTS) ─────────────────────

-- session_targets: individual target tracking per session.
-- Replaces session_programs for granular target-level data integrity.
-- Every target active in a session is recorded here so it survives page refresh.
create table if not exists session_targets (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  learner_name text not null,
  program_id   uuid references learner_programs(id) on delete cascade,
  target_id    text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (session_id, target_id)
);

-- session_metrics: session-level computed metric per target.
-- Populated on session finalize; consumed by the automatic phase-change engine.
create table if not exists session_metrics (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  target_id    text not null,
  metric_value numeric,
  trial_count  int,
  created_at   timestamptz not null default now(),
  unique (session_id, target_id)
);

-- ── Additional indexes ────────────────────────────────────────────────────────

create index if not exists idx_session_targets_session_id on session_targets(session_id);
create index if not exists idx_session_targets_target_id  on session_targets(target_id);
create index if not exists idx_session_metrics_session_id on session_metrics(session_id);
create index if not exists idx_session_metrics_target_id  on session_metrics(target_id);

-- ── RLS for new tables ────────────────────────────────────────────────────────

alter table session_targets enable row level security;
alter table session_metrics enable row level security;

drop policy if exists "allow all" on session_targets;
drop policy if exists "allow all" on session_metrics;

create policy "allow all" on session_targets for all using (true) with check (true);
create policy "allow all" on session_metrics for all using (true) with check (true);

-- ── Fix phase_history delete cascade ─────────────────────────────────────────
-- Old FK: RESTRICT (prevents session delete if phase_history rows exist).
-- New FK: SET NULL (session_id nulled out; audit record is preserved).
-- Safe to re-run: DROP ... IF EXISTS handles missing constraint gracefully.

alter table phase_history drop constraint if exists phase_history_session_id_fkey;
alter table phase_history add constraint phase_history_session_id_fkey
  foreign key (session_id) references sessions(id) on delete set null;

-- ══════════════════════════════════════════════════════════════════════════════
-- TROUBLESHOOTING: Run this block in the Supabase SQL editor to verify / fix
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure session_programs and session_targets exist and have correct columns
--    (safe to run even if tables already exist)

create table if not exists session_programs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  learner_name text not null,
  program_id   uuid not null references learner_programs(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (session_id, learner_name, program_id)
);

create table if not exists session_targets (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  learner_name text not null,
  program_id   uuid references learner_programs(id) on delete cascade,
  target_id    text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (session_id, target_id)
);

-- 2. Ensure RLS policies allow all operations (required for anon key inserts)

alter table session_programs enable row level security;
alter table session_targets  enable row level security;

drop policy if exists "allow all" on session_programs;
drop policy if exists "allow all" on session_targets;

create policy "allow all" on session_programs for all using (true) with check (true);
create policy "allow all" on session_targets  for all using (true) with check (true);

-- 3. Verify rows (should return 0 for a fresh DB, non-zero after saving sessions)
-- select count(*) from session_programs;
-- select count(*) from session_targets;
