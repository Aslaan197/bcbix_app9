import type { DataType } from '../components/ProgramTemplatesPage';
import type { PhaseProgressionConfig, PhaseTransitionRule } from '../components/ProgramTemplatesPage';

// ─── Score from stored session data ──────────────────────────────────────────

/**
 * Compute an aggregate { score, trials } from raw stored session data (JSONB).
 * Used by the phase evaluation engine to score historical sessions.
 * Returns null when the data is empty or the type is not evaluable.
 */
export function computeScoreFromData(
  dataType: DataType,
  storedData: unknown,
): { score: number; trials: number } | null {
  if (!storedData) return null;
  try {
    switch (dataType) {
      case 'Percent Correct': {
        const d = storedData as { sets: Array<{ trials: Array<'correct' | 'incorrect' | null> }> };
        const filled = d.sets.flatMap(s => s.trials.filter((t): t is 'correct' | 'incorrect' => t !== null));
        if (!filled.length) return null;
        return { score: (filled.filter(t => t === 'correct').length / filled.length) * 100, trials: filled.length };
      }
      case 'Frequency': {
        const d = storedData as { sets: Array<{ count: number }> };
        const total = d.sets.reduce((a, s) => a + s.count, 0);
        const n = d.sets.filter(s => s.count > 0).length;
        return n > 0 ? { score: total, trials: n } : null;
      }
      case 'Task Analysis': {
        const d = storedData as { sets: Array<{ results: Record<string, { passed: boolean | null }> }> };
        const steps = d.sets.flatMap(s => Object.values(s.results).filter(r => r.passed !== null));
        if (!steps.length) return null;
        return { score: (steps.filter(r => r.passed).length / steps.length) * 100, trials: steps.length };
      }
      case 'Custom Prompt': {
        const d = storedData as { sets: Array<{ trials: string[] }> };
        const total = d.sets.reduce((a, s) => a + s.trials.length, 0);
        return total > 0 ? { score: total, trials: total } : null;
      }
      case 'Duration': {
        const d = storedData as { sets: Array<{ recordings: number[] }> };
        const all = d.sets.flatMap(s => s.recordings);
        if (!all.length) return null;
        return { score: all.reduce((a, b) => a + b, 0) / all.length, trials: all.length };
      }
      case 'Rate': {
        const d = storedData as { sets: Array<{ entries: Array<{ duration: number; correct: number }> }> };
        const entries = d.sets.flatMap(s => s.entries.filter(e => e.duration > 0));
        if (!entries.length) return null;
        const totalCorrect  = entries.reduce((a, e) => a + e.correct, 0);
        const totalDurMins  = entries.reduce((a, e) => a + e.duration, 0) / 60;
        return totalDurMins > 0 ? { score: totalCorrect / totalDurMins, trials: entries.length } : null;
      }
      case 'Partial Interval':
      case 'Whole Interval': {
        const d = storedData as { sets: Array<{ cells: (boolean | null)[] }> };
        const cells = d.sets.flatMap(s => s.cells.filter((c): c is boolean => c !== null));
        if (!cells.length) return null;
        return { score: (cells.filter(Boolean).length / cells.length) * 100, trials: cells.length };
      }
      case 'Custom': {
        const d = storedData as { sets: Array<{ values: Record<string, unknown> }> };
        const nums = d.sets.flatMap(s =>
          Object.values(s.values)
            .map(v => typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN)
            .filter(n => !isNaN(n))
        );
        if (!nums.length) return null;
        return { score: nums.reduce((a, b) => a + b, 0) / nums.length, trials: nums.length };
      }
      default: return null;
    }
  } catch { return null; }
}

// ─── Score computation (Task 4 calculations) ──────────────────────────────────

export interface TrialData    { correct: number; total: number }
export interface IntervalData { success: number; total: number }
export interface StepData     { passed:  number; total: number }

export interface RawSessionInput {
  dataType: DataType;
  trials?:        TrialData;    // Percent Correct, Custom Prompt
  count?:         number;       // Frequency
  recordings?:    number[];     // Duration — array of values in seconds
  steps?:         StepData;     // Task Analysis
  responses?:     number;       // Rate — response count
  durationMins?:  number;       // Rate — observation window in minutes
  intervals?:     IntervalData; // Partial/Whole Interval
  numericValues?: number[];     // Custom (numeric fields only)
}

/** Returns the computed score for a session given raw data. */
export function computeScore(input: RawSessionInput): number | null {
  switch (input.dataType) {
    case 'Percent Correct':
    case 'Custom Prompt': {
      if (!input.trials || input.trials.total === 0) return null;
      return (input.trials.correct / input.trials.total) * 100;
    }
    case 'Task Analysis': {
      if (!input.steps || input.steps.total === 0) return null;
      return (input.steps.passed / input.steps.total) * 100;
    }
    case 'Frequency':
      return input.count ?? null;
    case 'Duration': {
      if (!input.recordings?.length) return null;
      return input.recordings.reduce((a, b) => a + b, 0) / input.recordings.length;
    }
    case 'Rate': {
      if (!input.responses || !input.durationMins || input.durationMins === 0) return null;
      return input.responses / input.durationMins;
    }
    case 'Partial Interval':
    case 'Whole Interval': {
      if (!input.intervals || input.intervals.total === 0) return null;
      return (input.intervals.success / input.intervals.total) * 100;
    }
    case 'Custom': {
      if (!input.numericValues?.length) return null;
      return input.numericValues.reduce((a, b) => a + b, 0) / input.numericValues.length;
    }
    case 'Text Anecdotal':
      return null;
    default:
      return null;
  }
}

