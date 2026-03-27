import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Plus, Check, Play, Square, Pause,
  BarChart2, Layers, Settings2, RotateCcw, Trash2,
  Hash, Activity, AlignLeft, Minus,
  CheckCircle2, XCircle, LayoutGrid, Volume2, Target,
  ClipboardList, Timer, ArrowLeft, BookOpen,
} from 'lucide-react';
import type { FinalizedSessionData, TargetSummary, RawTrialData } from '../lib/sessionTypes';
import { useTheme, AppColors } from '../context/ThemeContext';
import { Session } from './SessionCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import type {
  Target as ProgramTarget, DataType,
  PromptDefinition,
} from './ProgramTemplatesPage';
import { useLearnerPrograms } from '../context/LearnerProgramsContext';
import type { LearnerProgram } from '../context/LearnerProgramsContext';
import { supabase } from '../lib/supabase';
import { getSessionMappings, saveSessionMappings } from '../lib/sessionMappings';
import type { SessionTargetRow } from '../lib/sessionMappings';
import {
  evaluatePhaseProgression,
  evaluateRegression,
  computeScoreFromData,
} from '../lib/evaluatePhaseProgression';
import type { SessionRecord } from '../lib/evaluatePhaseProgression';

// ─── Default prompts ──────────────────────────────────────────────────────────

const DEFAULT_PROMPTS: PromptDefinition[] = [
  { id: 'p-i',  name: 'Independent',      code: 'I',  passFail: 'pass' },
  { id: 'p-g',  name: 'Gesture',          code: 'G',  passFail: 'fail' },
  { id: 'p-v',  name: 'Verbal',           code: 'V',  passFail: 'fail' },
  { id: 'p-m',  name: 'Model',            code: 'M',  passFail: 'fail' },
  { id: 'p-pp', name: 'Partial Physical', code: 'PP', passFail: 'fail' },
  { id: 'p-fp', name: 'Full Physical',    code: 'FP', passFail: 'fail' },
];

export type { ProgramTarget as DataTarget };

// ─── Phase badges ─────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  Baseline: '#9CA3AF', Intervention: '#4F83CC',
  Maintenance: '#2E9E63', Generalization: '#7C52D0', Mastery: '#E07B39',
};

function PhaseBadge({ phase }: { phase: string }) {
  const color = PHASE_COLORS[phase] ?? '#9CA3AF';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 500, color,
      backgroundColor: `${color}18`,
      padding: '2px 8px', borderRadius: 'var(--radius-button)',
      fontFamily: 'inherit',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      {phase}
    </span>
  );
}

// ─── Data type display meta ───────────────────────────────────────────────────

const DATA_TYPE_META: Record<DataType, { label: string; shortLabel: string; icon: React.ReactNode }> = {
  'Percent Correct':  { label: 'Percent Correct',  shortLabel: '% Correct',  icon: <BarChart2    size={13} /> },
  'Frequency':        { label: 'Frequency',         shortLabel: 'Frequency',  icon: <Hash         size={13} /> },
  'Task Analysis':    { label: 'Task Analysis',     shortLabel: 'Task Anal.', icon: <Layers       size={13} /> },
  'Custom Prompt':    { label: 'Custom Prompt',     shortLabel: 'Prompt',     icon: <ClipboardList size={13} /> },
  'Duration':         { label: 'Duration',          shortLabel: 'Duration',   icon: <Timer        size={13} /> },
  'Text Anecdotal':   { label: 'Text / Anecdotal',  shortLabel: 'Text',       icon: <AlignLeft    size={13} /> },
  'Rate':             { label: 'Rate',              shortLabel: 'Rate',       icon: <Activity     size={13} /> },
  'Partial Interval': { label: 'Partial Interval',  shortLabel: 'Part. Int.', icon: <LayoutGrid   size={13} /> },
  'Whole Interval':   { label: 'Whole Interval',    shortLabel: 'Whole Int.', icon: <LayoutGrid   size={13} /> },
  'Custom':           { label: 'Custom Form',       shortLabel: 'Custom',     icon: <Settings2    size={13} /> },
};

// ─── Session data shapes (set-based) ─────────────────────────────────────────
// Every data type stores data as an array of "sets".
// Each set is one round of data collection within a session.

export type TrialResult = 'correct' | 'incorrect';

interface SetBase { id: string; phase: string; }

export interface PctCorrectData   { sets: Array<SetBase & { trials: (TrialResult | null)[] }> }
export interface FrequencyData    { sets: Array<SetBase & { count: number }> }
export interface TaskAnalysisData { sets: Array<SetBase & { results: Record<string, { promptId: string; passed: boolean | null }> }> }
export interface CustomPromptData { sets: Array<SetBase & { trials: string[] }> }
export interface DurationData     { sets: Array<SetBase & { recordings: number[] }> }
export interface TextData         { sets: Array<SetBase & { text: string }> }
export interface RateData         { sets: Array<SetBase & { entries: Array<{ duration: number; correct: number }> }> }
export interface IntervalData     { sets: Array<SetBase & { cells: (boolean | null)[] }> }
export interface CustomFormData   { sets: Array<SetBase & { values: Record<string, string | boolean | string[]> }> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function newSetBase(phase: string): SetBase {
  return { id: crypto.randomUUID(), phase };
}

function initData(t: ProgramTarget): unknown {
  const base = newSetBase(t.phase);
  switch (t.dataType) {
    case 'Percent Correct':  return { sets: [{ ...base, trials: [] }] } as PctCorrectData;
    case 'Frequency':        return { sets: [{ ...base, count: 0 }] }  as FrequencyData;
    case 'Task Analysis':    return {
      sets: [{
        ...base,
        results: Object.fromEntries((t.config.tasks ?? []).map(tk => [tk.id, { promptId: '', passed: null }])),
      }],
    } as TaskAnalysisData;
    case 'Custom Prompt':    return { sets: [{ ...base, trials: [] }] } as CustomPromptData;
    case 'Duration':         return { sets: [{ ...base, recordings: [] }] } as DurationData;
    case 'Text Anecdotal':   return { sets: [{ ...base, text: '' }] }   as TextData;
    case 'Rate':             return { sets: [{ ...base, entries: [] }] } as RateData;
    case 'Partial Interval':
    case 'Whole Interval':   return {
      sets: [{ ...base, cells: Array(t.config.numIntervals ?? 10).fill(null) }],
    } as IntervalData;
    case 'Custom':           return { sets: [{ ...base, values: {} }] } as CustomFormData;
  }
}

function calcStat(t: ProgramTarget, data: unknown): string {
  if (!data) return '—';
  const prefix = (n: number) => n > 1 ? `S${n}: ` : '';
  switch (t.dataType) {
    case 'Percent Correct': {
      const d = data as PctCorrectData;
      if (!d.sets.length) return '—';
      const cur = d.sets[d.sets.length - 1];
      const done    = cur.trials.filter(x => x !== null);
      const correct = done.filter(x => x === 'correct').length;
      return done.length === 0 ? '—'
        : `${prefix(d.sets.length)}${Math.round((correct / done.length) * 100)}%  (${correct}/${done.length})`;
    }
    case 'Frequency': {
      const d = data as FrequencyData;
      if (!d.sets.length) return '—';
      const cur = d.sets[d.sets.length - 1];
      return `${prefix(d.sets.length)}Count: ${cur.count}`;
    }
    case 'Task Analysis': {
      const d    = data as TaskAnalysisData;
      if (!d.sets.length) return '—';
      const cur  = d.sets[d.sets.length - 1];
      const all  = Object.values(cur.results);
      const done = all.filter(r => r.passed !== null);
      const pass = done.filter(r => r.passed).length;
      return done.length === 0 ? '—'
        : `${prefix(d.sets.length)}${Math.round((pass / all.length) * 100)}%  (${pass}/${all.length})`;
    }
    case 'Custom Prompt': {
      const d = data as CustomPromptData;
      if (!d.sets.length) return '—';
      const n = d.sets[d.sets.length - 1].trials.length;
      return n > 0 ? `${prefix(d.sets.length)}${n} trial${n > 1 ? 's' : ''}` : '—';
    }
    case 'Duration': {
      const d = data as DurationData;
      if (!d.sets.length) return '—';
      const recs = d.sets[d.sets.length - 1].recordings;
      if (!recs.length) return '—';
      const mean = Math.round(recs.reduce((a, b) => a + b, 0) / recs.length);
      return `${prefix(d.sets.length)}Mean ${fmtSecs(mean)}  ·  ${recs.length} rec.`;
    }
    case 'Text Anecdotal': {
      const d = data as TextData;
      if (!d.sets.length) return '—';
      const n = d.sets.length;
      const filled = d.sets.filter(s => s.text.trim().length > 0).length;
      return filled > 0 ? `${filled} set${filled > 1 ? 's' : ''} / ${n} total` : '—';
    }
    case 'Rate': {
      const d = data as RateData;
      if (!d.sets.length) return '—';
      const ents = d.sets[d.sets.length - 1].entries;
      if (!ents.length) return '—';
      const total = ents.reduce((a, e) => a + e.correct, 0);
      const dur   = ents.reduce((a, e) => a + e.duration, 0);
      return dur > 0 ? `${prefix(d.sets.length)}${(total / (dur / 60)).toFixed(1)} resp/min` : '—';
    }
    case 'Partial Interval':
    case 'Whole Interval': {
      const d = data as IntervalData;
      if (!d.sets.length) return '—';
      const cur  = d.sets[d.sets.length - 1];
      const done = cur.cells.filter(c => c !== null);
      const occ  = done.filter(Boolean).length;
      return done.length === 0 ? '—'
        : `${prefix(d.sets.length)}${Math.round((occ / cur.cells.length) * 100)}%  (${occ}/${cur.cells.length})`;
    }
    case 'Custom': {
      const d = data as CustomFormData;
      if (!d.sets.length) return '—';
      const filled = Object.values(d.sets[d.sets.length - 1].values)
        .filter(v => v !== '' && v !== false && (Array.isArray(v) ? v.length > 0 : true)).length;
      return filled > 0 ? `${filled} field${filled > 1 ? 's' : ''} filled` : '—';
    }
  }
}

function calcProgress(t: ProgramTarget, data: unknown): number | null {
  if (!data) return null;
  switch (t.dataType) {
    case 'Percent Correct': {
      const d = data as PctCorrectData;
      if (!d.sets.length) return null;
      const cur = d.sets[d.sets.length - 1];
      const done = cur.trials.filter(x => x !== null);
      const correct = done.filter(x => x === 'correct').length;
      return done.length === 0 ? null : Math.round((correct / done.length) * 100);
    }
    case 'Task Analysis': {
      const d = data as TaskAnalysisData;
      if (!d.sets.length) return null;
      const cur = d.sets[d.sets.length - 1];
      const all = Object.values(cur.results);
      const done = all.filter(r => r.passed !== null);
      const pass = done.filter(r => r.passed).length;
      return done.length === 0 ? null : Math.round((pass / all.length) * 100);
    }
    case 'Partial Interval':
    case 'Whole Interval': {
      const d = data as IntervalData;
      if (!d.sets.length) return null;
      const cur = d.sets[d.sets.length - 1];
      const done = cur.cells.filter(c => c !== null);
      const occ = done.filter(Boolean).length;
      return done.length === 0 ? null : Math.round((occ / cur.cells.length) * 100);
    }
    case 'Frequency':     return (data as FrequencyData).sets.some(s => s.count > 0) ? 100 : null;
    case 'Duration':      return (data as DurationData).sets.some(s => s.recordings.length > 0) ? 100 : null;
    case 'Text Anecdotal':return (data as TextData).sets.some(s => s.text.trim().length > 0) ? 100 : null;
    case 'Rate':          return (data as RateData).sets.some(s => s.entries.length > 0) ? 100 : null;
    case 'Custom Prompt': return (data as CustomPromptData).sets.some(s => s.trials.length > 0) ? 100 : null;
    default: return null;
  }
}

function programProgress(targets: ProgramTarget[], sessionData: Record<string, unknown>): number {
  const scores = targets
    .map(t => calcProgress(t, sessionData[t.id]))
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── Grouped data structure ───────────────────────────────────────────────────

interface ProgramGroup {
  program: LearnerProgram;
  targets: ProgramTarget[];
}

interface LearnerGroup {
  learnerName: string;
  programs: ProgramGroup[];
}

// ─── Stopwatch hook ───────────────────────────────────────────────────────────

function useStopwatch() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = () => {
    if (running) return;
    setRunning(true);
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };
  const pause = () => { setRunning(false); if (ref.current) clearInterval(ref.current); };
  const stop  = () => { const v = seconds; pause(); setSeconds(0); return v; };
  const reset = () => { pause(); setSeconds(0); };
  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);
  return { seconds, running, start, pause, stop, reset };
}

