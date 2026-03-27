import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import type { TargetSummary, RawTrialData } from '../lib/sessionTypes';
import type { DataType } from './ProgramTemplatesPage';
import { supabase } from '../lib/supabase';
import { computeScoreFromData } from '../lib/evaluatePhaseProgression';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSecs(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}
function progressColor(p: number) {
  return p >= 80 ? '#2E9E63' : p >= 50 ? '#E07B39' : '#E05252';
}

const PHASE_COLORS: Record<string, string> = {
  Baseline: '#9CA3AF', Intervention: '#4F83CC', Maintenance: '#2E9E63',
  Generalization: '#7C52D0', Mastery: '#E07B39',
};

// ─── Action menu ──────────────────────────────────────────────────────────────

function RowMenu({ c, isDark }: { c: ReturnType<typeof useTheme>['colors']; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
          color: c.t3, fontSize: 14, borderRadius: 4, lineHeight: 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        title="Set actions"
      >⋮</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 50,
          backgroundColor: c.surface, border: `1px solid ${c.border}`,
          borderRadius: 6, padding: '4px 0', minWidth: 120,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {[{ label: 'Edit set', icon: '✏️' }, { label: 'Delete set', icon: '🗑️' }].map(({ label, icon }) => (
            <button
              key={label}
              onClick={() => { setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 12px', fontSize: 12, color: label === 'Delete set' ? '#E05252' : c.t1,
                fontFamily: 'inherit', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            >
              <span style={{ fontSize: 11 }}>{icon}</span>{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function Empty({ c }: { c: ReturnType<typeof useTheme>['colors'] }) {
  return <p style={{ fontSize: 12, color: c.t3, fontFamily: 'inherit', margin: 0, padding: '12px 0' }}>No data recorded</p>;
}

// ─── Phase chip ───────────────────────────────────────────────────────────────

function PhaseChip({ phase }: { phase: string }) {
  const color = PHASE_COLORS[phase] ?? '#9CA3AF';
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 3,
      backgroundColor: `${color}18`, color, fontWeight: 600, fontFamily: 'inherit',
    }}>{phase}</span>
  );
}

// ─── Phase transition detection ───────────────────────────────────────────────

interface PhaseTransition { name: string; from: string; to: string; }

function getPhaseTransitions(sets: Array<{ phase: string }>): PhaseTransition[] {
  const result: PhaseTransition[] = [];
  for (let i = 1; i < sets.length; i++) {
    if (sets[i].phase !== sets[i - 1].phase) {
      result.push({ name: `S${i + 1}`, from: sets[i - 1].phase, to: sets[i].phase });
    }
  }
  return result;
}

const PHASE_LINE_COLOR = '#E07B39';

// ─── Multi-session types and helpers ──────────────────────────────────────────

type TimeRange = 'session' | 'last3' | 'all';

interface MultiSessionPoint {
  label: string;      // "Sess 1"
  dateLabel: string;  // "12 Feb, 10:30 AM"
  metric: number | null;
  phase: string;
}

function fmtSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getPhaseFromStored(stored: unknown): string {
  try {
    return (stored as { sets: Array<{ phase?: string }> }).sets?.[0]?.phase ?? 'Unknown';
  } catch { return 'Unknown'; }
}

function computeMetricFromRawData(raw: RawTrialData): number | null {
  switch (raw.kind) {
    case 'percent_correct': {
      const filled = raw.sets.flatMap(s => s.trials.filter(t => t !== null)) as Array<'correct' | 'incorrect'>;
      return filled.length ? (filled.filter(t => t === 'correct').length / filled.length) * 100 : null;
    }
    case 'frequency': {
      const total = raw.sets.reduce((a, s) => a + s.count, 0);
      return raw.sets.some(s => s.count > 0) ? total : null;
    }
    case 'task_analysis': {
      const answered = raw.sets.flatMap(s => s.steps.filter(st => st.passed !== null));
      return answered.length ? (answered.filter(st => st.passed).length / answered.length) * 100 : null;
    }
    case 'duration': {
      const all = raw.sets.flatMap(s => s.recordings);
      return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
    }
    case 'rate': {
      const entries = raw.sets.flatMap(s => s.entries.filter(e => e.duration > 0));
      if (!entries.length) return null;
      const totalCorrect = entries.reduce((a, e) => a + e.correct, 0);
      const totalDurMins = entries.reduce((a, e) => a + e.duration, 0) / 60;
      return totalDurMins > 0 ? totalCorrect / totalDurMins : null;
    }
    case 'interval': {
      const cells = raw.sets.flatMap(s => s.cells.filter((cell): cell is boolean => cell !== null));
      return cells.length ? (cells.filter(Boolean).length / cells.length) * 100 : null;
    }
    case 'custom_prompt': {
      const total = raw.sets.reduce((a, s) => a + s.trials.length, 0);
      return total > 0 ? total : null;
    }
    case 'custom': {
      const nums = raw.sets.flatMap(s =>
        Object.values(s.values)
          .map(v => typeof v === 'number' ? v : parseFloat(String(v)))
          .filter(n => !isNaN(n))
      );
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
    default: return null;
  }
}

function isPercentType(dataType: DataType): boolean {
  return ['Percent Correct', 'Task Analysis', 'Partial Interval', 'Whole Interval'].includes(dataType);
}

function formatMetric(value: number, dataType: DataType): string {
  if (dataType === 'Duration') return fmtSecs(Math.round(value));
  if (dataType === 'Rate') return `${value.toFixed(1)}/min`;
  if (isPercentType(dataType)) return `${Math.round(value)}%`;
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

function getMultiPhaseTransitions(points: MultiSessionPoint[]): PhaseTransition[] {
  const result: PhaseTransition[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i].phase !== points[i - 1].phase) {
      result.push({ name: points[i].label, from: points[i - 1].phase, to: points[i].phase });
    }
  }
  return result;
}

// ─── Multi-session chart ───────────────────────────────────────────────────────

function MultiSessionChart({ points, dataType, isDark, c }: {
  points: MultiSessionPoint[];
  dataType: DataType;
  isDark: boolean;
  c: ReturnType<typeof useTheme>['colors'];
}) {
  if (!points.length) return null;
  const isPercent  = isPercentType(dataType);
  const isDuration = dataType === 'Duration';
  const isRate     = dataType === 'Rate';
  const chartData  = points.map(p => ({ name: p.label, value: p.metric }));
  const phaseTransitions = getMultiPhaseTransitions(points);
  const tooltipStyle = { backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, fontSize: 11, fontFamily: 'inherit' };
  const axisProps = { fontSize: 10, fill: c.t3, fontFamily: 'inherit' };

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 16, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
          <XAxis dataKey="name" tick={axisProps} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisProps} axisLine={false} tickLine={false}
            domain={isPercent ? [0, 100] : ['auto', 'auto']}
            tickFormatter={isDuration ? fmtSecs : isPercent ? (v: number) => `${v}%` : undefined}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label: string) => {
              const p = points.find(pt => pt.label === label);
              return p ? `${label} · ${p.dateLabel}` : label;
            }}
            formatter={(value: number) => {
              if (isPercent)  return [`${Math.round(value)}%`, 'Score'];
              if (isDuration) return [fmtSecs(Math.round(value)), 'Avg Duration'];
              if (isRate)     return [`${value.toFixed(1)}/min`, 'Rate'];
              return [value, 'Score'];
            }}
          />
          {isPercent && (
            <ReferenceLine y={80} stroke="#2E9E63" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: '80%', position: 'right', fontSize: 9, fill: '#2E9E63', fontFamily: 'inherit' }} />
          )}
          {phaseTransitions.map((pt, i) => (
            <ReferenceLine key={i} x={pt.name} stroke={PHASE_LINE_COLOR} strokeDasharray="3 2" strokeWidth={1.5}
              label={{ value: `${pt.from}→${pt.to}`, position: 'insideTopLeft', fontSize: 8, fill: PHASE_LINE_COLOR, fontFamily: 'inherit' }} />
          ))}
          <Line type="monotone" dataKey="value" stroke="#4F83CC" strokeWidth={2}
            dot={{ r: 4, fill: '#4F83CC', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
      {phaseTransitions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0 2px', marginLeft: 8 }}>
          {phaseTransitions.map((pt, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: PHASE_LINE_COLOR, fontFamily: 'inherit' }}>
              <span style={{ width: 12, height: 1.5, display: 'inline-block', background: PHASE_LINE_COLOR, borderRadius: 1 }} />
              {pt.name}: {pt.from} → {pt.to}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Multi-session table ───────────────────────────────────────────────────────

function MultiSessionTable({ points, dataType, isDark, c }: {
  points: MultiSessionPoint[];
  dataType: DataType;
  isDark: boolean;
  c: ReturnType<typeof useTheme>['colors'];
}) {
  if (!points.length) return <Empty c={c} />;
  const th: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '5px 10px', textAlign: 'left', borderBottom: `1px solid ${c.border}`,
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    fontSize: 12, color: c.t1, padding: '6px 10px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
  const metricLabel =
    dataType === 'Duration' ? 'Avg Duration' :
    dataType === 'Rate'     ? 'Rate' :
    dataType === 'Frequency' ? 'Count' : 'Score';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Date / Time</th>
            <th style={th}>Phase</th>
            <th style={th}>{metricLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td style={{ ...td, fontWeight: 600, color: c.t3 }}>{p.label}</td>
              <td style={{ ...td, color: c.t2 }}>{p.dateLabel}</td>
              <td style={td}><PhaseChip phase={p.phase} /></td>
              <td style={{
                ...td, fontWeight: 700,
                color: p.metric !== null ? (isPercentType(dataType) ? progressColor(p.metric) : c.t0) : c.t3,
              }}>
                {p.metric !== null ? formatMetric(p.metric, dataType) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function computeChartData(raw: RawTrialData): { name: string; value: number | null }[] | null {
  if (raw.kind === 'percent_correct') {
    return raw.sets.map((s, i) => {
      const filled = s.trials.filter(t => t !== null) as Array<'correct' | 'incorrect'>;
      if (!filled.length) return { name: `S${i + 1}`, value: null };
      return { name: `S${i + 1}`, value: Math.round(filled.filter(t => t === 'correct').length / filled.length * 100) };
    });
  }
  if (raw.kind === 'frequency') {
    return raw.sets.map((s, i) => ({ name: `S${i + 1}`, value: s.count }));
  }
  if (raw.kind === 'task_analysis') {
    return raw.sets.map((s, i) => {
      const answered = s.steps.filter(st => st.passed !== null);
      if (!answered.length) return { name: `S${i + 1}`, value: null };
      return { name: `S${i + 1}`, value: Math.round(answered.filter(st => st.passed).length / answered.length * 100) };
    });
  }
  if (raw.kind === 'duration') {
    return raw.sets.map((s, i) => {
      if (!s.recordings.length) return { name: `S${i + 1}`, value: null };
      return { name: `S${i + 1}`, value: Math.round(s.recordings.reduce((a, b) => a + b, 0) / s.recordings.length) };
    });
  }
  if (raw.kind === 'rate') {
    return raw.sets.map((s, i) => {
      if (!s.entries.length) return { name: `S${i + 1}`, value: null };
      const totalCorrect = s.entries.reduce((a, e) => a + e.correct, 0);
      const totalDurSec  = s.entries.reduce((a, e) => a + e.duration, 0);
      if (totalDurSec === 0) return { name: `S${i + 1}`, value: null };
      return { name: `S${i + 1}`, value: +(totalCorrect / (totalDurSec / 60)).toFixed(1) };
    });
  }
  if (raw.kind === 'interval') {
    return raw.sets.map((s, i) => {
      const filled = s.cells.filter(c => c !== null);
      if (!filled.length) return { name: `S${i + 1}`, value: null };
      return { name: `S${i + 1}`, value: Math.round(filled.filter(Boolean).length / filled.length * 100) };
    });
  }
  if (raw.kind === 'custom_prompt') {
    return raw.sets.map((s, i) => ({ name: `S${i + 1}`, value: s.trials.length }));
  }
  return null;
}

function SetLineChart({ raw, isDark, c }: { raw: RawTrialData; isDark: boolean; c: ReturnType<typeof useTheme>['colors'] }) {
  const chartData = computeChartData(raw);
  if (!chartData || chartData.length === 0) return null;

  const isPercent  = raw.kind === 'percent_correct' || raw.kind === 'task_analysis' || raw.kind === 'interval';
  const isDuration = raw.kind === 'duration';
  const isRate     = raw.kind === 'rate';

  // Detect phase transitions from the sets' phase field
  const phaseTransitions = getPhaseTransitions(raw.sets as Array<{ phase: string }>);

  const tooltipStyle = {
    backgroundColor: c.surface, border: `1px solid ${c.border}`,
    borderRadius: 6, fontSize: 11, fontFamily: 'inherit',
  };
  const axisProps = { fontSize: 10, fill: c.t3, fontFamily: 'inherit' };
  const grid = (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
      vertical={false}
    />
  );

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 16, right: 16, left: -20, bottom: 0 }}>
          {grid}
          <XAxis dataKey="name" tick={axisProps} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisProps}
            axisLine={false}
            tickLine={false}
            domain={isPercent ? [0, 100] : ['auto', 'auto']}
            tickFormatter={isDuration ? fmtSecs : isPercent ? (v: number) => `${v}%` : undefined}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => {
              if (isPercent) return [`${value}%`, 'Value'];
              if (isDuration) return [fmtSecs(value), 'Avg Duration'];
              if (isRate) return [`${value}/min`, 'Rate'];
              return [value, 'Value'];
            }}
          />
          {isPercent && (
            <ReferenceLine
              y={80}
              stroke="#2E9E63"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: '80%', position: 'right', fontSize: 9, fill: '#2E9E63', fontFamily: 'inherit' }}
            />
          )}
          {phaseTransitions.map((pt, i) => (
            <ReferenceLine
              key={i}
              x={pt.name}
              stroke={PHASE_LINE_COLOR}
              strokeDasharray="3 2"
              strokeWidth={1.5}
              label={{ value: `${pt.from}→${pt.to}`, position: 'insideTopLeft', fontSize: 8, fill: PHASE_LINE_COLOR, fontFamily: 'inherit' }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4F83CC"
            strokeWidth={2}
            dot={{ r: 4, fill: '#4F83CC', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {phaseTransitions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0 2px', marginLeft: 8 }}>
          {phaseTransitions.map((pt, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: PHASE_LINE_COLOR, fontFamily: 'inherit',
            }}>
              <span style={{ width: 12, height: 1.5, display: 'inline-block', background: PHASE_LINE_COLOR, borderRadius: 1 }} />
              {pt.name}: {pt.from} → {pt.to}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Per-data-type Table ──────────────────────────────────────────────────────

function SetDataTable({ raw, isDark, c }: { raw: RawTrialData; isDark: boolean; c: ReturnType<typeof useTheme>['colors'] }) {
  const th: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: c.t3,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '5px 10px', textAlign: 'left',
    borderBottom: `1px solid ${c.border}`, fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    fontSize: 12, color: c.t1, padding: '6px 10px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
  const tdMuted: React.CSSProperties = { ...td, color: c.t3 };

  // ── percent_correct ────────────────────────────────────────────────────────
  if (raw.kind === 'percent_correct') {
    if (!raw.sets.length) return <Empty c={c} />;
    const maxTrials = Math.max(...raw.sets.map(s => s.trials.length), 0);
    if (maxTrials === 0) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {Array.from({ length: maxTrials }, (_, i) => <th key={i} style={th}>T{i + 1}</th>)}
              <th style={th}>% Correct</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => {
              const filled = s.trials.filter(t => t !== null) as Array<'correct' | 'incorrect'>;
              const pct = filled.length ? Math.round(filled.filter(t => t === 'correct').length / filled.length * 100) : null;
              return (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                  {Array.from({ length: maxTrials }, (_, ti) => {
                    const val = s.trials[ti] ?? null;
                    return (
                      <td key={ti} style={{ ...td, color: val === 'correct' ? '#2E9E63' : val === 'incorrect' ? '#E05252' : c.t3, fontWeight: val !== null ? 600 : 400 }}>
                        {val === 'correct' ? '✓' : val === 'incorrect' ? '✗' : '—'}
                      </td>
                    );
                  })}
                  <td style={{ ...td, fontWeight: 700, color: pct !== null ? progressColor(pct) : c.t3 }}>
                    {pct !== null ? `${pct}%` : '—'}
                  </td>
                  <td style={td}><PhaseChip phase={s.phase} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── frequency ──────────────────────────────────────────────────────────────
  if (raw.kind === 'frequency') {
    if (!raw.sets.length) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              <th style={th}>Frequency</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => (
              <tr key={s.id}>
                <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                <td style={{ ...td, fontWeight: 700, fontSize: 14 }}>{s.count}</td>
                <td style={td}><PhaseChip phase={s.phase} /></td>
                <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── task_analysis ──────────────────────────────────────────────────────────
  if (raw.kind === 'task_analysis') {
    if (!raw.sets.length) return <Empty c={c} />;
    // Collect union of all step names in order (from first set)
    const allSteps = raw.sets[0]?.steps.map(st => st.name) ?? [];
    if (!allSteps.length) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {allSteps.map((name, i) => <th key={i} style={{ ...th, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>S{i + 1}: {name.slice(0, 10)}{name.length > 10 ? '…' : ''}</th>)}
              <th style={th}>% Pass</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => {
              const answered = s.steps.filter(st => st.passed !== null);
              const pct = answered.length ? Math.round(answered.filter(st => st.passed).length / answered.length * 100) : null;
              return (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                  {allSteps.map((name, ti) => {
                    const step = s.steps.find(st => st.name === name) ?? s.steps[ti];
                    const passed = step?.passed ?? null;
                    return (
                      <td key={ti} style={{ ...td, color: passed === null ? c.t3 : passed ? '#2E9E63' : '#E05252', fontWeight: passed !== null ? 600 : 400 }}>
                        {passed === null ? '—' : passed ? '✓' : '✗'}
                      </td>
                    );
                  })}
                  <td style={{ ...td, fontWeight: 700, color: pct !== null ? progressColor(pct) : c.t3 }}>
                    {pct !== null ? `${pct}%` : '—'}
                  </td>
                  <td style={td}><PhaseChip phase={s.phase} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── duration ───────────────────────────────────────────────────────────────
  if (raw.kind === 'duration') {
    if (!raw.sets.length) return <Empty c={c} />;
    const maxRec = Math.max(...raw.sets.map(s => s.recordings.length), 0);
    if (maxRec === 0) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {Array.from({ length: maxRec }, (_, i) => <th key={i} style={th}>T{i + 1}</th>)}
              <th style={th}>Avg</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => {
              const avg = s.recordings.length ? s.recordings.reduce((a, b) => a + b, 0) / s.recordings.length : null;
              return (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                  {Array.from({ length: maxRec }, (_, ti) => (
                    <td key={ti} style={s.recordings[ti] !== undefined ? td : tdMuted}>
                      {s.recordings[ti] !== undefined ? fmtSecs(s.recordings[ti]) : '—'}
                    </td>
                  ))}
                  <td style={{ ...td, fontWeight: 600 }}>{avg !== null ? fmtSecs(Math.round(avg)) : '—'}</td>
                  <td style={td}><PhaseChip phase={s.phase} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── rate ───────────────────────────────────────────────────────────────────
  if (raw.kind === 'rate') {
    if (!raw.sets.length) return <Empty c={c} />;
    const maxEntries = Math.max(...raw.sets.map(s => s.entries.length), 0);
    if (maxEntries === 0) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {Array.from({ length: maxEntries }, (_, i) => <th key={i} style={th}>T{i + 1}</th>)}
              <th style={th}>Avg Rate</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => {
              const totalCorrect = s.entries.reduce((a, e) => a + e.correct, 0);
              const totalDurSec  = s.entries.reduce((a, e) => a + e.duration, 0);
              const avg = totalDurSec > 0 ? totalCorrect / (totalDurSec / 60) : null;
              return (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                  {Array.from({ length: maxEntries }, (_, ti) => {
                    const e = s.entries[ti];
                    const rate = e && e.duration > 0 ? (e.correct / (e.duration / 60)).toFixed(1) : null;
                    return <td key={ti} style={rate ? td : tdMuted}>{rate ? `${rate}/min` : '—'}</td>;
                  })}
                  <td style={{ ...td, fontWeight: 600 }}>{avg !== null ? `${avg.toFixed(1)}/min` : '—'}</td>
                  <td style={td}><PhaseChip phase={s.phase} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── interval ───────────────────────────────────────────────────────────────
  if (raw.kind === 'interval') {
    if (!raw.sets.length) return <Empty c={c} />;
    const maxCells = Math.max(...raw.sets.map(s => s.cells.length), 0);
    if (maxCells === 0) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {Array.from({ length: maxCells }, (_, i) => <th key={i} style={th}>I{i + 1}</th>)}
              <th style={th}>% Occ</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => {
              const filled = s.cells.filter(cell => cell !== null);
              const pct = filled.length ? Math.round(filled.filter(Boolean).length / filled.length * 100) : null;
              return (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                  {Array.from({ length: maxCells }, (_, ci) => {
                    const cell = s.cells[ci] ?? null;
                    return (
                      <td key={ci} style={{ ...td, color: cell === null ? c.t3 : cell ? '#2E9E63' : '#E05252', fontWeight: cell !== null ? 700 : 400 }}>
                        {cell === null ? '—' : cell ? '✓' : '✗'}
                      </td>
                    );
                  })}
                  <td style={{ ...td, fontWeight: 700, color: pct !== null ? progressColor(pct) : c.t3 }}>
                    {pct !== null ? `${pct}%` : '—'}
                  </td>
                  <td style={td}><PhaseChip phase={s.phase} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── text ───────────────────────────────────────────────────────────────────
  if (raw.kind === 'text') {
    if (!raw.sets.length) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              <th style={{ ...th, width: '100%' }}>Note</th>
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => (
              <tr key={s.id}>
                <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                <td style={{ ...td, whiteSpace: 'pre-wrap', maxWidth: 320, wordBreak: 'break-word' }}>{s.text || <span style={{ color: c.t3 }}>—</span>}</td>
                <td style={td}><PhaseChip phase={s.phase} /></td>
                <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── custom_prompt ──────────────────────────────────────────────────────────
  if (raw.kind === 'custom_prompt') {
    if (!raw.sets.length) return <Empty c={c} />;
    const maxTrials = Math.max(...raw.sets.map(s => s.trials.length), 0);
    if (maxTrials === 0) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {Array.from({ length: maxTrials }, (_, i) => <th key={i} style={th}>T{i + 1}</th>)}
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => (
              <tr key={s.id}>
                <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                {Array.from({ length: maxTrials }, (_, ti) => (
                  <td key={ti} style={s.trials[ti] ? td : tdMuted}>{s.trials[ti] || '—'}</td>
                ))}
                <td style={td}><PhaseChip phase={s.phase} /></td>
                <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── custom ─────────────────────────────────────────────────────────────────
  if (raw.kind === 'custom') {
    if (!raw.sets.length) return <Empty c={c} />;
    const allKeys = Array.from(new Set(raw.sets.flatMap(s => Object.keys(s.values))));
    if (!allKeys.length) return <Empty c={c} />;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Set</th>
              {allKeys.map(k => <th key={k} style={th}>{k}</th>)}
              <th style={th}>Phase</th>
              <th style={{ ...th, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {raw.sets.map((s, si) => (
              <tr key={s.id}>
                <td style={{ ...td, fontWeight: 600 }}>S{si + 1}</td>
                {allKeys.map(k => {
                  const v = s.values[k];
                  const display = v === undefined || v === '' || v === false ? null : String(v);
                  return <td key={k} style={display ? td : tdMuted}>{display ?? '—'}</td>;
                })}
                <td style={td}><PhaseChip phase={s.phase} /></td>
                <td style={{ ...td, textAlign: 'center' }}><RowMenu c={c} isDark={isDark} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface Props { target: TargetSummary }

export function SummaryTargetCard({ target }: Props) {
  const { colors: c, isDark } = useTheme();
  const raw = target.rawData;
  const numSets = raw?.sets.length ?? 0;

  const [range, setRange] = useState<TimeRange>('session');
  const [multiPoints, setMultiPoints] = useState<MultiSessionPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range === 'session') { setMultiPoints([]); return; }
    setLoading(true);
    const limitN = range === 'last3' ? 2 : 100;

    const baseQuery = supabase
      .from('session_data')
      .select('session_id, data, updated_at')
      .eq('target_id', target.targetId);

    const filteredQuery = target.sessionId
      ? baseQuery.neq('session_id', target.sessionId)
      : baseQuery;

    filteredQuery
      .order('updated_at', { ascending: false })
      .limit(limitN)
      .then(({ data: rows }) => {
        const historical: Omit<MultiSessionPoint, 'label'>[] = (rows ?? [])
          .map(row => ({
            dateLabel: fmtSessionDate(row.updated_at as string),
            metric: computeScoreFromData(target.dataType, row.data)?.score ?? null,
            phase: getPhaseFromStored(row.data),
          }))
          .reverse(); // oldest first

        const currentMetric = raw ? computeMetricFromRawData(raw) : null;
        const currentPhase  = raw?.sets[0] ? (raw.sets[0] as { phase: string }).phase : 'Unknown';
        const all = [
          ...historical,
          { dateLabel: 'This session', metric: currentMetric, phase: currentPhase },
        ];
        const limited = range === 'last3' ? all.slice(-3) : all;
        setMultiPoints(limited.map((p, i) => ({ ...p, label: `Sess ${i + 1}` })));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, target.targetId, target.sessionId, target.dataType]);

  const isMulti = range !== 'session';

  return (
    <div style={{
      border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.008)',
    }}>

      {/* ── Target header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
      }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: c.t0, fontFamily: 'inherit' }}>
          {target.targetName}
        </span>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 4,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          color: c.t2, fontWeight: 500, fontFamily: 'inherit',
        }}>{target.dataType}</span>
        <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit' }}>
          {target.programName}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: progressColor(target.progress), fontFamily: 'inherit',
        }}>{target.progress}%</span>
        <select
          value={range}
          onChange={e => setRange(e.target.value as TimeRange)}
          style={{
            fontSize: 11, color: c.t2, cursor: 'pointer', outline: 'none',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${c.border}`, borderRadius: 4,
            padding: '2px 6px', fontFamily: 'inherit',
          }}
        >
          <option value="session">This Session</option>
          <option value="last3">Last 3 Sessions</option>
          <option value="all">All Sessions</option>
        </select>
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      {isMulti ? (
        !loading && multiPoints.length > 0 && (
          <div style={{ padding: '12px 14px 4px', borderBottom: `1px solid ${c.border}` }}>
            <MultiSessionChart points={multiPoints} dataType={target.dataType} isDark={isDark} c={c} />
          </div>
        )
      ) : (
        raw && numSets > 0 && (
          <div style={{ padding: '12px 14px 4px', borderBottom: `1px solid ${c.border}` }}>
            <SetLineChart raw={raw} isDark={isDark} c={c} />
          </div>
        )
      )}

      {/* ── Data table ────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px' }}>
        {loading ? (
          <p style={{ fontSize: 12, color: c.t3, fontFamily: 'inherit', margin: 0, padding: '12px 0' }}>Loading…</p>
        ) : isMulti ? (
          <MultiSessionTable points={multiPoints} dataType={target.dataType} isDark={isDark} c={c} />
        ) : (
          raw ? <SetDataTable raw={raw} isDark={isDark} c={c} /> : <Empty c={c} />
        )}
      </div>

      {/* ── Metrics footer ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 14px', borderTop: `1px solid ${c.border}`,
        display: 'flex', gap: 20, alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
      }}>
        {[
          { label: 'Metric', value: target.stat || '—' },
          { label: 'Sets', value: numSets || '—' },
          { label: 'Progress', value: `${target.progress}%` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: c.t3, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.t1, fontFamily: 'inherit' }}>{String(value)}</div>
          </div>
        ))}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ width: 80, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${target.progress}%`, borderRadius: 2, backgroundColor: progressColor(target.progress) }} />
          </div>
        </div>
      </div>

    </div>
  );
}
