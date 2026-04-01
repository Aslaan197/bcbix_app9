// ─── Prompt Fading — Core Engine ──────────────────────────────────────────────
// Implements the ABA least-to-most / most-to-least prompt fading system.
// Hierarchy (index 0 = most intrusive, last = least intrusive / independent).

export const PROMPT_HIERARCHY = ['FP', 'PP', 'M', 'G', 'V', 'I'] as const;
export type PromptLevel = typeof PROMPT_HIERARCHY[number];

export const PROMPT_LABELS: Record<PromptLevel, string> = {
  FP: 'Full Physical',
  PP: 'Partial Physical',
  M:  'Model',
  G:  'Gestural',
  V:  'Verbal',
  I:  'Independent',
};

// ─── Configuration (stored on each Target) ────────────────────────────────────

export type FadeTemplate = 'most-to-least' | 'least-to-most' | 'manual' | 'ai';
export type FadeRule     = 'consecutive' | 'accuracy';
export type EvalType     = 'trials' | 'sessions';

export interface PromptFadingConfig {
  enabled:              boolean;
  template:             FadeTemplate;
  /** consecutive = N correct in a row; accuracy = % correct over a window */
  fadeRule:             FadeRule;
  /** Rolling window of N trials (consecutive mode) or min trials window (accuracy mode) */
  windowSize:           number;
  /** Allow 1 incorrect in the window before blocking a fade */
  allowOneFailure:      boolean;
  /** Accuracy threshold 0–1: fade (move to less intrusive) when accuracy ≥ this */
  accuracyThreshold:    number;
  /** Minimum eligible trials needed before accuracy mode can trigger fade */
  minTrials:            number;
  /** Whether to evaluate per-trial rolling window or across session groups */
  evaluationType:       EvalType;
  /** Consecutive session groups required to meet criteria before fading (sessions mode) */
  minSessions:          number;
  /** Automatically regress to more intrusive prompt after poor performance */
  regressionEnabled:    boolean;
  /**
   * Minimum trials to evaluate before regression can trigger.
   * In the simplified UI this equals the "Minimum Trials" value for the Increase section.
   */
  regressionWindowSize: number;
  /**
   * Regression threshold 0–1: regress (move to more intrusive) when accuracy < this.
   * 0 = fall back to legacy all-incorrect check.
   * Simplified UI default: 0.50 (50%).
   */
  regressionThreshold:  number;
  /** Prompt codes excluded from fading evaluation (still shown in data entry) */
  excludedPromptCodes:  string[];
}

export const DEFAULT_PROMPT_FADING_CONFIG: PromptFadingConfig = {
  enabled:              false,
  template:             'most-to-least',
  fadeRule:             'accuracy',
  windowSize:           3,
  allowOneFailure:      false,
  accuracyThreshold:    0.80,
  minTrials:            3,
  evaluationType:       'trials',
  minSessions:          3,
  regressionEnabled:    true,
  regressionWindowSize: 3,
  regressionThreshold:  0.50,
  excludedPromptCodes:  [],
};

// ─── Hierarchy navigation ─────────────────────────────────────────────────────

/**
 * Returns the next less intrusive level (fade direction).
 * Returns null if already at Independent.
 */
export function fadeToNextLevel(current: string): PromptLevel | null {
  const idx = PROMPT_HIERARCHY.indexOf(current as PromptLevel);
  if (idx === -1 || idx === PROMPT_HIERARCHY.length - 1) return null;
  return PROMPT_HIERARCHY[idx + 1];
}

/**
 * Returns the next more intrusive level (regression direction).
 * Returns null if already at Full Physical.
 */
export function regressToPrevLevel(current: string): PromptLevel | null {
  const idx = PROMPT_HIERARCHY.indexOf(current as PromptLevel);
  if (idx <= 0) return null;
  return PROMPT_HIERARCHY[idx - 1];
}

export function isValidPromptLevel(level: string): level is PromptLevel {
  return (PROMPT_HIERARCHY as readonly string[]).includes(level);
}

// ─── Rolling window evaluation ────────────────────────────────────────────────

export interface PromptTrial {
  isCorrect:   boolean;
  promptLevel: string;
  /** If true, this trial is excluded from fading logic (e.g. no-response) */
  exclude?:    boolean;
}

export type FadingDecision = 'fade' | 'regress' | 'hold';

// ── Internal helpers ──────────────────────────────────────────────────────────

function checkConsecutive(
  currentLevel:    string,
  window:          PromptTrial[],
  allowOneFailure: boolean,
): boolean {
  if (!window.every(t => t.promptLevel === currentLevel)) return false;
  const failures = window.filter(t => !t.isCorrect).length;
  return failures <= (allowOneFailure ? 1 : 0);
}

function checkAccuracy(
  currentLevel:    string,
  trials:          PromptTrial[],
  threshold:       number,
  allowOneFailure: boolean,
): boolean {
  const atLevel  = trials.filter(t => t.promptLevel === currentLevel);
  if (atLevel.length === 0) return false;
  const correct  = atLevel.filter(t => t.isCorrect).length;
  const failures = atLevel.length - correct;
  if (allowOneFailure && failures <= 1 && atLevel.length >= 2) {
    // With one allowed failure, check if removing it would meet threshold
    return (atLevel.length - 1) / atLevel.length >= threshold;
  }
  return correct / atLevel.length >= threshold;
}

function allFailing(window: PromptTrial[]): boolean {
  return window.length > 0 && window.every(t => !t.isCorrect);
}

