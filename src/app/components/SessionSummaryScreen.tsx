import React from 'react';
import { ArrowLeft, CheckCircle2, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../context/ThemeContext';
import type { FinalizedSessionData, ProgramGroup } from '../lib/sessionTypes';
import { groupTargetsByProgram } from '../lib/sessionTypes';
import { SummaryTargetCard } from './SummaryTargetCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtAt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Overview stat card ───────────────────────────────────────────────────────

function StatCard({ label, value, c, isDark }: {
  label: string; value: string | number;
  c: ReturnType<typeof useTheme>['colors']; isDark: boolean;
}) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 'var(--radius)', border: `1px solid ${c.border}`, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div style={{ fontSize: 10, color: c.t3, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: c.t0, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

// ─── Program section ──────────────────────────────────────────────────────────

function ProgramSection({ group, c, isDark }: {
  group: ProgramGroup;
  c: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  return (
    <div>
      {/* Program header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <BookOpen size={13} style={{ color: c.t3, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: c.t0, fontFamily: 'inherit' }}>
            {group.programName}
          </span>
        </div>
        <div style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', flexShrink: 0 }}>
          {group.learnerName}
        </span>
        <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', flexShrink: 0 }}>
          {group.targets.length} target{group.targets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Target cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {group.targets.map(t => (
          <SummaryTargetCard key={t.targetId} target={t} />
        ))}
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface Props {
  data:    FinalizedSessionData;
  onClose: () => void;
}

export function SessionSummaryScreen({ data, onClose }: Props) {
  const { colors: c, isDark } = useTheme();
  const { session, targets, finalizedAt } = data;

  const groups    = groupTargetsByProgram(targets);
  const avgProgress = targets.length
    ? Math.round(targets.reduce((s, t) => s + t.progress, 0) / targets.length)
    : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', backgroundColor: c.surface }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', backgroundColor: c.sideBg, borderBottom: `1px solid ${c.border}`, paddingLeft: 12, paddingRight: 16, gap: 0 }}>
        <Button variant="ghost" onClick={onClose} className="h-8 gap-1.5" style={{ fontSize: 13, fontFamily: 'inherit', color: c.t2 }}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div style={{ width: 1, height: 18, backgroundColor: c.border, margin: '0 12px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.t0, fontFamily: 'inherit' }}>
            Session Summary — {session.sessionName}
          </span>
          <span style={{ marginLeft: 10, fontSize: 11, color: c.t3, fontFamily: 'inherit' }}>
            {fmtTime(session.startTime)} – {fmtTime(session.endTime)}
            {session.students.length > 0 && <> · {session.students.join(', ')}</>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#2E9E63', fontFamily: 'inherit', flexShrink: 0 }}>
          <CheckCircle2 size={13} /> Finalized {fmtAt(finalizedAt)}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <StatCard label="Learners"     value={session.students.join(', ') || '—'} c={c} isDark={isDark} />
            <StatCard label="Programs"     value={groups.length}                       c={c} isDark={isDark} />
            <StatCard label="Targets"      value={targets.length}                      c={c} isDark={isDark} />
            <StatCard label="Avg Progress" value={`${avgProgress}%`}                  c={c} isDark={isDark} />
          </div>

          {/* Empty state */}
          {targets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: c.t3, fontFamily: 'inherit' }}>
              <BookOpen size={28} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: c.t2 }}>No data recorded for this session</div>
            </div>
          )}

          {/* Program → Target hierarchy */}
          {groups.map(group => (
            <ProgramSection
              key={`${group.learnerName}::${group.programName}`}
              group={group}
              c={c}
              isDark={isDark}
            />
          ))}

        </div>
      </div>
    </div>
  );
}
