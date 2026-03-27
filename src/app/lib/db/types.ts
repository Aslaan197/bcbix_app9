// ─── Database Row Types ───────────────────────────────────────────────────────
// These mirror the Supabase schema exactly.

export interface DbLearner {
  id:           string;
  name:         string;
  avatar_color: string;
  initials:     string;
  dob:          string | null;
  created_at:   string;
}

export interface DbStaff {
  id:           string;
  name:         string;
  role:         string;
  avatar_color: string;
  initials:     string;
  created_at:   string;
}

export interface DbTemplateCategory {
  id:         string;
  name:       string;
  color:      string;
  is_default: boolean;
}

export interface DbTemplateStatus {
  id:         string;
  name:       string;
  color:      string;
  is_default: boolean;
}

export interface DbProgramTemplate {
  id:           string;
  title:        string;
  description:  string | null;
  category_id:  string | null;
  color:        string;
  status_id:    string | null;
  targets:      unknown; // jsonb — Target[]
  last_updated: string;
  created_at:   string;
}

export interface DbLearnerProgram {
  id:           string;
  learner_id:   string;
  learner_name: string;
  title:        string;
  description:  string | null;
  category_id:  string | null;
  color:        string;
  status_id:    string | null;
  targets:      unknown; // jsonb — Target[]
  progress:     number;
  last_updated: string;
  created_at:   string;
}

export interface DbSession {
  id:           string;
  session_name: string;
  students:     string[];
  providers:    string[];
  service_type: string | null;
  start_time:   string;
  end_time:     string;
  color:        string;
  notes:        string | null;
  status:       string;
  created_at:   string;
}

export interface DbSessionData {
  id:         string;
  session_id: string;
  target_id:  string;
  data_type:  string;
  data:       unknown; // jsonb
  updated_at: string;
}

export interface DbPhaseHistory {
  id:              string;
  target_id:       string;
  session_id:      string | null;
  from_phase:      string;
  to_phase:        string;
  transitioned_at: string;
  triggered_by:    string;
}

export interface DbSessionProgram {
  id:         string;
  session_id: string;
  program_id: string;
}

export interface DbSessionTarget {
  id:         string;
  session_id: string;
  program_id: string;
  target_id:  string;
}

export interface DbSessionMetric {
  id:           string;
  session_id:   string;
  target_id:    string;
  metric_value: number | null;
  trial_count:  number | null;
  created_at:   string;
}

// ─── Supabase Database generic type ──────────────────────────────────────────

// id is optional in Insert — callers may supply a client-generated UUID
// so that local state and the DB row share the same ID from the start.
type Insert<T extends { id: string; created_at?: string }> =
  Omit<T, 'id' | 'created_at'> & { id?: string };

export interface Database {
  public: {
    Tables: {
      learners: {
        Row:    DbLearner;
        Insert: Insert<DbLearner>;
        Update: Partial<Insert<DbLearner>>;
      };
      staff: {
        Row:    DbStaff;
        Insert: Insert<DbStaff>;
        Update: Partial<Insert<DbStaff>>;
      };
      template_categories: {
        Row:    DbTemplateCategory;
        Insert: DbTemplateCategory;
        Update: Partial<DbTemplateCategory>;
      };
      template_statuses: {
        Row:    DbTemplateStatus;
        Insert: DbTemplateStatus;
        Update: Partial<DbTemplateStatus>;
      };
      program_templates: {
        Row:    DbProgramTemplate;
        Insert: Omit<DbProgramTemplate, 'id' | 'created_at'>;
        Update: Partial<Omit<DbProgramTemplate, 'id' | 'created_at'>>;
      };
      learner_programs: {
        Row:    DbLearnerProgram;
        Insert: Omit<DbLearnerProgram, 'id' | 'created_at'>;
        Update: Partial<Omit<DbLearnerProgram, 'id' | 'created_at'>>;
      };
      sessions: {
        Row:    DbSession;
        Insert: Omit<DbSession, 'id' | 'created_at'>;
        Update: Partial<Omit<DbSession, 'id' | 'created_at'>>;
      };
      session_data: {
        Row:    DbSessionData;
        Insert: Omit<DbSessionData, 'id'>;
        Update: Partial<Omit<DbSessionData, 'id'>>;
      };
      phase_history: {
        Row:    DbPhaseHistory;
        Insert: Omit<DbPhaseHistory, 'id'>;
        Update: Partial<Omit<DbPhaseHistory, 'id'>>;
      };
      session_programs: {
        Row:    DbSessionProgram;
        Insert: Omit<DbSessionProgram, 'id'>;
        Update: Partial<Omit<DbSessionProgram, 'id'>>;
      };
      session_targets: {
        Row:    DbSessionTarget;
        Insert: Omit<DbSessionTarget, 'id'>;
        Update: Partial<Omit<DbSessionTarget, 'id'>>;
      };
      session_metrics: {
        Row:    DbSessionMetric;
        Insert: Omit<DbSessionMetric, 'id' | 'created_at'>;
        Update: Partial<Omit<DbSessionMetric, 'id' | 'created_at'>>;
      };
    };
  };
}