// ─── UI helpers for TransitionCard ────────────────────────────────────────────

export function getThresholdLabel(dataType: DataType): string {
  switch (dataType) {
    case 'Frequency':        return 'Min Count';
    case 'Duration':         return 'Min Duration (s)';
    case 'Rate':             return 'Min Rate (resp/min)';
    default:                 return 'Accuracy %';
  }
}

export function getMetricTypeLabel(dataType: DataType): string {
  switch (dataType) {
    case 'Frequency':        return 'Count (avg per session)';
    case 'Duration':         return 'Avg duration (seconds)';
    case 'Rate':             return 'Rate (responses / min)';
    case 'Task Analysis':    return 'Step accuracy (%)';
    case 'Custom':           return 'Numeric mean';
    case 'Text Anecdotal':   return 'Not evaluated';
    default:                 return 'Accuracy (%)';
  }
}

export function getAutoMetricType(dataType: DataType): PhaseTransitionRule['metricType'] {
  switch (dataType) {
    case 'Frequency': case 'Rate': return 'Frequency';
    case 'Duration':               return 'Duration';
    case 'Task Analysis':          return 'Task Completion';
    default:                       return 'Accuracy';
  }
}

export function isEvaluable(dataType: DataType): boolean {
  return dataType !== 'Text Anecdotal';
}

// ─── Phase evaluation ─────────────────────────────────────────────────────────

export interface SessionRecord {
  score:       number;   // Computed via computeScore()
  trialsCount: number;   // Trials / recordings count
  providerId:  string;
  date:        string;   // ISO date string
}

export interface EvaluationResult {
  advanced:  boolean;
  newPhase?: string;
  rule?:     PhaseTransitionRule;
}

export interface RegressionResult {
  regressed:  boolean;
  prevPhase?: string;
  rule?:      PhaseTransitionRule;
}

/**
 * Call after each session save with the target's recent history (newest first).
 *
 * Supports allowed failures via `onFailure`:
 *   - 'reset'     → 0 allowed failures (strict consecutive)
 *   - 'allow_one' → 1 allowed failure within the window
 *
 * Window size = consecutiveSessions + allowedFailures
 * Passes required = consecutiveSessions
 * Failures allowed ≤ allowedFailures
 */
export function evaluatePhaseProgression(
  currentPhase: string,
  config: PhaseProgressionConfig,
  history: SessionRecord[], // newest first
): EvaluationResult {
  if (!config.enabled) return { advanced: false };
  const rule = config.rules.find(r => r.enabled && r.fromPhase === currentPhase);
  if (!rule) return { advanced: false };

  const allowedFailures = rule.onFailure === 'allow_one' ? 1 : 0;
  const windowSize = rule.consecutiveSessions + allowedFailures;
  const window = history.slice(0, windowSize);

  // Not enough sessions yet — require at least consecutiveSessions valid sessions
  const valid = window.filter(s => s.trialsCount >= rule.minTrialsPerSession);
  if (valid.length < rule.consecutiveSessions) return { advanced: false };

  const passes   = valid.filter(s => s.score >= rule.accuracyThreshold).length;
  const failures = valid.filter(s => s.score <  rule.accuracyThreshold).length;

  // Need sessions_required passes and no more than allowed failures
  if (passes   < rule.consecutiveSessions) return { advanced: false };
  if (failures > allowedFailures)          return { advanced: false };

  // Provider requirement
  const uniqueProviders = new Set(window.map(s => s.providerId));
  if (uniqueProviders.size < rule.minProviders) return { advanced: false };

  return { advanced: true, newPhase: rule.toPhase, rule };
}

/**
 * Regression check: run after a session if the target is already in an
 * advanced phase. If scores drop below regressionThreshold for
 * regressionSessions consecutive sessions, move back to the prior phase.
 *
 * Reads from the rule that originally progressed INTO currentPhase
 * (i.e. rule.toPhase === currentPhase && rule.regressionEnabled).
 */
export function evaluateRegression(
  currentPhase: string,
  config: PhaseProgressionConfig,
  history: SessionRecord[], // newest first
): RegressionResult {
  if (!config.enabled) return { regressed: false };

  // Find a rule whose toPhase is currentPhase and regression is enabled
  const rule = (config.rules as Array<PhaseTransitionRule & {
    regressionEnabled?: boolean;
    regressionThreshold?: number;
    regressionSessions?: number;
  }>).find(r => r.enabled && r.toPhase === currentPhase && r.regressionEnabled);
  if (!rule) return { regressed: false };

  const regressionSessions  = rule.regressionSessions  ?? 2;
  const regressionThreshold = rule.regressionThreshold ?? Math.max(rule.accuracyThreshold - 20, 0);

  const window = history.slice(0, regressionSessions);
  const valid  = window.filter(s => s.trialsCount >= rule.minTrialsPerSession);
  if (valid.length < regressionSessions) return { regressed: false };

  const allFailed = valid.every(s => s.score < regressionThreshold);
  if (!allFailed) return { regressed: false };

  return { regressed: true, prevPhase: rule.fromPhase, rule };
}
