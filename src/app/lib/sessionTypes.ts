import type { DataType } from '../components/ProgramTemplatesPage';
import type { Session } from '../components/SessionCard';
import type { PromptStats } from './promptFading';

export type { PromptStats };

// ─── Set-based raw data ────────────────────────────────────────────────────────
// Each target stores its collected data as an ordered array of "sets".
// A "set" is one round of data collection (e.g. one session block).
// Internally, sets may contain trials/recordings/intervals.

export type RawTrialData =
  | {
      kind: 'percent_correct';
      sets: Array<{ id: string; phase: string; trials: Array<'correct' | 'incorrect' | null>; trialPrompts?: Array<string | null> }>;
    }
  | {
      kind: 'frequency';
      sets: Array<{ id: string; phase: string; count: number }>;
    }
  | {
      kind: 'task_analysis';
      sets: Array<{
        id: string;
        phase: string;
        steps: Array<{ id: string; name: string; passed: boolean | null; promptCode: string }>;
      }>;
    }
  | {
      kind: 'duration';
      sets: Array<{ id: string; phase: string; recordings: number[] }>;
    }
  | {
      kind: 'rate';
      sets: Array<{ id: string; phase: string; entries: Array<{ duration: number; correct: number }> }>;
    }
  | {
      kind: 'interval';
      sets: Array<{ id: string; phase: string; cells: Array<boolean | null> }>;
    }
  | {
      kind: 'text';
      sets: Array<{ id: string; phase: string; text: string }>;
    }
  | {
      kind: 'custom_prompt';
      sets: Array<{ id: string; phase: string; trials: string[] }>;
    }
  | {
      kind: 'custom';
      sets: Array<{ id: string; phase: string; values: Record<string, unknown> }>;
    };

// ─── Target summary ───────────────────────────────────────────────────────────

export interface TargetSummary {
  targetId:    string;
  sessionId:   string;
  targetName:  string;
  programName: string;
  learnerName: string;
  dataType:    DataType;
  stat:        string;     // human-readable, e.g. "S3: 85% (17/20)"
  progress:    number;     // 0–100
  trials:      number;     // total trials/recordings across all sets
  rawData?:    RawTrialData;
  /** Prompt distribution stats — populated when prompt fading is enabled on the target */
  promptStats?: PromptStats;
}

// ─── Finalized session ────────────────────────────────────────────────────────

export interface FinalizedSessionData {
  session:     Session;
  finalizedAt: string;   // ISO date string
  targets:     TargetSummary[];
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

export interface ProgramGroup {
  programName: string;
  learnerName: string;
  targets:     TargetSummary[];
}

export function groupTargetsByProgram(targets: TargetSummary[]): ProgramGroup[] {
  const map = new Map<string, ProgramGroup>();
  for (const t of targets) {
    const key = `${t.learnerName}::${t.programName}`;
    if (!map.has(key)) map.set(key, { programName: t.programName, learnerName: t.learnerName, targets: [] });
    map.get(key)!.targets.push(t);
  }
  return Array.from(map.values());
}