// ─── Sound feedback ───────────────────────────────────────────────────────────

function playTing() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1047, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(523, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch { /* AudioContext unavailable */ }
}

// ─── Shared button styles ─────────────────────────────────────────────────────

function primaryBtn(c: AppColors, isDark: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    backgroundColor: c.t0, color: isDark ? '#111' : '#fff',
    fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)',
    transition: 'opacity 0.12s',
  };
}

// ─── Shared "New Set" button ──────────────────────────────────────────────────

function NewSetBtn({ onClick, c, setNum }: { onClick: () => void; c: AppColors; setNum: number }) {
  return (
    <Button onClick={onClick}
      style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 'var(--radius-button)', border: `1px dashed ${c.border}`, backgroundColor: 'transparent', color: c.t2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 500 }}
    ><Plus size={11} /> New Set</Button>
  );
}

// ─── Shared "Previous Sets" summary ──────────────────────────────────────────

function PrevSetsSummary({ labels, c, isDark }: { labels: string[]; c: AppColors; isDark: boolean }) {
  if (!labels.length) return null;
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'inherit' }}>Previous Sets</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {labels.map((label, i) => (
          <span key={i} style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 'var(--radius-button)', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', fontSize: 11, color: c.t2, fontFamily: 'inherit' }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 1. Percent Correct ───────────────────────────────────────────────────────

function PercentCorrectEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: PctCorrectData; onChange: (d: PctCorrectData) => void; c: AppColors; isDark: boolean;
}) {
  const setIdx = data.sets.length - 1;
  const curSet = data.sets[setIdx];

  const updateTrials = (trials: (TrialResult | null)[]) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, trials };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), trials: [] }] });
  };

  const done    = curSet.trials.filter(t => t !== null);
  const correct = done.filter(t => t === 'correct').length;
  const pct     = done.length > 0 ? Math.round((correct / done.length) * 100) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>
          Set {setIdx + 1}
        </span>
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: c.t0, fontFamily: 'inherit', lineHeight: 1 }}>{pct !== null ? `${pct}%` : '—'}</span>
        <span style={{ fontSize: 13, color: c.t3, fontFamily: 'inherit' }}>{done.length > 0 ? `${correct} correct / ${done.length} trials` : 'No trials yet'}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <Button onClick={() => updateTrials([...curSet.trials, 'correct'])}
          style={{ flex: 1, height: 60, ...primaryBtn(c, isDark), backgroundColor: isDark ? 'rgba(46,158,99,0.18)' : 'rgba(46,158,99,0.10)', color: '#2E9E63', border: 'none' }}
        ><Check size={20} /> Correct</Button>
        <Button onClick={() => updateTrials([...curSet.trials, 'incorrect'])}
          style={{ flex: 1, height: 60, ...primaryBtn(c, isDark), backgroundColor: isDark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.08)', color: isDark ? '#f87171' : '#c0392b', border: 'none' }}
        ><XCircle size={20} /> Incorrect</Button>
      </div>

      {curSet.trials.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'inherit' }}>Trials</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {curSet.trials.map((t, i) => (
              <Button key={i}
                onClick={() => { const next = [...curSet.trials]; next[i] = next[i] === 'correct' ? 'incorrect' : 'correct'; updateTrials(next); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px',
                  borderRadius: 'var(--radius-button)', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 11, fontWeight: 500,
                  backgroundColor: t === 'correct' ? (isDark ? 'rgba(46,158,99,0.22)' : 'rgba(46,158,99,0.12)') : (isDark ? 'rgba(220,38,38,0.22)' : 'rgba(220,38,38,0.08)'),
                  color: t === 'correct' ? '#2E9E63' : (isDark ? '#f87171' : '#c0392b'),
                }}
              >{t === 'correct' ? <Check size={11} /> : <XCircle size={11} />} {i + 1}</Button>
            ))}
          </div>
          <Button onClick={() => updateTrials(curSet.trials.slice(0, -1))}
            style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: c.t3, fontSize: 11, fontFamily: 'inherit', padding: '2px 0' }}
          ><RotateCcw size={11} /> Undo last trial</Button>
        </div>
      )}

      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => {
          const sd = s.trials.filter(t => t !== null);
          const sc = sd.filter(t => t === 'correct').length;
          const sp = sd.length > 0 ? Math.round((sc / sd.length) * 100) : null;
          return `Set ${i + 1}: ${sp !== null ? `${sp}%` : '—'}`;
        })}
        c={c} isDark={isDark}
      />
    </div>
  );
}

// ─── 2. Frequency ─────────────────────────────────────────────────────────────

function FrequencyEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: FrequencyData; onChange: (d: FrequencyData) => void; c: AppColors; isDark: boolean;
}) {
  const setIdx = data.sets.length - 1;
  const curSet = data.sets[setIdx];

  const updateCount = (count: number) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, count };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), count: 0 }] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 8 }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Set {setIdx + 1}</span>
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>
      <div style={{ fontSize: 72, fontWeight: 700, color: c.t0, fontFamily: 'inherit', lineHeight: 1 }}>{curSet.count}</div>
      <div style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit' }}>occurrences recorded</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button onClick={() => updateCount(Math.max(0, curSet.count - 1))}
          style={{ width: 48, height: 48, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.t2 }}
        ><Minus size={20} /></Button>
        <Button onClick={() => updateCount(curSet.count + 1)}
          style={{ width: 88, height: 60, borderRadius: 'var(--radius)', ...primaryBtn(c, isDark) }}
        ><Plus size={20} /> +1</Button>
        <Button onClick={() => updateCount(0)}
          style={{ width: 48, height: 48, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.t2 }}
        ><RotateCcw size={16} /></Button>
      </div>
      <div style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit' }}>Tap +1 · Tap − to undo · ↺ to reset set</div>
      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => `Set ${i + 1}: ${s.count}`)}
        c={c} isDark={isDark}
      />
    </div>
  );
}

// ─── 3. Task Analysis ─────────────────────────────────────────────────────────

function TaskAnalysisEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: TaskAnalysisData; onChange: (d: TaskAnalysisData) => void; c: AppColors; isDark: boolean;
}) {
  const tasks   = target.config.tasks ?? [];
  const prompts = target.config.prompts ?? DEFAULT_PROMPTS;
  const setIdx  = data.sets.length - 1;
  const curSet  = data.sets[setIdx];

  const freshResults = () => Object.fromEntries(tasks.map(tk => [tk.id, { promptId: '', passed: null as null }]));

  const updateResults = (results: TaskAnalysisData['sets'][0]['results']) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, results };
    onChange({ sets });
  };
  const selectPrompt = (taskId: string, prompt: PromptDefinition) => {
    updateResults({ ...curSet.results, [taskId]: { promptId: prompt.id, passed: prompt.passFail === 'pass' } });
  };
  const clearTask = (taskId: string) => {
    updateResults({ ...curSet.results, [taskId]: { promptId: '', passed: null } });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), results: freshResults() }] });
  };

  const allKeys = tasks.map(t => t.id);
  const done    = allKeys.filter(id => curSet.results[id]?.passed !== null && curSet.results[id]?.passed !== undefined);
  const passed  = allKeys.filter(id => curSet.results[id]?.passed === true);
  const pct     = tasks.length > 0 ? Math.round((passed.length / tasks.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: c.t0, fontFamily: 'inherit', lineHeight: 1 }}>
            {tasks.length > 0 ? `${pct}%` : '—'}
          </span>
          <span style={{ fontSize: 13, color: c.t3, fontFamily: 'inherit' }}>
            {done.length}/{tasks.length} steps · {passed.length} passed
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Set {setIdx + 1}</span>
          <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task, i) => {
          const r      = curSet.results[task.id] ?? { promptId: '', passed: null };
          const selPr  = prompts.find(p => p.id === r.promptId);
          const passed2 = r.passed;
          return (
            <div key={task.id} style={{
              borderRadius: 'var(--radius)',
              border: `1px solid ${passed2 === true ? 'rgba(46,158,99,0.28)' : passed2 === false ? 'rgba(220,38,38,0.22)' : c.border}`,
              backgroundColor: passed2 === true ? (isDark ? 'rgba(46,158,99,0.08)' : 'rgba(46,158,99,0.04)') : passed2 === false ? (isDark ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.03)') : (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)'),
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                  backgroundColor: passed2 === true ? 'rgba(46,158,99,0.18)' : passed2 === false ? 'rgba(220,38,38,0.12)' : (isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'),
                  color: passed2 === true ? '#2E9E63' : passed2 === false ? (isDark ? '#f87171' : '#c0392b') : c.t3,
                }}>
                  {passed2 === true ? <Check size={11} /> : passed2 === false ? <XCircle size={11} /> : i + 1}
                </div>
                <span style={{ flex: 1, fontSize: 13, color: c.t0, fontFamily: 'inherit', fontWeight: 500 }}>{task.name}</span>
                {r.promptId && (
                  <Button onClick={() => clearTask(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.t3, fontSize: 11, padding: 0, fontFamily: 'inherit' }}
                  >clear</Button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {prompts.map(prompt => {
                  const isSelected = r.promptId === prompt.id;
                  const passColor  = prompt.passFail === 'pass' ? '#2E9E63' : (isDark ? '#f87171' : '#c0392b');
                  return (
                    <Button key={prompt.id}
                      onClick={() => selectPrompt(task.id, prompt)}
                      title={`${prompt.name} → ${prompt.passFail === 'pass' ? 'PASS' : 'FAIL'}`}
                      style={{
                        height: 34, minWidth: 42, padding: '0 10px',
                        borderRadius: 'var(--radius-button)', border: '1.5px solid',
                        borderColor: isSelected ? passColor : c.border,
                        backgroundColor: isSelected ? (prompt.passFail === 'pass' ? (isDark ? 'rgba(46,158,99,0.22)' : 'rgba(46,158,99,0.12)') : (isDark ? 'rgba(220,38,38,0.22)' : 'rgba(220,38,38,0.10)')) : 'transparent',
                        color: isSelected ? passColor : c.t2,
                        cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                      }}
                    >{prompt.code}</Button>
                  );
                })}
              </div>
              {selPr && (
                <div style={{ marginTop: 6, fontSize: 11, color: passed2 === true ? '#2E9E63' : (isDark ? '#f87171' : '#c0392b'), fontFamily: 'inherit' }}>
                  {selPr.name} → {passed2 === true ? 'PASS ✓' : 'FAIL ✗'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => {
          const all = Object.values(s.results);
          const p   = all.filter(r => r.passed === true).length;
          return `Set ${i + 1}: ${all.length > 0 ? Math.round((p / all.length) * 100) : 0}%`;
        })}
        c={c} isDark={isDark}
      />
    </div>
  );
}

// ─── 4. Custom Prompt ─────────────────────────────────────────────────────────

function CustomPromptEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: CustomPromptData; onChange: (d: CustomPromptData) => void; c: AppColors; isDark: boolean;
}) {
  const prompts = target.config.prompts ?? DEFAULT_PROMPTS;
  const setIdx  = data.sets.length - 1;
  const curSet  = data.sets[setIdx];

  const updateTrials = (trials: string[]) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, trials };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), trials: [] }] });
  };

  const counts: Record<string, number> = {};
  curSet.trials.forEach(pid => { if (pid) counts[pid] = (counts[pid] ?? 0) + 1; });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: c.t0, fontFamily: 'inherit', lineHeight: 1 }}>{curSet.trials.length}</span>
          <span style={{ fontSize: 13, color: c.t3, fontFamily: 'inherit' }}>trials in set {setIdx + 1}</span>
        </div>
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>

      {Object.keys(counts).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
          {prompts.filter(p => counts[p.id]).map(p => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', backgroundColor: isDark ? 'rgba(79,131,204,0.18)' : 'rgba(79,131,204,0.10)', color: '#4F83CC' }}>
              {p.code} <span style={{ fontWeight: 400, color: '#4F83CC' }}>×{counts[p.id]}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {curSet.trials.map((trialId, i) => {
          const selPr = prompts.find(p => p.id === trialId);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', width: 52, flexShrink: 0 }}>Trial {i + 1}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
                {prompts.map(prompt => {
                  const isSelected = trialId === prompt.id;
                  return (
                    <Button key={prompt.id}
                      onClick={() => { const next = [...curSet.trials]; next[i] = prompt.id; updateTrials(next); }}
                      title={prompt.name}
                      style={{
                        height: 32, minWidth: 38, padding: '0 8px',
                        borderRadius: 'var(--radius-button)', border: '1.5px solid',
                        borderColor: isSelected ? '#4F83CC' : c.border,
                        backgroundColor: isSelected ? (isDark ? 'rgba(79,131,204,0.22)' : 'rgba(79,131,204,0.12)') : 'transparent',
                        color: isSelected ? '#4F83CC' : c.t2,
                        cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                      }}
                    >{prompt.code}</Button>
                  );
                })}
              </div>
              {selPr && <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', flexShrink: 0 }}>{selPr.name}</span>}
              <Button onClick={() => updateTrials(curSet.trials.filter((_, j) => j !== i))}
                style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', color: c.t3, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 }}
              ><Trash2 size={12} /></Button>
            </div>
          );
        })}
      </div>
      <Button onClick={() => updateTrials([...curSet.trials, ''])}
        style={{ height: 34, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-button)', border: `1px dashed ${c.border}`, backgroundColor: 'transparent', color: c.t2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 500 }}
      ><Plus size={12} /> Add Trial</Button>

      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => `Set ${i + 1}: ${s.trials.length} trials`)}
        c={c} isDark={isDark}
      />
    </div>
  );
}

// ─── 5. Duration ─────────────────────────────────────────────────────────────

function DurationEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: DurationData; onChange: (d: DurationData) => void; c: AppColors; isDark: boolean;
}) {
  const timer  = useStopwatch();
  const maxSec = target.config.maxDuration;
  const minSec = target.config.minDuration;
  const setIdx = data.sets.length - 1;
  const curSet = data.sets[setIdx];

  const updateRecs = (recordings: number[]) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, recordings };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), recordings: [] }] });
  };

  useEffect(() => {
    if (maxSec && timer.seconds >= maxSec && timer.running) {
      const rec = timer.stop();
      updateRecs([...curSet.recordings, rec]);
    }
  }, [timer.seconds]); // eslint-disable-line

  const handleStop = () => {
    const rec = timer.stop();
    if (rec > 0) updateRecs([...curSet.recordings, rec]);
  };

  const mean = curSet.recordings.length > 0 ? Math.round(curSet.recordings.reduce((a, b) => a + b, 0) / curSet.recordings.length) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Set {setIdx + 1}</span>
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>
      <div style={{ fontSize: 68, fontWeight: 700, color: timer.running ? c.t0 : c.t2, fontFamily: 'inherit', lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
        {fmtSecs(timer.seconds)}
      </div>
      {(minSec || maxSec) && (
        <div style={{ fontSize: 11, color: c.t3, marginBottom: 20, fontFamily: 'inherit' }}>
          {minSec ? `Min: ${fmtSecs(minSec)}` : ''}{minSec && maxSec ? '  ·  ' : ''}{maxSec ? `Max: ${fmtSecs(maxSec)} (auto-stop)` : ''}
        </div>
      )}
      {!minSec && !maxSec && <div style={{ marginBottom: 20 }} />}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {!timer.running ? (
          <Button onClick={timer.start}
            style={{ height: 52, padding: '0 28px', ...primaryBtn(c, isDark) }}
          ><Play size={18} /> Start</Button>
        ) : (
          <>
            <Button onClick={timer.pause}
              style={{ height: 52, padding: '0 22px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', color: c.t1, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-base)', fontWeight: 500 }}
            ><Pause size={16} /> Pause</Button>
            <Button onClick={handleStop}
              style={{ height: 52, padding: '0 22px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 'var(--radius)', border: 'none', backgroundColor: isDark ? 'rgba(220,38,38,0.20)' : 'rgba(220,38,38,0.10)', color: isDark ? '#f87171' : '#c0392b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-base)', fontWeight: 500 }}
            ><Square size={16} /> Record & Stop</Button>
          </>
        )}
      </div>
      {curSet.recordings.length > 0 && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'inherit' }}>Recordings</span>
            {mean !== null && <span style={{ fontSize: 12, color: c.t2, fontFamily: 'inherit' }}>Mean: {fmtSecs(mean)}</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {curSet.recordings.map((rec, i) => (
              <span key={i} onClick={() => updateRecs(curSet.recordings.filter((_, j) => j !== i))} title="Click to remove"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-button)', backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', fontSize: 12, color: c.t1, fontFamily: 'inherit', cursor: 'pointer' }}
              >{fmtSecs(rec)} <X size={9} /></span>
            ))}
          </div>
        </div>
      )}
      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => {
          if (!s.recordings.length) return `Set ${i + 1}: —`;
          const m = Math.round(s.recordings.reduce((a, b) => a + b, 0) / s.recordings.length);
          return `Set ${i + 1}: ${fmtSecs(m)} avg`;
        })}
        c={c} isDark={isDark}
      />
    </div>
  );
}

// ─── 6. Text / Anecdotal ─────────────────────────────────────────────────────

