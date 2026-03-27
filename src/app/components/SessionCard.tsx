import React from 'react';
import {
  CalendarMinus, CalendarDays, CalendarClock,
  Check, CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ─── Session type ─────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  sessionName: string;
  students: string[];
  providers: string[];
  serviceType: 'ABA Therapy' | 'Speech Therapy' | 'Occupational Therapy';
  startTime: Date;
  endTime: Date;
  notes?: string;
  color?: string;
  eventType?: 'normal' | 'allday' | 'recurring';
  /** learnerName → selected LearnerProgram IDs for this session */
  selectedPrograms?: Record<string, string[]>;
}

// ─── Service config (kept for backward compatibility in SessionDetailsPanel) ──

export const serviceConfig = {
  'ABA Therapy': {
    bgColor:     '#EDF5FB',
    borderColor: '#4F83CC',
    accentColor: '#4F83CC',
    textColor:   '#1A4870',
    labelColor:  '#2B6FAD',
  },
  'Speech Therapy': {
    bgColor:     '#EDF7E8',
    borderColor: '#2E9E63',
    accentColor: '#2E9E63',
    textColor:   '#1B4B2C',
    labelColor:  '#2D7048',
  },
  'Occupational Therapy': {
    bgColor:     '#F3EDFB',
    borderColor: '#7C52D0',
    accentColor: '#7C52D0',
    textColor:   '#451E7A',
    labelColor:  '#6030A8',
  },
};

// ─── Session Status ───────────────────────────────────────────────────────────

export type SessionStatus =
  | 'unassigned'        // no providers
  | 'not_started'       // has providers, future/current
  | 'doc_pending'       // past end time, no notes
  | 'sup_note_only'     // supervision note added, session note missing
  | 'session_note_only' // session note added, supervision note missing (if required)
  | 'completed';        // all required notes done

export interface SessionStatusConfig {
  bg:       string;
  bgDark:   string;
  text:     string;
  textDark: string;
  label:    string;
}

// State-driven color palette (soft, non-saturated)
export const SESSION_STATUS_CONFIG: Record<SessionStatus, SessionStatusConfig> = {
  unassigned: {
    bg:       'rgba(67,107,172,0.08)',
    bgDark:   'rgba(100,149,237,0.13)',
    text:     '#2A5FAA',
    textDark: '#7AABD6',
    label:    'Unassigned',
  },
  not_started: {
    bg:       'rgba(67,107,172,0.08)',
    bgDark:   'rgba(100,149,237,0.13)',
    text:     '#2A5FAA',
    textDark: '#7AABD6',
    label:    'Not Started',
  },
  doc_pending: {
    bg:       'rgba(186,132,20,0.08)',
    bgDark:   'rgba(212,168,75,0.13)',
    text:     '#7A5400',
    textDark: '#D4A84B',
    label:    'Doc Pending',
  },
  sup_note_only: {
    bg:       'rgba(186,132,20,0.08)',
    bgDark:   'rgba(212,168,75,0.13)',
    text:     '#7A5400',
    textDark: '#D4A84B',
    label:    'Needs Session Note',
  },
  session_note_only: {
    bg:       'rgba(34,139,80,0.08)',
    bgDark:   'rgba(72,185,120,0.13)',
    text:     '#1A6842',
    textDark: '#5DB88E',
    label:    'Needs Supervision Note',
  },
  completed: {
    bg:       'rgba(34,139,80,0.08)',
    bgDark:   'rgba(72,185,120,0.13)',
    text:     '#1A6842',
    textDark: '#5DB88E',
    label:    'Completed',
  },
};

// Status icons
export const SESSION_STATUS_ICONS: Record<SessionStatus, React.ReactNode> = {
  unassigned:        <CalendarMinus  style={{ width: 10, height: 10, flexShrink: 0 }} />,
  not_started:       <CalendarDays   style={{ width: 10, height: 10, flexShrink: 0 }} />,
  doc_pending:       <CalendarClock  style={{ width: 10, height: 10, flexShrink: 0 }} />,
  sup_note_only:     <Check          style={{ width: 10, height: 10, flexShrink: 0 }} />,
  session_note_only: <Check          style={{ width: 10, height: 10, flexShrink: 0 }} />,
  completed:         <CheckCircle2   style={{ width: 10, height: 10, flexShrink: 0 }} />,
};