/**
 * Evaluate whether to fade, regress, or hold the current prompt level.
 *
 * @param currentPromptLevel  Active prompt level before this evaluation.
 * @param recentTrials        All trials newest-first. Set exclude:true to skip trials.
 * @param config              Prompt fading configuration for this target.
 * @param sessionGroups       Trials grouped by session, newest group first.
 *                            When provided and evaluationType === 'sessions', each group
 *                            is treated as one session unit (e.g. one data collection set).
 *
 * Rules:
 *   consecutive/trials — last N trials ALL correct AND ALL at currentPromptLevel
 *   accuracy/trials    — accuracy ≥ threshold over minTrials trials at currentPromptLevel
 *   sessions mode      — above criteria must be met across minSessions consecutive groups
 *   regression         — last N trials ALL incorrect (any level) → move back
 */
export function evaluatePromptFading(
  currentPromptLevel: string,
  recentTrials:       PromptTrial[],
  config:             PromptFadingConfig,
  sessionGroups?:     PromptTrial[][],
): FadingDecision {
  if (!config.enabled) return 'hold';

  const excluded  = config.excludedPromptCodes  ?? [];
  const fadeRule  = config.fadeRule             ?? 'consecutive';
  const evalType  = config.evaluationType       ?? 'trials';
  const regWinSz  = (config.regressionWindowSize > 0
    ? config.regressionWindowSize
    : config.windowSize) ?? 3;

  // ── Sessions mode ─────────────────────────────────────────────────────────
  if (evalType === 'sessions' && sessionGroups && sessionGroups.length > 0) {
    const minS = config.minSessions ?? 3;
    if (sessionGroups.length < minS) return 'hold';
    const recent = sessionGroups.slice(0, minS);

    const sessionPasses = (sg: PromptTrial[]) => {
      const elig = sg.filter(t => !t.exclude && !excluded.includes(t.promptLevel));
      if (elig.length === 0) return false;
      if (fadeRule === 'accuracy') {
        return checkAccuracy(currentPromptLevel, elig, config.accuracyThreshold, config.allowOneFailure);
      }
      return checkConsecutive(
        currentPromptLevel,
        elig.slice(0, config.windowSize),
        config.allowOneFailure,
      );
    };

    const sessionFails = (sg: PromptTrial[]) => {
      const elig = sg.filter(t => !t.exclude && !excluded.includes(t.promptLevel));
      return allFailing(elig.slice(0, regWinSz));
    };

    if (recent.every(sessionPasses)) return 'fade';
    if (config.regressionEnabled && recent.every(sessionFails)) return 'regress';
    return 'hold';
  }

  // ── Trials mode ───────────────────────────────────────────────────────────
  const eligible = recentTrials.filter(t => !t.exclude && !excluded.includes(t.promptLevel));

  if (fadeRule === 'accuracy') {
    const minT    = config.minTrials ?? config.windowSize;
    const evalWin = eligible.slice(0, Math.max(config.windowSize, minT));

    // ─ Fade check ─────────────────────────────────────────────────────────
    if (evalWin.length >= minT) {
      if (checkAccuracy(currentPromptLevel, evalWin, config.accuracyThreshold, config.allowOneFailure)) {
        return 'fade';
      }
    }

    // ─ Regression check ───────────────────────────────────────────────────
    if (config.regressionEnabled) {
      const regThreshold = config.regressionThreshold ?? 0;
      if (regThreshold > 0) {
        // Threshold-based: regress when accuracy at current level < regressionThreshold
        const regMinT = regWinSz;
        const regWin  = eligible.slice(0, regMinT);
        if (regWin.length >= regMinT) {
          const atLevel  = regWin.filter(t => t.promptLevel === currentPromptLevel);
          if (atLevel.length > 0) {
            const accuracy = atLevel.filter(t => t.isCorrect).length / atLevel.length;
            if (accuracy < regThreshold) return 'regress';
          }
        }
      } else {
        // Legacy: regress when all recent trials are incorrect
        const rw = eligible.slice(0, regWinSz);
        if (rw.length >= regWinSz && allFailing(rw)) return 'regress';
      }
    }
    return 'hold';
  }

  // Consecutive mode (original logic, enhanced)
  const window = eligible.slice(0, config.windowSize);
  if (window.length < config.windowSize) return 'hold';
  if (checkConsecutive(currentPromptLevel, window, config.allowOneFailure)) return 'fade';
  if (config.regressionEnabled) {
    const rw = eligible.slice(0, regWinSz);
    if (rw.length >= regWinSz && allFailing(rw)) return 'regress';
  }
  return 'hold';
}

// ─── Prompt distribution stats ────────────────────────────────────────────────

export interface PromptStats {
  /** Map of promptLevel code → count of trials at that level */
  distribution:   Record<string, number>;
  /** Percentage of trials recorded at the Independent level */
  pctIndependent: number;
  /** Total recorded (non-null) trials */
  totalTrials:    number;
}

/**
 * Compute prompt distribution across a set of trial results + per-trial prompts.
 * Arrays must be parallel (same index = same trial).
 * Null entries in trialResults are skipped (unrecorded slots).
 */
export function computePromptStats(
  trialResults: ('correct' | 'incorrect' | null)[],
  trialPrompts: (string | null)[],
): PromptStats {
  const distribution: Record<string, number> = {};
  let indCount = 0;
  let total    = 0;

  for (let i = 0; i < trialResults.length; i++) {
    if (trialResults[i] === null) continue;
    const prompt = trialPrompts[i] ?? 'Unknown';
    distribution[prompt] = (distribution[prompt] ?? 0) + 1;
    if (prompt === 'I') indCount++;
    total++;
  }

  return {
    distribution,
    pctIndependent: total > 0 ? Math.round((indCount / total) * 100) : 0,
    totalTrials:    total,
  };
}