function TextEntry({ target, data, onChange, c }: {
  target: ProgramTarget; data: TextData; onChange: (d: TextData) => void; c: AppColors; isDark: boolean;
}) {
  const setIdx = data.sets.length - 1;
  const curSet = data.sets[setIdx];

  const updateText = (text: string) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, text };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), text: '' }] });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Note — Set {setIdx + 1}</span>
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>
      <textarea value={curSet.text} onChange={e => updateText(e.target.value)}
        placeholder="Write your observations, notes, or anecdotal record here…"
        rows={12}
        style={{ width: '100%', borderRadius: 'var(--radius)', border: `1px solid ${c.inputBorder}`, backgroundColor: c.inputBg, color: c.t0, fontSize: 'var(--text-base)', padding: '12px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }}
        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = c.inputFocus}
        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = c.inputBorder}
      />
      <div style={{ marginTop: 4, fontSize: 11, color: c.t3, textAlign: 'right', fontFamily: 'inherit' }}>{curSet.text.length} characters</div>
      {data.sets.length > 1 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${c.inputBorder}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'inherit' }}>Previous Notes</div>
          {data.sets.slice(0, -1).map((s, i) => (
            <div key={s.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: c.t3, fontFamily: 'inherit', marginBottom: 3 }}>Set {i + 1}</div>
              <div style={{ fontSize: 12, color: c.t2, fontFamily: 'inherit', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{s.text || '(empty)'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 7. Rate ─────────────────────────────────────────────────────────────────

function RateEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: RateData; onChange: (d: RateData) => void; c: AppColors; isDark: boolean;
}) {
  const timer   = useStopwatch();
  const [correct, setCorrect] = useState(0);
  const setIdx  = data.sets.length - 1;
  const curSet  = data.sets[setIdx];

  const updateEntries = (entries: RateData['sets'][0]['entries']) => {
    const sets = [...data.sets]; sets[setIdx] = { ...curSet, entries };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), entries: [] }] });
  };

  const handleStop = () => {
    const dur = timer.stop();
    if (dur > 0) { updateEntries([...curSet.entries, { duration: dur, correct }]); setCorrect(0); }
  };

  const totalCorr = curSet.entries.reduce((a, e) => a + e.correct, 0);
  const totalDur  = curSet.entries.reduce((a, e) => a + e.duration, 0);
  const rate      = totalDur > 0 ? (totalCorr / (totalDur / 60)).toFixed(2) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {rate ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: c.t0, fontFamily: 'inherit', lineHeight: 1 }}>{rate}</span>
            <span style={{ fontSize: 14, color: c.t3, fontFamily: 'inherit' }}>resp/min</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Set {setIdx + 1}</span>
        )}
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>

      <div style={{ padding: '16px', borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', marginBottom: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: timer.running ? c.t0 : c.t2, fontFamily: 'inherit', textAlign: 'center', marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
          {fmtSecs(timer.seconds)}
        </div>
        {timer.running && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <Button onClick={() => setCorrect(Math.max(0, correct - 1))}
              style={{ width: 44, height: 44, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.t2 }}
            ><Minus size={16} /></Button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#2E9E63', fontFamily: 'inherit', lineHeight: 1 }}>{correct}</span>
              <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit' }}>correct</span>
            </div>
            <Button onClick={() => setCorrect(correct + 1)}
              style={{ width: 44, height: 44, borderRadius: 'var(--radius)', border: 'none', backgroundColor: isDark ? 'rgba(46,158,99,0.18)' : 'rgba(46,158,99,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E9E63' }}
            ><Plus size={16} /></Button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {!timer.running ? (
            <Button onClick={timer.start}
              style={{ height: 44, padding: '0 24px', ...primaryBtn(c, isDark) }}
            ><Play size={16} /> Start Trial</Button>
          ) : (
            <Button onClick={handleStop}
              style={{ height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 'var(--radius)', border: 'none', backgroundColor: isDark ? 'rgba(220,38,38,0.20)' : 'rgba(220,38,38,0.10)', color: isDark ? '#f87171' : '#c0392b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-base)', fontWeight: 500 }}
            ><Square size={15} /> Stop & Record</Button>
          )}
        </div>
      </div>

      {curSet.entries.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'inherit' }}>Trials</div>
          {curSet.entries.map((e, i) => {
            const r = e.duration > 0 ? (e.correct / (e.duration / 60)).toFixed(2) : '—';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 'var(--radius-button)', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: c.t3, width: 24, fontFamily: 'inherit' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12, color: c.t1, fontFamily: 'inherit' }}>{fmtSecs(e.duration)} · {e.correct} correct</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4F83CC', fontFamily: 'inherit' }}>{r}/min</span>
                <Button onClick={() => updateEntries(curSet.entries.filter((_, j) => j !== i))}
                  style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: c.t3, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                ><Trash2 size={11} /></Button>
              </div>
            );
          })}
        </div>
      )}

      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => {
          const tc = s.entries.reduce((a, e) => a + e.correct, 0);
          const td = s.entries.reduce((a, e) => a + e.duration, 0);
          return `Set ${i + 1}: ${td > 0 ? (tc / (td / 60)).toFixed(1) : '—'}/min`;
        })}
        c={c} isDark={isDark}
      />
    </div>
  );
}

// ─── 8 & 9. Interval (Partial + Whole) ───────────────────────────────────────

type IntervalPhase = 'idle' | 'running' | 'paused' | 'done';