/**
 * Compute session status from the Session object alone.
 * Supervision-note partial states can only be determined inside SessionDetailsPanel
 * where internal note state is available.
 */
export function computeSessionStatus(session: Session): SessionStatus {
  const now = new Date();
  if (!session.providers || session.providers.length === 0) return 'unassigned';
  if (now < session.endTime) return 'not_started';
  if (session.notes && session.notes.trim().length > 0) return 'completed';
  return 'doc_pending';
}

/**
 * Compute detailed status when supervision note state is also known.
 * Used inside SessionDetailsPanel.
 */
export function computeDetailedStatus(
  session: Session,
  sessionNote: string,
  supNote: string,
): SessionStatus {
  const now = new Date();
  if (!session.providers || session.providers.length === 0) return 'unassigned';
  if (now < session.endTime) return 'not_started';
  const hasSession = sessionNote.trim().length > 0;
  const hasSup     = supNote.trim().length > 0;
  if (hasSession && hasSup) return 'completed';
  if (hasSup && !hasSession)     return 'sup_note_only';
  if (hasSession && !hasSup)     return 'session_note_only';
  return 'doc_pending';
}

// ─── SessionCard component ────────────────────────────────────────────────────

interface SessionCardProps {
  session: Session;
  onClick: () => void;
}

export const SessionCard = React.memo(function SessionCard({ session, onClick }: SessionCardProps) {
  const { isDark } = useTheme();

  const status = computeSessionStatus(session);
  const cfg    = SESSION_STATUS_CONFIG[status];
  const icon   = SESSION_STATUS_ICONS[status];

  const bg   = isDark ? cfg.bgDark  : cfg.bg;
  const text = isDark ? cfg.textDark : cfg.text;

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const durationMins = (session.endTime.getTime() - session.startTime.getTime()) / 60000;
  const isVeryShort  = durationMins <= 30;

  const timeRange = isVeryShort
    ? fmt(session.startTime)
    : `${fmt(session.startTime)} – ${fmt(session.endTime)}`;

  // Title: "Unassigned" when no providers, otherwise learner name / session name
  const displayName =
    status === 'unassigned'
      ? 'Unassigned'
      : (session.sessionName || session.students?.[0] || 'Session');

  return (
    <div
      onClick={onClick}
      className="h-full overflow-hidden select-none"
      style={{
        backgroundColor: isDark ? cfg.bgDark : cfg.bg,
        borderRadius: 6,
        boxShadow: isDark
          ? '0 1px 3px rgba(0,0,0,0.35)'
          : '0 1px 3px rgba(0,0,0,0.10)',
        display: 'flex',
        cursor: 'grab',
      }}
    >
      <div
        style={{
          flex: 1,
          padding: isVeryShort ? '1px 6px' : '3px 6px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: isVeryShort ? 'row' : 'column',
          alignItems: isVeryShort ? 'center' : 'flex-start',
          gap: isVeryShort ? 5 : 1,
          minWidth: 0,
        }}
      >
        {/* Title row: icon + name */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          minWidth: 0, flexShrink: 1,
          overflow: 'hidden',
        }}>
          <span style={{ color: text, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {icon}
          </span>
          <span
            style={{
              fontSize: 11, fontWeight: 600,
              color: text, lineHeight: 1.3,
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', fontFamily: 'inherit',
            }}
          >
            {displayName}
          </span>
        </div>

        {/* Time */}
        <div
          style={{
            fontSize: 10, color: text, opacity: 0.7,
            lineHeight: 1.3, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
            flexShrink: 0, fontFamily: 'inherit',
          }}
        >
          {timeRange}
        </div>
      </div>
    </div>
  );
});