function IntervalEntry({ target, data, onChange, onAutoSave, isWhole, c, isDark }: {
  target: ProgramTarget;
  data: IntervalData;
  onChange: (d: IntervalData) => void;
  onAutoSave?: (d: IntervalData) => void;
  isWhole: boolean;
  c: AppColors;
  isDark: boolean;
}) {
  const numIntervals = target.config.numIntervals ?? 10;
  const totalDurSec  = target.config.totalDuration ?? 300;
  const intervalMs   = Math.round((totalDurSec * 1000) / numIntervals);

  const setIdx = data.sets.length - 1;

  // ── Display state ─────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState<IntervalPhase>('idle');
  const [displayIdx, setDisplayIdx]     = useState(0);
  const [displayPct, setDisplayPct]     = useState(0);
  const [displayTapped, setDisplayTapped] = useState(false);
  const [displayCells, setDisplayCells] = useState<(boolean | null)[]>(
    () => [...(data.sets[setIdx]?.cells ?? Array(numIntervals).fill(null))],
  );

  // ── Refs used inside setInterval callback ─────────────────────────────────
  const phaseRef         = useRef<IntervalPhase>('idle');
  const curIdxRef        = useRef(0);
  const tappedRef        = useRef(false);
  const cellsRef         = useRef<(boolean | null)[]>([...(data.sets[setIdx]?.cells ?? Array(numIntervals).fill(null))]);
  const adjustedStartRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const onChangeRef      = useRef(onChange);
  const onAutoSaveRef    = useRef(onAutoSave);
  const dataRef          = useRef(data);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { onAutoSaveRef.current = onAutoSave; });
  useEffect(() => { dataRef.current = data; });

  // Helper: emit updated cells to parent
  const emitCells = (newCells: (boolean | null)[]) => {
    const sets = [...dataRef.current.sets];
    const lastIdx = sets.length - 1;
    sets[lastIdx] = { ...sets[lastIdx], cells: [...newCells] };
    const snap = { sets };
    onChangeRef.current(snap);
    onAutoSaveRef.current?.(snap);
  };

  // ── Permanent 100ms tick ──────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current !== 'running') return;
      const totalElapsed = Date.now() - adjustedStartRef.current;
      const totalDurMs   = totalDurSec * 1000;

      while (
        totalElapsed >= (curIdxRef.current + 1) * intervalMs &&
        curIdxRef.current < numIntervals - 1
      ) {
        const value = isWhole ? !tappedRef.current : tappedRef.current;
        cellsRef.current = [...cellsRef.current];
        cellsRef.current[curIdxRef.current] = value;
        playTing();
        emitCells([...cellsRef.current]);
        curIdxRef.current++;
        tappedRef.current = false;
        setDisplayTapped(false);
      }

      if (totalElapsed >= totalDurMs) {
        if (cellsRef.current[numIntervals - 1] === null) {
          const value = isWhole ? !tappedRef.current : tappedRef.current;
          cellsRef.current = [...cellsRef.current];
          cellsRef.current[numIntervals - 1] = value;
          playTing();
          emitCells([...cellsRef.current]);
        }
        phaseRef.current = 'done';
        setPhase('done');
        setDisplayCells([...cellsRef.current]);
        setDisplayPct(100);
        return;
      }

      const msIntoInterval = totalElapsed - curIdxRef.current * intervalMs;
      setDisplayPct(Math.min((msIntoInterval / intervalMs) * 100, 100));
      setDisplayIdx(curIdxRef.current);
      setDisplayCells([...cellsRef.current]);
    }, 100);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (phaseRef.current === 'idle') {
      const fresh = Array(numIntervals).fill(null) as null[];
      cellsRef.current  = fresh;
      curIdxRef.current = 0;
      tappedRef.current = false;
      pausedElapsedRef.current = 0;
      adjustedStartRef.current = Date.now();
      setDisplayCells(fresh);
      setDisplayIdx(0);
      setDisplayPct(0);
      setDisplayTapped(false);
      emitCells(fresh);
    } else if (phaseRef.current === 'paused') {
      adjustedStartRef.current = Date.now() - pausedElapsedRef.current;
    } else return;
    phaseRef.current = 'running';
    setPhase('running');
  };

  const handlePause = () => {
    if (phaseRef.current !== 'running') return;
    pausedElapsedRef.current = Date.now() - adjustedStartRef.current;
    phaseRef.current = 'paused';
    setPhase('paused');
  };

  const handleReset = () => {
    const fresh = Array(numIntervals).fill(null) as null[];
    cellsRef.current  = fresh;
    curIdxRef.current = 0;
    tappedRef.current = false;
    pausedElapsedRef.current = 0;
    phaseRef.current = 'idle';
    setPhase('idle');
    setDisplayCells(fresh);
    setDisplayIdx(0);
    setDisplayPct(0);
    setDisplayTapped(false);
    emitCells(fresh);
  };

  const handleTap = () => {
    if (phaseRef.current !== 'running' || tappedRef.current) return;
    tappedRef.current = true;
    setDisplayTapped(true);
  };

  const addNewSet = () => {
    const fresh = Array(numIntervals).fill(null) as null[];
    const newSetObj = { ...newSetBase(target.phase), cells: fresh };
    const sets = [...dataRef.current.sets, newSetObj];
    cellsRef.current  = fresh;
    curIdxRef.current = 0;
    tappedRef.current = false;
    pausedElapsedRef.current = 0;
    phaseRef.current = 'idle';
    setPhase('idle');
    setDisplayCells(fresh);
    setDisplayIdx(0);
    setDisplayPct(0);
    setDisplayTapped(false);
    onChangeRef.current({ sets });
  };

  // ── Derived display values ────────────────────────────────────────────────
  const secsRemaining = Math.max(0, Math.round(intervalMs / 1000 * (1 - displayPct / 100)));
  const occurred      = displayCells.filter(Boolean).length;
  const done          = displayCells.filter(v => v !== null).length;
  const overallPct    = done > 0 ? Math.round((occurred / numIntervals) * 100) : null;

  const tapBtnColor    = isWhole ? (isDark ? '#f87171' : '#c0392b') : '#2E9E63';
  const tapBtnBg       = isWhole ? (isDark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.10)') : (isDark ? 'rgba(46,158,99,0.18)' : 'rgba(46,158,99,0.10)');
  const tapBtnBgActive = isWhole ? (isDark ? 'rgba(220,38,38,0.32)' : 'rgba(220,38,38,0.20)') : (isDark ? 'rgba(46,158,99,0.32)' : 'rgba(46,158,99,0.22)');
  const prevLabels     = data.sets.slice(0, -1).map((s, i) => {
    const d2 = s.cells.filter(c2 => c2 !== null);
    const o  = d2.filter(Boolean).length;
    return `Set ${i + 1}: ${d2.length ? Math.round((o / s.cells.length) * 100) : 0}%`;
  });

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.t0, fontFamily: 'inherit', marginBottom: 6 }}>
            {isWhole ? 'Whole Interval' : 'Partial Interval'} — Set {setIdx + 1}
          </div>
          <div style={{ fontSize: 12, color: c.t3, fontFamily: 'inherit' }}>
            {numIntervals} intervals · {fmtSecs(Math.round(intervalMs / 1000))} each · {fmtSecs(totalDurSec)} total
          </div>
        </div>
        <Button onClick={handleStart}
          style={{ height: 56, padding: '0 36px', ...primaryBtn(c, isDark), borderRadius: 'var(--radius)', fontSize: 15 }}
        ><Play size={18} /> Start Timer</Button>
        <div style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', textAlign: 'center', maxWidth: 300 }}>
          {isWhole
            ? 'Tap CROSS if behaviour is interrupted. Auto-marks ✓ if interval passes untapped.'
            : 'Tap CHECK when behaviour occurs. Auto-marks ✗ if interval passes untapped.'}
        </div>
        <PrevSetsSummary labels={prevLabels} c={c} isDark={isDark} />
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: c.t0, fontFamily: 'inherit', lineHeight: 1 }}>
            {overallPct !== null ? `${overallPct}%` : '—'}
          </span>
          <span style={{ fontSize: 13, color: c.t3, fontFamily: 'inherit' }}>
            Set {setIdx + 1} · {occurred}/{numIntervals} intervals occurred
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 20 }}>
          {displayCells.map((cell, i) => (
            <div key={i} style={{
              height: 44, borderRadius: 'var(--radius)', border: '1.5px solid',
              borderColor: cell === true ? 'rgba(46,158,99,0.40)' : cell === false ? 'rgba(220,38,38,0.30)' : c.border,
              backgroundColor: cell === true ? (isDark ? 'rgba(46,158,99,0.18)' : 'rgba(46,158,99,0.10)') : cell === false ? (isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.07)') : 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 9, color: c.t3, fontFamily: 'inherit' }}>{i + 1}</span>
              {cell === true  && <Check   size={13} color="#2E9E63" />}
              {cell === false && <XCircle size={12} color={isDark ? '#f87171' : '#c0392b'} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={addNewSet}
            style={{ height: 40, padding: '0 18px', ...primaryBtn(c, isDark), borderRadius: 'var(--radius)' }}
          ><Plus size={14} /> New Set</Button>
          <Button onClick={handleReset}
            style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', color: c.t3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
          ><RotateCcw size={13} /> Redo Set</Button>
        </div>
        <PrevSetsSummary labels={prevLabels} c={c} isDark={isDark} />
      </div>
    );
  }

  // ── Running / Paused ──────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.t0, fontFamily: 'inherit' }}>
          Interval {displayIdx + 1} <span style={{ color: c.t3, fontWeight: 400 }}>of {numIntervals}</span>
          <span style={{ marginLeft: 10, fontSize: 11, color: c.t3, fontWeight: 400 }}>Set {setIdx + 1}</span>
        </div>
        <div style={{ fontSize: 12, color: c.t3, fontFamily: 'inherit' }}>
          {occurred}/{done} occurred so far
        </div>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${displayPct}%`, borderRadius: 4, backgroundColor: phase === 'paused' ? c.t3 : '#4F83CC', transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ marginTop: 5, fontSize: 11, color: c.t3, fontFamily: 'inherit', textAlign: 'right' }}>
          {phase === 'paused' ? 'Paused' : `${secsRemaining}s remaining`}
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        {displayTapped ? (
          <div style={{ height: 100, borderRadius: 'var(--radius)', border: `2px solid ${tapBtnColor}`, backgroundColor: tapBtnBgActive, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {isWhole
              ? <><XCircle size={26} color={tapBtnColor} /><span style={{ fontSize: 16, fontWeight: 700, color: tapBtnColor, fontFamily: 'inherit' }}>Marked — Not Whole</span></>
              : <><Check   size={26} color={tapBtnColor} /><span style={{ fontSize: 16, fontWeight: 700, color: tapBtnColor, fontFamily: 'inherit' }}>Marked — Occurred</span></>
            }
          </div>
        ) : (
          <Button onClick={handleTap} disabled={phase === 'paused'}
            style={{
              width: '100%', height: 100, borderRadius: 'var(--radius)',
              border: `2px solid ${phase === 'paused' ? c.border : tapBtnColor}`,
              backgroundColor: phase === 'paused' ? 'transparent' : tapBtnBg,
              color: phase === 'paused' ? c.t3 : tapBtnColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              cursor: phase === 'paused' ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
            }}
          >
            {isWhole ? <><XCircle size={30} /> Tap to Mark Interrupted</> : <><Check size={30} /> Tap to Mark Occurred</>}
          </Button>
        )}
      </div>

      {done > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
          {displayCells.slice(0, done).map((cell, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid',
              borderColor: cell === true ? 'rgba(46,158,99,0.40)' : 'rgba(220,38,38,0.30)',
              backgroundColor: cell === true ? (isDark ? 'rgba(46,158,99,0.18)' : 'rgba(46,158,99,0.10)') : (isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.07)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cell === true ? <Check size={12} color="#2E9E63" /> : <XCircle size={11} color={isDark ? '#f87171' : '#c0392b'} />}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {phase === 'running' ? (
          <Button onClick={handlePause}
            style={{ height: 38, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', color: c.t1, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}
          ><Pause size={14} /> Pause</Button>
        ) : (
          <Button onClick={handleStart}
            style={{ height: 38, padding: '0 18px', ...primaryBtn(c, isDark), borderRadius: 'var(--radius)' }}
          ><Play size={14} /> Resume</Button>
        )}
        <Button onClick={handleReset}
          style={{ height: 38, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: 'transparent', color: c.t3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
        ><RotateCcw size={13} /> Reset</Button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.t3, fontFamily: 'inherit' }}>
          <Volume2 size={11} /> Sound at interval end
        </div>
      </div>
    </div>
  );
}

// ─── 10. Custom Form ──────────────────────────────────────────────────────────

function CustomFormEntry({ target, data, onChange, c, isDark }: {
  target: ProgramTarget; data: CustomFormData; onChange: (d: CustomFormData) => void; c: AppColors; isDark?: boolean;
}) {
  const fields = target.config.formFields ?? [];
  const setIdx = data.sets.length - 1;
  const curSet = data.sets[setIdx];

  const setValue = (fieldId: string, value: string | boolean | string[]) => {
    const sets = [...data.sets];
    sets[setIdx] = { ...curSet, values: { ...curSet.values, [fieldId]: value } };
    onChange({ sets });
  };
  const addNewSet = () => {
    onChange({ sets: [...data.sets, { ...newSetBase(target.phase), values: {} }] });
  };

  const iS: React.CSSProperties = {
    height: 34, padding: '0 10px', borderRadius: 'var(--radius-button)',
    border: `1px solid ${c.inputBorder}`, backgroundColor: c.inputBg, color: c.t0,
    fontSize: 'var(--text-base)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
  };

  if (fields.length === 0) {
    return <div style={{ textAlign: 'center', padding: '32px 0', color: c.t3, fontSize: 13, fontFamily: 'inherit' }}>No form fields configured.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Set {setIdx + 1}</span>
        <NewSetBtn onClick={addNewSet} c={c} setNum={setIdx + 2} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.map(field => (
          <div key={field.id}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: c.t0, fontFamily: 'inherit', marginBottom: 6 }}>{field.label}</label>
            {field.type === 'text' && (
              <Input type="text" value={(curSet.values[field.id] as string) ?? ''} onChange={e => setValue(field.id, e.target.value)} className="focus-visible:ring-0" style={iS} />
            )}
            {field.type === 'number' && (
              <Input type="number" value={(curSet.values[field.id] as string) ?? ''} onChange={e => setValue(field.id, e.target.value)} className="focus-visible:ring-0" style={{ ...iS, width: 120 }} />
            )}
            {field.type === 'radio_group' && (field.options ?? []).map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 0', fontSize: 13, color: c.t1, fontFamily: 'inherit' }}>
                <input type="radio" name={`${field.id}-${setIdx}`} value={opt} checked={(curSet.values[field.id] as string) === opt} onChange={() => setValue(field.id, opt)} style={{ width: 14, height: 14, accentColor: c.t0 }} />
                {opt}
              </label>
            ))}
            {field.type === 'checkbox_group' && (field.options ?? []).map(opt => {
              const checked = Array.isArray(curSet.values[field.id]) && (curSet.values[field.id] as string[]).includes(opt);
              const toggle  = () => { const cur2 = (curSet.values[field.id] as string[]) ?? []; setValue(field.id, checked ? cur2.filter(x => x !== opt) : [...cur2, opt]); };
              return (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 0', fontSize: 13, color: c.t1, fontFamily: 'inherit' }}>
                  <input type="checkbox" checked={checked} onChange={toggle} style={{ width: 14, height: 14, accentColor: c.t0 }} />
                  {opt}
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <PrevSetsSummary
        labels={data.sets.slice(0, -1).map((s, i) => {
          const f = Object.values(s.values).filter(v => v !== '' && v !== false && (Array.isArray(v) ? v.length > 0 : true)).length;
          return `Set ${i + 1}: ${f} field${f !== 1 ? 's' : ''}`;
        })}
        c={c} isDark={isDark ?? false}
      />
    </div>
  );
}

// ─── Data Entry Dispatcher ────────────────────────────────────────────────────

function DataEntryArea({ target, rawData, onChangeData, onAutoSave, c, isDark }: {
  target: ProgramTarget; rawData: unknown; onChangeData: (d: unknown) => void;
  onAutoSave?: (d: unknown) => void; c: AppColors; isDark: boolean;
}) {
  switch (target.dataType) {
    case 'Percent Correct':  return <PercentCorrectEntry target={target} data={rawData as PctCorrectData}   onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Frequency':        return <FrequencyEntry       target={target} data={rawData as FrequencyData}    onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Task Analysis':    return <TaskAnalysisEntry    target={target} data={rawData as TaskAnalysisData} onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Custom Prompt':    return <CustomPromptEntry    target={target} data={rawData as CustomPromptData} onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Duration':         return <DurationEntry        target={target} data={rawData as DurationData}    onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Text Anecdotal':   return <TextEntry            target={target} data={rawData as TextData}        onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Rate':             return <RateEntry            target={target} data={rawData as RateData}        onChange={onChangeData} c={c} isDark={isDark} />;
    case 'Partial Interval': return <IntervalEntry target={target} data={rawData as IntervalData} onChange={onChangeData} onAutoSave={d => onAutoSave?.(d)} isWhole={false} c={c} isDark={isDark} />;
    case 'Whole Interval':   return <IntervalEntry target={target} data={rawData as IntervalData} onChange={onChangeData} onAutoSave={d => onAutoSave?.(d)} isWhole={true}  c={c} isDark={isDark} />;
    case 'Custom':           return <CustomFormEntry      target={target} data={rawData as CustomFormData}  onChange={onChangeData} c={c} isDark={isDark} />;
    default: return null;
  }
}

// ─── Mock targets for demo sessions ──────────────────────────────────────────

function generateMockTargets(session: Session): ProgramTarget[] {
  if (session.serviceType === 'ABA Therapy') return [
    { id: 't1', name: 'Eye Contact',           color: '#4F83CC', dataType: 'Percent Correct', sd: '"Look at me"',                 objective: '80% for 3 sessions',          phase: 'Intervention', config: {} },
    { id: 't2', name: 'Manding (Food Items)',   color: '#2E9E63', dataType: 'Frequency',       sd: 'Preferred items visible',     objective: '10+ mands per session',       phase: 'Intervention', config: {} },
    { id: 't3', name: 'Hand Washing',           color: '#7C52D0', dataType: 'Task Analysis',   sd: 'Sink and soap available',     objective: '90% independently',           phase: 'Intervention', config: { prompts: DEFAULT_PROMPTS, tasks: [{ id: 'tk1', name: 'Turn on water' }, { id: 'tk2', name: 'Wet hands' }, { id: 'tk3', name: 'Apply soap' }, { id: 'tk4', name: 'Scrub 20 sec' }, { id: 'tk5', name: 'Rinse hands' }, { id: 'tk6', name: 'Turn off water' }, { id: 'tk7', name: 'Dry hands' }] } },
    { id: 't4', name: 'Following Instructions', color: '#E07B39', dataType: 'Custom Prompt',   sd: '1-step instruction given',    objective: '90% independent trials',      phase: 'Intervention', config: { prompts: DEFAULT_PROMPTS } },
    { id: 't5', name: 'Tantrum Duration',       color: '#E05252', dataType: 'Duration',        sd: 'Problem behavior observed',   objective: '<30 sec per episode',         phase: 'Baseline',     config: { maxDuration: 600 } },
  ];
  if (session.serviceType === 'Speech Therapy') return [
    { id: 't1', name: '/r/ Sound Production',   color: '#4F83CC', dataType: 'Percent Correct', sd: '"Say [word with /r/]"',       objective: '80% accuracy in words',       phase: 'Intervention', config: {} },
    { id: 't2', name: 'Fluency Duration',        color: '#7C52D0', dataType: 'Duration',        sd: 'Structured speaking task',    objective: '2+ min fluent speech',        phase: 'Intervention', config: { minDuration: 30, maxDuration: 600 } },
    { id: 't3', name: 'Session Narrative',       color: '#2E9E63', dataType: 'Text Anecdotal',  sd: 'Free play or structured',     objective: 'Document language sample',    phase: 'Baseline',     config: {} },
    { id: 't4', name: 'Word Retrieval Rate',     color: '#E07B39', dataType: 'Rate',            sd: 'Naming task (20 items)',       objective: '>10 correct/min',             phase: 'Intervention', config: {} },
  ];
  if (session.serviceType === 'Occupational Therapy') return [
    { id: 't1', name: 'Scissor Skills',          color: '#4F83CC', dataType: 'Task Analysis',   sd: 'Paper and scissors provided', objective: 'Cut independently',           phase: 'Intervention', config: { prompts: DEFAULT_PROMPTS, tasks: [{ id: 'tk1', name: 'Pick up scissors' }, { id: 'tk2', name: 'Position paper' }, { id: 'tk3', name: 'Open scissors' }, { id: 'tk4', name: 'Position on line' }, { id: 'tk5', name: 'Cut straight line' }] } },
    { id: 't2', name: 'Attention to Task',       color: '#7C52D0', dataType: 'Partial Interval', sd: 'Structured tabletop activity', objective: '80% of intervals',           phase: 'Intervention', config: { totalDuration: 300, numIntervals: 10, soundAlert: true } },
    { id: 't3', name: 'Pencil Pressure Rate',    color: '#2E9E63', dataType: 'Rate',            sd: 'Copy 3 sentences',            objective: '<2 corrections/min',          phase: 'Intervention', config: {} },
  ];
  return [{ id: 't1', name: 'Target 1', color: '#4F83CC', dataType: 'Percent Correct', sd: '', objective: '', phase: 'Intervention', config: {} }];
}

// ─── Main DataCollectionSheet ─────────────────────────────────────────────────

interface DataCollectionSheetProps {
  session:     Session;
  onClose:     () => void;
  onFinalize?: (data: FinalizedSessionData) => void;
}

export function DataCollectionSheet({ session, onClose, onFinalize }: DataCollectionSheetProps) {
  const { colors: c, isDark } = useTheme();
  const { programs, loading: programsLoading, updateProgram } = useLearnerPrograms();

  // Rows fetched from session_targets via getSessionMappings — null = loading
  const [sessionTargetRows, setSessionTargetRows] = useState<SessionTargetRow[] | null>(null);

  // Pending auto-heal payload (set by learnerGroups memo, executed by effect below)
  const pendingHeal = useRef<{ programList: Array<{id: string}>; targetList: Array<{id: string; program_id: string}> } | null>(null);

  useEffect(() => {
    if (!session.id) { setSessionTargetRows([]); return; }
    getSessionMappings(session.id)
      .then(({ targets }) => {
        console.log('[DataCollectionSheet] loaded targets:', targets);
        setSessionTargetRows(targets);
      })
      .catch(err => {
        console.error('[DataCollectionSheet] getSessionMappings error:', err);
        setSessionTargetRows([]);
      });
  }, [session.id]); // eslint-disable-line

  // Execute pending auto-heal after learnerGroups (and its memo) has settled
  useEffect(() => {
    const heal = pendingHeal.current;
    if (!heal || !session.id) return;
    pendingHeal.current = null;
    console.log('[DataCollectionSheet] auto-healing session_targets for session:', session.id);
    saveSessionMappings(session.id, heal.programList, heal.targetList).catch(console.error);
  }); // no deps — runs after every render, only acts when pendingHeal is set

  const learnerGroups = useMemo<LearnerGroup[]>(() => {
    if (sessionTargetRows === null) return []; // still loading

    if (sessionTargetRows.length > 0) {
      // Group by learner via program context (no learner_name stored in DB)
      const byProg = new Map<string, Set<string>>();
      for (const row of sessionTargetRows) {
        if (!byProg.has(row.program_id)) byProg.set(row.program_id, new Set());
        byProg.get(row.program_id)!.add(row.target_id);
      }

      const byLearner = new Map<string, ProgramGroup[]>();
      for (const [programId, targetIds] of byProg) {
        const prog = programs.find(p => p.id === programId);
        if (!prog) continue;
        const targets = prog.targets.filter(t => targetIds.has(t.id));
        if (targets.length === 0) continue;
        if (!byLearner.has(prog.learnerName)) byLearner.set(prog.learnerName, []);
        byLearner.get(prog.learnerName)!.push({ program: prog, targets });
      }

      const groups: LearnerGroup[] = [];
      for (const [learnerName, programGroups] of byLearner) {
        groups.push({ learnerName, programs: programGroups });
      }
      if (groups.length > 0) return groups;
    }

    // Fallback 2: session_targets empty — derive from session.selectedPrograms (legacy sessions)
    const sp = session.selectedPrograms;
    if (sp && Object.keys(sp).length > 0) {
      const groups = Object.entries(sp).map(([learnerName, programIds]) => ({
        learnerName,
        programs: programIds
          .map(pid => programs.find(p => p.id === pid))
          .filter((p): p is LearnerProgram => !!p)
          .map(prog => ({ program: prog, targets: prog.targets })),
      })).filter(lg => lg.programs.length > 0);
      if (groups.length > 0) return groups;
    }

    // Fallback 3: reconstruct from session.students + programs context
    if (session.students && session.students.length > 0 && programs.length > 0) {
      console.log('[DataCollectionSheet] fallback 3: reconstructing from session.students', session.students);
      const groups = session.students.map(studentName => ({
        learnerName: studentName,
        programs: programs
          .filter(p => p.learnerName === studentName)
          .map(prog => ({ program: prog, targets: prog.targets })),
      })).filter(lg => lg.programs.length > 0);
      if (groups.length > 0) {
        // Schedule auto-heal via ref — executed by useEffect below (not here, useMemo must be pure)
        if (session.id) {
          pendingHeal.current = {
            programList: groups.flatMap(lg => lg.programs.map(pg => ({ id: pg.program.id }))),
            targetList:  groups.flatMap(lg => lg.programs.flatMap(pg =>
              pg.targets.map(t => ({ id: t.id, program_id: pg.program.id }))
            )),
          };
        }
        return groups;
      }
    }

    return [];
  }, [sessionTargetRows, session, programs]); // eslint-disable-line

  const allTargets = useMemo<ProgramTarget[]>(
    () => learnerGroups.flatMap(lg => lg.programs.flatMap(pg => pg.targets)),
    [learnerGroups],
  );

  const targetProgram = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    learnerGroups.forEach(lg => lg.programs.forEach(pg => pg.targets.forEach(t => { map[t.id] = pg.program.id; })));
    return map;
  }, [learnerGroups]);

  const [activeTargetId, setActiveTargetId] = useState<string>(() => allTargets[0]?.id ?? '');
  const [sessionData, setSessionData]       = useState<Record<string, unknown>>(() =>
    Object.fromEntries(allTargets.map(t => [t.id, initData(t)])),
  );

  // Sync local state when allTargets changes (e.g. programs context loads after mount)
  useEffect(() => {
    setSessionData(prev => {
      const next: Record<string, unknown> = {};
      allTargets.forEach(t => { next[t.id] = prev[t.id] ?? initData(t); });
      return next;
    });
    if (!activeTargetId || !allTargets.find(t => t.id === activeTargetId)) {
      setActiveTargetId(allTargets[0]?.id ?? '');
    }
  }, [allTargets]); // eslint-disable-line

  // Load previously saved session data from DB so data survives sheet close/reopen
  useEffect(() => {
    if (!session.id || !allTargets.length) return;
    supabase
      .from('session_data')
      .select('target_id, data')
      .eq('session_id', session.id)
      .then(({ data: rows, error }) => {
        if (error) { console.error('[session_data] load:', error.message); return; }
        if (!rows?.length) return;
        setSessionData(prev => {
          const next = { ...prev };
          for (const row of rows) {
            // Only restore data for targets we know about in this session
            if (row.target_id in next) next[row.target_id] = row.data;
          }
          return next;
        });
      });
  }, [session.id, allTargets.length]); // eslint-disable-line

  const activeTarget = allTargets.find(t => t.id === activeTargetId) ?? allTargets[0];

  // True while either session_targets OR programs are still being fetched from Supabase
  const isLoading = sessionTargetRows === null || programsLoading;

  const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const [finalized, setFinalized] = useState(false);

  // ── Auto-save (intervals) ─────────────────────────────────────────────────
  function autoSave(targetId: string, data: unknown, dataType: DataType) {
    if (!session.id) return;
    supabase.from('session_data').upsert({
      session_id: session.id,
      target_id:  targetId,
      data_type:  dataType,
      data:       data as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,target_id' }).then(({ error }) => {
      if (error) console.error('Auto-save error:', error.message);
    });
  }

  // ── Persist progress ──────────────────────────────────────────────────────
  function persistProgress() {
    const programTargets: Record<string, ProgramTarget[]> = {};
    allTargets.forEach(t => {
      const pid = targetProgram[t.id];
      if (!pid || pid === 'mock') return;
      if (!programTargets[pid]) programTargets[pid] = [];
      programTargets[pid].push(t);
    });
    Object.entries(programTargets).forEach(([pid, targets]) => {
      updateProgram(pid, { progress: programProgress(targets, sessionData) });
    });
  }

  // ── Build canonical RawTrialData from internal set-based data ─────────────
  function buildRawData(t: ProgramTarget, data: unknown): RawTrialData | undefined {
    if (!data) return undefined;
    const prompts = t.config.prompts ?? DEFAULT_PROMPTS;
    switch (t.dataType) {
      case 'Percent Correct': {
        const d = data as PctCorrectData;
        return { kind: 'percent_correct', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, trials: s.trials })) };
      }
      case 'Frequency': {
        const d = data as FrequencyData;
        return { kind: 'frequency', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, count: s.count })) };
      }
      case 'Task Analysis': {
        const d = data as TaskAnalysisData;
        return {
          kind: 'task_analysis',
          sets: d.sets.map(s => ({
            id: s.id, phase: s.phase,
            steps: (t.config.tasks ?? []).map(tk => {
              const r    = s.results[tk.id];
              const code = r?.promptId ? (prompts.find(p => p.id === r.promptId)?.code ?? '') : '';
              return { id: tk.id, name: tk.name, passed: r?.passed ?? null, promptCode: code };
            }),
          })),
        };
      }
      case 'Custom Prompt': {
        const d = data as CustomPromptData;
        return {
          kind: 'custom_prompt',
          sets: d.sets.map(s => ({
            id: s.id, phase: s.phase,
            trials: s.trials.map(pid => prompts.find(p => p.id === pid)?.code ?? pid),
          })),
        };
      }
      case 'Duration': {
        const d = data as DurationData;
        return { kind: 'duration', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, recordings: s.recordings })) };
      }
      case 'Text Anecdotal': {
        const d = data as TextData;
        return { kind: 'text', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, text: s.text })) };
      }
      case 'Rate': {
        const d = data as RateData;
        return { kind: 'rate', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, entries: s.entries })) };
      }
      case 'Partial Interval':
      case 'Whole Interval': {
        const d = data as IntervalData;
        return { kind: 'interval', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, cells: s.cells })) };
      }
      case 'Custom': {
        const d = data as CustomFormData;
        return { kind: 'custom', sets: d.sets.map(s => ({ id: s.id, phase: s.phase, values: s.values as Record<string, unknown> })) };
      }
      default: return undefined;
    }
  }

  // ── Phase transition helper ────────────────────────────────────────────────
  async function applyPhaseTransition(
    target: ProgramTarget,
    newPhase: string,
    sessionId: string,
    triggeredBy: string,
  ) {
    const progId = targetProgram[target.id];
    if (!progId || progId === 'mock') return;
    const prog = programs.find(p => p.id === progId);
    if (!prog) return;
    const updatedTargets = prog.targets.map(t =>
      t.id === target.id ? { ...t, phase: newPhase } : t,
    );
    updateProgram(progId, { targets: updatedTargets });
    await supabase.from('phase_history').insert({
      target_id:       target.id,
      session_id:      sessionId,
      from_phase:      target.phase,
      to_phase:        newPhase,
      triggered_by:    triggeredBy,
      transitioned_at: new Date().toISOString(),
    });
  }

  // ── Phase evaluation engine ────────────────────────────────────────────────
  async function runPhaseEvaluation(sessionId: string) {
    const providerId = session.providers[0] ?? 'system';

    for (const target of allTargets) {
      const config = target.phaseProgression;
      if (!config?.enabled) continue;

      const forwardRule    = config.rules.find(r => r.enabled && r.fromPhase === target.phase);
      const regressionRule = config.rules.find(r => r.enabled && r.toPhase === target.phase && r.regressionEnabled);
      if (!forwardRule && !regressionRule) continue;

      // Score current session — skip if no data
      const current = computeScoreFromData(target.dataType, sessionData[target.id]);
      if (!current) continue;

      // ── Find last phase-change timestamp and type for this target ───────────
      // Only sessions AFTER this timestamp count toward the current phase's streak.
      // This is the core of per-phase streak isolation: after every phase change
      // the window resets to zero so old-phase sessions can never carry over.
      // We also fetch triggered_by so we can detect a recent regression and
      // prevent an immediate forward jump on the very first session after it.
      const { data: phaseRows } = await supabase
        .from('phase_history')
        .select('transitioned_at, triggered_by')
        .eq('target_id', target.id)
        .order('transitioned_at', { ascending: false })
        .limit(1);
      const lastPhaseChangeAt:   string | null = phaseRows?.[0]?.transitioned_at ?? null;
      const lastPhaseChangeType: string | null = phaseRows?.[0]?.triggered_by    ?? null;

      // After a regression the current session must NOT count toward the new
      // forward streak — only sessions recorded AFTER the regression do.
      // This prevents a single high-scoring session from immediately re-advancing
      // the target back to the phase it just regressed from.
      const wasRegression = lastPhaseChangeType === 'regression';

      // Compute how many historical sessions to fetch:
      // forward window  = consecutiveSessions + allowedFailures
      // regression window = regressionSessions (default 2)
      const fwdAllowed = forwardRule    ? (forwardRule.onFailure === 'allow_one' ? 1 : 0) : 0;
      const fwdWindow  = forwardRule    ? forwardRule.consecutiveSessions + fwdAllowed : 0;
      const regWindow  = regressionRule ? (regressionRule.regressionSessions ?? 2) : 0;

      // Compute how many historical sessions to fetch (current is already in hand):
      // forward window  = consecutiveSessions + allowedFailures  → need window-1 prior
      // regression window = regressionSessions (default 2)       → need window-1 prior
      const fwdNeeded = Math.max(fwdWindow - 1, 0);
      const regNeeded = Math.max(regWindow - 1, 0);
      const needed    = Math.max(fwdNeeded, regNeeded);

      // Both history arrays start with the current session (newest first).
      // fullHistory    — used for the regression check (always includes current).
      // forwardHistory — used for forward progression; current is included so the
      //                  streak fires on exactly the Nth consecutive passing session
      //                  (streak >= required, not streak > required).
      const currentRecord: SessionRecord = {
        score:       current.score,
        trialsCount: current.trials,
        providerId,
        date:        new Date().toISOString(),
      };

      const fullHistory:    SessionRecord[] = [currentRecord];
      const forwardHistory: SessionRecord[] = [currentRecord];

      if (needed > 0) {
        // Fetch previous sessions — filtered to only those AFTER the last phase change.
        // Using .gt() (strictly after) means the session that triggered the last phase
        // change is also excluded, giving a clean per-phase streak count.
        let query = supabase
          .from('session_data')
          .select('data, updated_at')
          .eq('target_id', target.id)
          .neq('session_id', sessionId)
          .order('updated_at', { ascending: false })
          .limit(needed);

        if (lastPhaseChangeAt) {
          query = query.gt('updated_at', lastPhaseChangeAt);
        }

        const { data: rows } = await query;
        for (const row of rows ?? []) {
          const result = computeScoreFromData(target.dataType, row.data);
          if (!result) continue;
          const record: SessionRecord = {
            score:       result.score,
            trialsCount: result.trials,
            providerId,
            date:        row.updated_at,
          };
          fullHistory.push(record);
          forwardHistory.push(record);
        }
      }

      // After a regression, ignore the very first session that follows it so the
      // target cannot immediately re-advance on a single lucky result.
      // "First session after regression" = wasRegression AND no prior sessions were
      // found in the DB after the regression timestamp (only current is in history).
      const isFirstAfterRegression = wasRegression && forwardHistory.length === 1;

      // 1. Check forward progression (only when trials meet minimum).
      //    The streak fires on exactly the Nth consecutive passing session because
      //    current is included and the condition is passes >= consecutiveSessions.
      if (forwardRule && current.trials >= forwardRule.minTrialsPerSession && !isFirstAfterRegression) {
        const evaluation = evaluatePhaseProgression(target.phase, config, forwardHistory);
        if (evaluation.advanced && evaluation.newPhase) {
          await applyPhaseTransition(
            target, evaluation.newPhase, sessionId,
            evaluation.rule?.autoMove ? 'auto' : 'system',
          );
          continue; // Don't also check regression on same session
        }
      }

      // 2. Check regression (move back if scores dropped for N sessions).
      //    Always uses fullHistory so the current session is included.
      if (regressionRule?.regressionEnabled) {
        const regression = evaluateRegression(target.phase, config, fullHistory);
        if (regression.regressed && regression.prevPhase) {
          await applyPhaseTransition(target, regression.prevPhase, sessionId, 'regression');
        }
      }
    }
  }

  // ── Save all session data then run phase evaluation ────────────────────────
  async function saveAndEvaluate(sessionId: string) {
    const now = new Date().toISOString();

    // 1. Upsert raw data blobs to session_data (one row per target)
    const dataRows = allTargets
      .filter(t => sessionData[t.id])
      .map(t => ({
        session_id: sessionId,
        target_id:  t.id,
        data_type:  t.dataType,
        data:       sessionData[t.id] as Record<string, unknown>,
        updated_at: now,
      }));

    if (dataRows.length > 0) {
      const { error } = await supabase
        .from('session_data')
        .upsert(dataRows, { onConflict: 'session_id,target_id' });
      if (error) {
        console.error('[Finalize] saveSessionData:', error.message);
        return;
      }
    }

    // 2. Populate session_metrics (one computed row per target) for the phase engine
    const metricRows = allTargets
      .map(t => {
        const score = computeScoreFromData(t.dataType, sessionData[t.id]);
        if (!score) return null;
        return {
          session_id:   sessionId,
          target_id:    t.id,
          metric_value: score.score,
          trial_count:  score.trials,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (metricRows.length > 0) {
      const { error } = await supabase
        .from('session_metrics')
        .upsert(metricRows, { onConflict: 'session_id,target_id' });
      if (error) console.error('[Finalize] saveSessionMetrics:', error.message);
    }

    // 3. Evaluate phase progression rules against session history
    await runPhaseEvaluation(sessionId);
  }

  // ── Finalize ──────────────────────────────────────────────────────────────
  function handleFinalize() {
    if (finalized) return;
    setFinalized(true);
    persistProgress();

    const summaryTargets: TargetSummary[] = [];
    learnerGroups.forEach(lg => {
      lg.programs.forEach(pg => {
        pg.targets.forEach(t => {
          const data = sessionData[t.id];
          summaryTargets.push({
            targetId:    t.id,
            sessionId:   session.id ?? '',
            targetName:  t.name,
            programName: pg.program.title,
            learnerName: lg.learnerName,
            dataType:    t.dataType,
            stat:        calcStat(t, data),
            progress:    calcProgress(t, data) ?? 0,
            trials:      countTrials(t.dataType, data),
            rawData:     buildRawData(t, data),
          });
        });
      });
    });

    // Save all data + run phase evaluation asynchronously (non-blocking)
    if (session.id) {
      saveAndEvaluate(session.id).catch(err =>
        console.error('[Finalize] phase eval error:', err),
      );
    }

    onFinalize?.({ session, finalizedAt: new Date().toISOString(), targets: summaryTargets });
  }

  function countTrials(dataType: DataType, data: unknown): number {
    if (!data) return 0;
    switch (dataType) {
      case 'Percent Correct':  return (data as PctCorrectData).sets.reduce((a, s) => a + s.trials.filter(Boolean).length, 0);
      case 'Custom Prompt':    return (data as CustomPromptData).sets.reduce((a, s) => a + s.trials.length, 0);
      case 'Task Analysis':    return (data as TaskAnalysisData).sets.reduce((a, s) => a + Object.keys(s.results).length, 0);
      case 'Duration':         return (data as DurationData).sets.reduce((a, s) => a + s.recordings.length, 0);
      case 'Rate':             return (data as RateData).sets.reduce((a, s) => a + s.entries.length, 0);
      case 'Frequency':        return (data as FrequencyData).sets.reduce((a, s) => a + (s.count > 0 ? 1 : 0), 0);
      case 'Text Anecdotal':   return (data as TextData).sets.filter(s => s.text.trim()).length;
      default: return 0;
    }
  }

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', backgroundColor: c.surface }}>
        <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', backgroundColor: c.sideBg, borderBottom: `1px solid ${c.border}`, paddingLeft: 12, paddingRight: 14 }}>
          <Button variant="ghost" onClick={onClose} className="h-8 gap-1.5" style={{ fontSize: 13, fontFamily: 'inherit', color: c.t2 }}>
            <ArrowLeft size={14} /> Back to Session
          </Button>
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left sidebar skeleton */}
          <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${c.border}`, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton className="h-4 w-24 mb-2" />
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.border}` }}>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
          {/* Right panel skeleton */}
          <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Skeleton className="h-14 flex-1 rounded-lg" />
              <Skeleton className="h-14 flex-1 rounded-lg" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-7 w-10 rounded-md" />)}
            </div>
            <Skeleton className="h-4 w-32 mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // Loaded but no programs/targets found — old session with no mapping
  if (learnerGroups.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', backgroundColor: c.surface }}>
        <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', backgroundColor: c.sideBg, borderBottom: `1px solid ${c.border}`, paddingLeft: 12, paddingRight: 14 }}>
          <Button variant="ghost" onClick={onClose} className="h-8 gap-1.5" style={{ fontSize: 13, fontFamily: 'inherit', color: c.t2 }}>
            <ArrowLeft size={14} /> Back to Session
          </Button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 40px', textAlign: 'center' }}>
          <BookOpen size={32} style={{ color: c.t3, marginBottom: 4 }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: c.t0, fontFamily: 'inherit' }}>No programs mapped to this session</span>
          <span style={{ fontSize: 13, color: c.t3, fontFamily: 'inherit', maxWidth: 340 }}>
            This session was created before program mapping was set up. Open <strong>Edit Session</strong>, re-select the learner's programs, and save again to enable data collection.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', backgroundColor: c.surface }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', gap: 0, backgroundColor: c.sideBg, borderBottom: `1px solid ${c.border}`, paddingLeft: 12, paddingRight: 14 }}>
        <Button variant="ghost" onClick={onClose} className="h-8 gap-1.5" style={{ fontSize: 13, fontFamily: 'inherit', color: c.t2 }}>
          <ArrowLeft size={14} /> Back to Session
        </Button>
        <div style={{ width: 1, height: 18, backgroundColor: c.border, margin: '0 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.t0, fontFamily: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.students.join(', ') || session.sessionName}
          </span>
          <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', flexShrink: 0 }}>
            {session.serviceType}  ·  {fmtTime(session.startTime)} – {fmtTime(session.endTime)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: c.t2, fontFamily: 'inherit', marginRight: 12, flexShrink: 0 }}>
          <Target size={12} /> {allTargets.length} target{allTargets.length !== 1 ? 's' : ''}
        </div>
        <Button onClick={handleFinalize} disabled={finalized} className="h-8 gap-1.5 flex-shrink-0" style={{ fontSize: 13, fontFamily: 'inherit' }}>
          <CheckCircle2 size={13} /> {finalized ? 'Finalizing…' : 'Finalize Session'}
        </Button>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: grouped sidebar ── */}
        <div style={{ width: 240, flexShrink: 0, backgroundColor: c.sideBg, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ScrollArea className="flex-1">
            <div style={{ padding: '8px 0 8px' }}>
              {learnerGroups.map(lg => (
                <div key={lg.learnerName}>
                  <div style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'inherit' }}>
                    {lg.learnerName}
                  </div>
                  {lg.programs.map(pg => (
                    <div key={pg.program.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px 3px', marginTop: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: pg.program.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.t2, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pg.program.title}
                        </span>
                      </div>
                      <div style={{ paddingBottom: 6 }}>
                        {pg.targets.map(t => {
                          const isActive = t.id === activeTargetId;
                          const stat     = calcStat(t, sessionData[t.id]);
                          const meta     = DATA_TYPE_META[t.dataType];
                          return (
                            <Button key={t.id} variant="ghost" onClick={() => setActiveTargetId(t.id)}
                              className="h-auto text-left justify-start mx-1"
                              style={{ width: 'calc(100% - 8px)', padding: '6px 10px 6px 22px', fontFamily: 'inherit', backgroundColor: isActive ? c.navActive : 'transparent' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? c.t0 : c.t1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, paddingLeft: 13 }}>
                                <span style={{ color: c.t3, display: 'flex' }}>{meta.icon}</span>
                                <span style={{ fontSize: 10, color: c.t3, fontFamily: 'inherit' }}>{meta.shortLabel}</span>
                              </div>
                              {stat !== '—' && (
                                <div style={{ marginTop: 1, paddingLeft: 13, fontSize: 10, fontWeight: 600, color: t.color, fontFamily: 'inherit' }}>{stat}</div>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: data entry ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeTarget ? (
            <>
              {/* Target header */}
              <div style={{ flexShrink: 0, padding: '14px 24px 12px', borderBottom: `1px solid ${c.border}`, backgroundColor: c.surface }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: activeTarget.color, flexShrink: 0 }} />
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: c.t0, fontFamily: 'inherit', lineHeight: 1.2 }}>{activeTarget.name}</h2>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <PhaseBadge phase={activeTarget.phase} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 500, fontFamily: 'inherit', backgroundColor: isDark ? 'rgba(79,131,204,0.15)' : 'rgba(79,131,204,0.10)', color: '#4F83CC' }}>
                      {DATA_TYPE_META[activeTarget.dataType].icon} {DATA_TYPE_META[activeTarget.dataType].label}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {activeTarget.sd && (
                    <div><span style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>SD  </span><span style={{ fontSize: 13, color: c.t2, fontFamily: 'inherit' }}>{activeTarget.sd}</span></div>
                  )}
                  {activeTarget.objective && (
                    <div style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>Objective  </span><span style={{ fontSize: 13, color: c.t2, fontFamily: 'inherit' }}>{activeTarget.objective}</span></div>
                  )}
                </div>
              </div>

              {/* Entry area */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div style={{ padding: '24px 28px', maxWidth: 680 }}>
                  <DataEntryArea
                    key={activeTarget.id}
                    target={activeTarget}
                    rawData={sessionData[activeTarget.id] ?? initData(activeTarget)}
                    onChangeData={d => setSessionData(prev => ({ ...prev, [activeTarget.id]: d }))}
                    onAutoSave={d => autoSave(activeTarget.id, d, activeTarget.dataType)}
                    c={c} isDark={isDark}
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: c.t3, fontFamily: 'inherit' }}>
              <BookOpen size={28} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: 14 }}>No programs selected for this session</span>
              <span style={{ fontSize: 12 }}>Assign programs to learners, then select them when creating a session</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
