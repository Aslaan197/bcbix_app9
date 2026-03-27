import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Sparkles, Wand2, Settings2, ThumbsUp, ThumbsDown, RotateCcw, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Session, serviceConfig } from './SessionCard';
import { useTheme, AppColors } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { ManageParticipantsModal } from './ManageParticipantsModal';
import { Sheet, SheetPortal, SheetOverlay, SheetTitle, SheetDescription } from './ui/sheet';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_OPTIONS: Session['serviceType'][] = [
  'ABA Therapy', 'Speech Therapy', 'Occupational Therapy',
];

const DURATION_OPTIONS = [
  { label: '30 min',    value: 30  },
  { label: '45 min',    value: 45  },
  { label: '1 hour',    value: 60  },
  { label: '1.5 hours', value: 90  },
  { label: '2 hours',   value: 120 },
];

const DAY_OPTIONS = [
  { label: 'S', fullLabel: 'Sun', value: 0 },
  { label: 'M', fullLabel: 'Mon', value: 1 },
  { label: 'T', fullLabel: 'Tue', value: 2 },
  { label: 'W', fullLabel: 'Wed', value: 3 },
  { label: 'T', fullLabel: 'Thu', value: 4 },
  { label: 'F', fullLabel: 'Fri', value: 5 },
  { label: 'S', fullLabel: 'Sat', value: 6 },
];

const COLOR_MAP: Record<Session['serviceType'], string> = {
  'ABA Therapy':          '#4F83CC',
  'Speech Therapy':       '#2E9E63',
  'Occupational Therapy': '#7C52D0',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── CSS animations ───────────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes as-gradient {
  0%   { background-position: 0%   0%;   }
  33%  { background-position: 100% 50%;  }
  66%  { background-position: 50%  100%; }
  100% { background-position: 0%   0%;   }
}
@keyframes as-modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(14px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}
@keyframes as-dot-bounce {
  0%, 80%, 100% { transform: translateY(0);    opacity: 0.35; }
  40%           { transform: translateY(-5px); opacity: 1;    }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'sheet' | 'transitioning' | 'analyzing' | 'preview';

interface FormState {
  students: string[];
  providers: string[];
  services: Session['serviceType'][];
  startDate: string;
  endDate: string;
  durationMins: number;
  preferredStartTime: string;
  preferredEndTime: string;
  workingDays: number[];
  constraints: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNextMonday() {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function defaultForm(): FormState {
  const start = getNextMonday();
  return {
    students: [],
    providers: [],
    services: ['ABA Therapy'],
    startDate: start,
    endDate: addDays(start, 13),
    durationMins: 60,
    preferredStartTime: '09:00',
    preferredEndTime: '15:00',
    workingDays: [1, 2, 3, 4, 5],
    constraints: '',
  };
}

function getWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtHour(h: number): string {
  if (h === 0)  return '12 am';
  if (h < 12)   return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

function fmtDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function generateSchedule(form: FormState): Session[] {
  if (!form.students.length || !form.services.length || !form.workingDays.length) return [];

  const sessions: Session[] = [];
  const [sy, sm, sd] = form.startDate.split('-').map(Number);
  const [ey, em, ed] = form.endDate.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate   = new Date(ey, em - 1, ed);
  const [prefH, prefM] = form.preferredStartTime.split(':').map(Number);
  const DEFAULT_PROVIDERS = ['Dr. Sarah Thompson', 'Dr. Michael Chen'];
  const providers = form.providers.length > 0 ? form.providers : DEFAULT_PROVIDERS;

  let counter = 0;

  for (let d = new Date(startDate.getTime()); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (!form.workingDays.includes(d.getDay())) continue;

    let offsetMins = 0;

    form.students.forEach((student, idx) => {
      const serviceType = form.services[idx % form.services.length];
      const provider    = providers[idx % providers.length];
      const totalMins   = prefH * 60 + prefM + offsetMins;
      const hour        = Math.floor(totalMins / 60);
      const min         = totalMins % 60;

      if (hour >= 17) return;

      const sStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, min);
      const sEnd   = new Date(sStart.getTime() + form.durationMins * 60000);

      sessions.push({
        id:          `ai-${Date.now()}-${counter++}`,
        sessionName: `${student.split(' ')[0]} – ${serviceType.split(' ')[0]}`,
        students:    [student],
        providers:   [provider],
        serviceType,
        startTime:   sStart,
        endTime:     sEnd,
        color:       COLOR_MAP[serviceType],
      });

      offsetMins += form.durationMins + 10;
    });
  }

  return sessions;
}

// ─── Form sub-components ──────────────────────────────────────────────────────

function SectionHeader({ children, c }: { children: React.ReactNode; c: AppColors }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function FieldLabel({ children, c }: { children: React.ReactNode; c: AppColors }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: c.t2, marginBottom: 5 }}>
      {children}
    </div>
  );
}

function AvatarBadge({ initials, color, square }: { initials: string; color: string; square?: boolean }) {
  return (
    <div style={{ width: 20, height: 20, borderRadius: square ? 4 : '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

interface ParticipantOption {
  name: string;
  initials: string;
  avatarColor: string;
}

function ParticipantMultiSelect({
  label, options, selected, onChange, placeholder, isSquareAvatar, c, onManage,
}: {
  label: string;
  options: ParticipantOption[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  isSquareAvatar: boolean;
  c: AppColors;
  onManage?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  const getOption = (name: string) => options.find(o => o.name === name);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', minHeight: 36,
          padding: selected.length > 0 ? '5px 10px' : '0 10px',
          border: `1px solid ${open ? c.inputFocus : c.inputBorder}`,
          borderRadius: 8, backgroundColor: c.inputBg,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 6, boxSizing: 'border-box', textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minWidth: 0 }}>
          {selected.length === 0 ? (
            <span style={{ fontSize: 13, color: c.t3 }}>{placeholder}</span>
          ) : (
            selected.map(v => {
              const opt = getOption(v);
              return (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: c.navActive, borderRadius: 5, padding: '2px 6px 2px 4px', fontSize: 12, color: c.t0, whiteSpace: 'nowrap' }}>
                  {opt && <AvatarBadge initials={opt.initials} color={opt.avatarColor} square={isSquareAvatar} />}
                  {v.split(' ')[0]}
                  <span onClick={e => { e.stopPropagation(); toggle(v); }} style={{ cursor: 'pointer', color: c.t3, fontSize: 14, lineHeight: 1, marginTop: -1 }}>×</span>
                </span>
              );
            })
          )}
        </div>
        <ChevronDown style={{ width: 13, height: 13, color: c.t3, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300, backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: 240 }}>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {options.map(opt => {
              const isSel = selected.includes(opt.name);
              return (
                <div
                  key={opt.name}
                  onClick={() => toggle(opt.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', backgroundColor: isSel ? c.navActive : 'transparent', transition: 'background-color 0.08s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : c.navHover)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : 'transparent')}
                >
                  <AvatarBadge initials={opt.initials} color={opt.avatarColor} square={isSquareAvatar} />
                  <span style={{ flex: 1, fontSize: 13, color: c.t0 }}>{opt.name}</span>
                  {isSel && <Check style={{ width: 12, height: 12, color: c.accent, flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
          {onManage && (
            <>
              <div style={{ height: 1, backgroundColor: c.divider }} />
              <button
                type="button"
                onClick={() => { setOpen(false); onManage(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background-color 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
              >
                <Settings2 style={{ width: 12, height: 12, color: c.t3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: c.t3 }}>Manage {label}…</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal Header ─────────────────────────────────────────────────────────────

function ModalHeader({
  phase, weekStart, weekEnd, onPrevWeek, onNextWeek, onClose, c, isDark,
}: {
  phase: 'analyzing' | 'preview';
  weekStart?: Date;
  weekEnd?: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onClose: () => void;
  c: AppColors;
  isDark: boolean;
}) {
  const pillBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0 10px', height: 28, borderRadius: 6,
    border: `1px solid ${c.border}`, backgroundColor: c.surface,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background-color 0.1s',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0 16px', height: 52,
      borderBottom: `1px solid ${c.border}`,
      flexShrink: 0, backgroundColor: c.surface,
      gap: 8,
    }}>
      {/* Left: title */}
      <span style={{ fontSize: 15, fontWeight: 600, color: c.t0, flexShrink: 0 }}>
        Schedule Preview
      </span>

      {/* Center: date nav (preview) or spacer */}
      {phase === 'preview' && weekStart && weekEnd ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <button
            onClick={onPrevWeek}
            style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${c.border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            <ChevronLeft style={{ width: 12, height: 12, color: c.t2 }} />
          </button>
          <button
            onClick={onNextWeek}
            style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${c.border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            <ChevronRight style={{ width: 12, height: 12, color: c.t2 }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: c.t0, whiteSpace: 'nowrap' }}>
            {fmtDateRange(weekStart, weekEnd)}
          </span>
        </div>
      ) : null}

      {/* Flex spacer */}
      <div style={{ flex: 1 }} />

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Color Code pill */}
        <button
          style={pillBtn}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.surface}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isDark ? '#e5e5e5' : '#1a1a1a', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: c.t1, userSelect: 'none' }}>Color Code</span>
          <ChevronDown style={{ width: 11, height: 11, color: c.t3 }} />
        </button>

        {/* Week / Month toggle — generating only */}
        {phase === 'analyzing' && (
          <div style={{ display: 'flex', border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <button style={{ padding: '0 10px', height: 28, fontSize: 12, fontWeight: 600, color: c.t0, backgroundColor: c.navActive, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Week
            </button>
            <button style={{ padding: '0 10px', height: 28, fontSize: 12, fontWeight: 400, color: c.t2, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Month
            </button>
          </div>
        )}

        {/* Settings pill */}
        <button
          style={pillBtn}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.surface}
        >
          <Settings style={{ width: 13, height: 13, color: c.t2, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: c.t1, userSelect: 'none' }}>Settings</span>
          {phase === 'analyzing' && <ChevronDown style={{ width: 11, height: 11, color: c.t3 }} />}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.1s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
        >
          <X style={{ width: 15, height: 15, color: c.t2 }} />
        </button>
      </div>
    </div>
  );
}

// ─── Generating body ──────────────────────────────────────────────────────────

function GeneratingBody() {
  return (
    <div
      style={{
        flex: 1,
        background: 'linear-gradient(160deg, #ffffff 0%, #f4f3ff 16%, #ede8ff 34%, #e4deff 52%, #dbd3ff 70%, #d0c9fb 88%)',
        backgroundSize: '260% 260%',
        animation: 'as-gradient 10s ease infinite',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      }}
    >
      <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 400, letterSpacing: 0 }}>
        Generating...
      </span>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 4, height: 4, borderRadius: '50%',
              backgroundColor: '#9b8fd4',
              animation: `as-dot-bounce 1.3s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Week calendar preview ────────────────────────────────────────────────────

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CAL_START_HOUR = 4;
const CAL_END_HOUR   = 19;
const HOUR_PX        = 64;
const TIME_GUTTER_W  = 52;

function formatCalHour(h: number): string {
  if (h === 0)  return '12 am';
  if (h < 12)   return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

function getWeekStart(sessions: Session[], weekOffset: number): Date {
  let base: Date;
  if (sessions.length === 0) {
    base = new Date();
  } else {
    base = sessions.reduce(
      (min, s) => s.startTime < min ? s.startTime : min,
      sessions[0].startTime,
    );
  }
  const d = new Date(base);
  d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtWeekRange(ws: Date): string {
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${ws.toLocaleDateString('en-US', opts)} – ${we.toLocaleDateString('en-US', opts)}`;
}

function PreviewWeekCalendar({ sessions, weekOffset, c, isDark }: {
  sessions: Session[];
  weekOffset: number;
  c: AppColors;
  isDark: boolean;
}) {
  const weekStart = getWeekStart(sessions, weekOffset);
  const totalHours = CAL_END_HOUR - CAL_START_HOUR;
  const gridH = totalHours * HOUR_PX;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const sessionsByDay = days.map(day =>
    sessions
      .filter(s => s.startTime.toDateString() === day.toDateString())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Day column headers ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', flexShrink: 0, backgroundColor: '#fff' }}>
        <div style={{ width: TIME_GUTTER_W, flexShrink: 0 }} />
        <div style={{ width: 1, backgroundColor: '#e8e8e8', flexShrink: 0 }} />
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '10px 4px', gap: 4,
                borderRight: i < 6 ? '1px solid #e8e8e8' : 'none',
              }}
            >
              <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {DAY_NAMES_FULL[i]}
              </span>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                backgroundColor: isToday ? '#1a73e8' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : '#333' }}>
                  {day.getDate()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Scrollable time grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', height: gridH }}>

          {/* Time labels */}
          <div style={{ width: TIME_GUTTER_W, flexShrink: 0, position: 'relative', height: gridH }}>
            {Array.from({ length: totalHours }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * HOUR_PX - 8,
                  left: 0, right: 0,
                  height: HOUR_PX,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                }}
              >
                {i > 0 && (
                  <span style={{ fontSize: 10, color: '#bbb', whiteSpace: 'nowrap', lineHeight: 1 }}>
                    {formatCalHour(CAL_START_HOUR + i)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Separator */}
          <div style={{ width: 1, backgroundColor: '#e8e8e8', flexShrink: 0 }} />

          {/* Day columns */}
          {days.map((_, colIdx) => (
            <div
              key={colIdx}
              style={{
                flex: 1, position: 'relative', height: gridH,
                borderRight: colIdx < 6 ? '1px solid #e8e8e8' : 'none',
              }}
            >
              {/* Hour lines */}
              {Array.from({ length: totalHours }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute', left: 0, right: 0,
                    top: i * HOUR_PX, height: 1,
                    backgroundColor: '#f0f0f0',
                  }}
                />
              ))}

              {/* Session tiles */}
              {sessionsByDay[colIdx].map(session => {
                const sh = session.startTime.getHours();
                const sm = session.startTime.getMinutes();
                const eh = session.endTime.getHours();
                const em = session.endTime.getMinutes();
                const startMins = (sh * 60 + sm) - CAL_START_HOUR * 60;
                const endMins   = (eh * 60 + em) - CAL_START_HOUR * 60;
                const cs = Math.max(0, startMins);
                const ce = Math.min(totalHours * 60, endMins);
                if (ce <= cs) return null;
                const top    = (cs / 60) * HOUR_PX;
                const height = Math.max(22, ((ce - cs) / 60) * HOUR_PX - 2);
                const cfg    = serviceConfig[session.serviceType];
                const accent = session.color || cfg.accentColor;
                return (
                  <div
                    key={session.id}
                    style={{
                      position: 'absolute', left: 2, right: 2, top, height,
                      backgroundColor: cfg.bgColor,
                      borderLeft: `3px solid ${accent}`,
                      borderRadius: 4, padding: '3px 6px',
                      overflow: 'hidden', boxSizing: 'border-box',
                    }}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: cfg.textColor,
                      lineHeight: 1.3, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {session.students[0] || session.sessionName}
                    </div>
                    {height >= 36 && session.providers[0] && (
                      <div style={{ fontSize: 10, color: cfg.textColor, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.providers[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AutoScheduleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (sessions: Session[]) => void;
}

export function AutoScheduleSheet({ isOpen, onClose, onInsert }: AutoScheduleSheetProps) {
  const { colors: c, isDark } = useTheme();
  const { students, providers } = useParticipants();
  const [phase, setPhase] = useState<Phase>('sheet');
  const [manageOpen,     setManageOpen]     = useState(false);
  const [manageInitTab,  setManageInitTab]  = useState<'students' | 'providers'>('students');
  const [form,           setForm]           = useState<FormState>(defaultForm);
  const [generatedSessions, setGeneratedSessions] = useState<Session[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Compute current week range ─────────────────────────────────────────────
  const sortedSessions = [...generatedSessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const baseDate       = sortedSessions.length > 0 ? sortedSessions[0].startTime : new Date();
  const baseWeekSunday = getWeekSunday(baseDate);
  const currentWeekStart = (() => {
    const d = new Date(baseWeekSunday);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  })();
  const currentWeekEnd = (() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 6);
    return d;
  })();

  // ── Reset phase after close ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setPhase('sheet');
        setGeneratedSessions([]);
        setWeekOffset(0);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Auto-advance to preview after generation ───────────────────────────────
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const t = setTimeout(() => setPhase('preview'), 2800);
    return () => clearTimeout(t);
  }, [phase]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    const sessions = generateSchedule(form);
    setGeneratedSessions(sessions);
    setWeekOffset(0);
    setPhase('transitioning');
    setTimeout(() => setPhase('analyzing'), 300);
  };

  const handleRegenerate = () => {
    const sessions = generateSchedule(form);
    setGeneratedSessions(sessions);
    setWeekOffset(0);
    setPhase('analyzing');
  };

  const handleInsert = () => {
    onInsert(generatedSessions);
    onClose();
  };

  const sheetVisible  = isOpen && (phase === 'sheet' || phase === 'transitioning');
  const modalVisible  = isOpen && (phase === 'analyzing' || phase === 'preview');
  const isFormValid   = form.students.length > 0 && form.services.length > 0;

  const studentOptions  = students.map(s => ({ name: s.name, initials: s.initials, avatarColor: s.avatarColor }));
  const providerOptions = providers.map(p => ({ name: p.name, initials: p.initials, avatarColor: p.avatarColor }));

  return (
    <>
      <style>{ANIM_CSS}</style>

      {/* ── Side Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={sheetVisible} onOpenChange={open => !open && onClose()}>
        <SheetPortal>
          <SheetOverlay
            className={cn(
              'fixed inset-0 z-50',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'bg-black/22',
            )}
            onClick={phase === 'sheet' ? onClose : undefined}
          />
          <SheetPrimitive.Content
            className={cn(
              'fixed right-0 top-0 h-full z-51 flex flex-col',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              'data-[state=open]:duration-300 data-[state=closed]:duration-250',
            )}
            style={{
              width: 440, zIndex: 51,
              backgroundColor: c.surface, borderLeft: `1px solid ${c.border}`,
              boxShadow: isDark ? '-8px 0 40px rgba(0,0,0,0.40)' : '-8px 0 40px rgba(0,0,0,0.10)',
            }}
          >
            <SheetTitle className="sr-only">Auto-Schedule Sessions</SheetTitle>
            <SheetDescription className="sr-only">Configure and generate an AI-powered schedule</SheetDescription>

            {/* Sheet header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wand2 style={{ width: 15, height: 15, color: '#7C52D0' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: c.t0 }}>Auto-Schedule</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-md" style={{ color: c.t3 }}>
                <X style={{ width: 14, height: 14 }} />
              </Button>
            </div>

            {/* Sheet body */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <ScrollArea className="h-full">
                <div style={{ padding: '22px 20px 8px' }}>

                  <SectionHeader c={c}>Participants</SectionHeader>

                  <div style={{ marginBottom: 14 }}>
                    <FieldLabel c={c}>Students</FieldLabel>
                    <ParticipantMultiSelect
                      label="students" options={studentOptions} selected={form.students}
                      onChange={v => update('students', v)} placeholder="Select students to schedule"
                      isSquareAvatar={true} c={c}
                      onManage={() => { setManageInitTab('students'); setManageOpen(true); }}
                    />
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <FieldLabel c={c}>Providers</FieldLabel>
                    <ParticipantMultiSelect
                      label="providers" options={providerOptions} selected={form.providers}
                      onChange={v => update('providers', v)} placeholder="Select providers (optional)"
                      isSquareAvatar={false} c={c}
                      onManage={() => { setManageInitTab('providers'); setManageOpen(true); }}
                    />
                  </div>

                  <Separator style={{ backgroundColor: c.divider, marginBottom: 22 }} />

                  <SectionHeader c={c}>Services</SectionHeader>

                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', gap: 7 }}>
                      {SERVICE_OPTIONS.map(svc => {
                        const cfg   = serviceConfig[svc];
                        const isSel = form.services.includes(svc);
                        const shortLabel = svc === 'Occupational Therapy' ? 'OT' : svc.split(' ')[0];
                        return (
                          <button
                            key={svc} type="button"
                            onClick={() => {
                              if (isSel && form.services.length === 1) return;
                              update('services', isSel ? form.services.filter(s => s !== svc) : [...form.services, svc]);
                            }}
                            style={{
                              flex: 1, height: 36, borderRadius: 8, cursor: 'pointer',
                              border: isSel ? `1.5px solid ${cfg.accentColor}` : `1px solid ${c.inputBorder}`,
                              backgroundColor: isSel ? (isDark ? `${cfg.accentColor}20` : cfg.bgColor) : 'transparent',
                              fontSize: 12, fontWeight: isSel ? 600 : 400,
                              color: isSel ? (isDark ? cfg.accentColor : cfg.textColor) : c.t2,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 5, transition: 'all 0.12s', fontFamily: 'inherit',
                            }}
                          >
                            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.accentColor }} />
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator style={{ backgroundColor: c.divider, marginBottom: 22 }} />

                  <SectionHeader c={c}>Schedule</SectionHeader>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                      <FieldLabel c={c}>Start Date</FieldLabel>
                      <Input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className="h-9 rounded-lg text-[13px] focus-visible:ring-1" style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder, colorScheme: 'inherit' }} />
                    </div>
                    <div>
                      <FieldLabel c={c}>End Date</FieldLabel>
                      <Input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} className="h-9 rounded-lg text-[13px] focus-visible:ring-1" style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder, colorScheme: 'inherit' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <FieldLabel c={c}>Session Duration</FieldLabel>
                    <Select value={String(form.durationMins)} onValueChange={v => update('durationMins', Number(v))}>
                      <SelectTrigger className="h-9 rounded-lg text-[13px] focus-visible:ring-1" style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(d => (
                          <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                      <FieldLabel c={c}>Preferred Start</FieldLabel>
                      <Input type="time" value={form.preferredStartTime} onChange={e => update('preferredStartTime', e.target.value)} className="h-9 rounded-lg text-[13px] focus-visible:ring-1" style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder, colorScheme: 'inherit' }} />
                    </div>
                    <div>
                      <FieldLabel c={c}>Preferred End</FieldLabel>
                      <Input type="time" value={form.preferredEndTime} onChange={e => update('preferredEndTime', e.target.value)} className="h-9 rounded-lg text-[13px] focus-visible:ring-1" style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder, colorScheme: 'inherit' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <FieldLabel c={c}>Working Days</FieldLabel>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {DAY_OPTIONS.map(d => {
                        const isSel = form.workingDays.includes(d.value);
                        return (
                          <button
                            key={d.value} type="button" title={d.fullLabel}
                            onClick={() => update('workingDays', isSel ? form.workingDays.filter(x => x !== d.value) : [...form.workingDays, d.value])}
                            style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, border: isSel ? `2px solid ${c.accent}` : `1.5px solid ${c.inputBorder}`, backgroundColor: isSel ? c.accent : 'transparent', color: isSel ? '#fff' : c.t2, fontSize: 11, fontWeight: isSel ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator style={{ backgroundColor: c.divider, marginBottom: 22 }} />

                  <SectionHeader c={c}>Conditions</SectionHeader>

                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel c={c}>Optional Constraints</FieldLabel>
                    <Textarea
                      value={form.constraints}
                      onChange={e => update('constraints', e.target.value)}
                      placeholder="e.g. No back-to-back sessions for Emma, avoid Thursday afternoons..."
                      rows={3}
                      className="rounded-lg text-[13px] focus-visible:ring-1 resize-y min-h-[80px]"
                      style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder }}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Sheet footer */}
            <div style={{ borderTop: `1px solid ${c.border}`, padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0, backgroundColor: c.surface }}>
              <Button variant="outline" onClick={onClose} className="h-[34px] px-4 rounded-lg text-sm font-medium" style={{ color: c.t1, borderColor: c.inputBorder, backgroundColor: 'transparent' }}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate} disabled={!isFormValid}
                className="h-[34px] px-[18px] rounded-lg text-sm font-semibold gap-[6px]"
                style={{ backgroundColor: isFormValid ? '#7C52D0' : c.toggleOff, color: isFormValid ? '#fff' : c.t3, border: 'none' }}
              >
                <Sparkles style={{ width: 13, height: 13 }} />
                Generate Schedule
              </Button>
            </div>
          </SheetPrimitive.Content>
        </SheetPortal>
      </Sheet>

      {/* ── Modal backdrop ─────────────────────────────────────────────────── */}
      {modalVisible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 52,
          backgroundColor: 'rgba(0,0,0,0.38)',
          animation: 'as-backdrop-in 0.2s ease',
        }} />
      )}

      {/* ── Modal (analyzing + preview) ────────────────────────────────────── */}
      {modalVisible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 53,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '28px 24px',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 920,
            height: '100%',
            maxHeight: 660,
            backgroundColor: c.surface,
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isDark
              ? '0 24px 80px rgba(0,0,0,0.52)'
              : '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            animation: 'as-modal-in 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            pointerEvents: 'all',
            border: `1px solid ${c.border}`,
          }}>
            {/* Shared header */}
            <ModalHeader
              phase={phase as 'analyzing' | 'preview'}
              weekStart={phase === 'preview' ? currentWeekStart : undefined}
              weekEnd={phase === 'preview' ? currentWeekEnd : undefined}
              onPrevWeek={() => setWeekOffset(o => Math.max(0, o - 1))}
              onNextWeek={() => setWeekOffset(o => o + 1)}
              onClose={onClose}
              c={c}
              isDark={isDark}
            />

            {/* Content */}
            {phase === 'analyzing' && <GeneratingBody />}
            {phase === 'preview' && (
              <PreviewWeekCalendar
                sessions={generatedSessions}
                weekOffset={weekOffset}
                c={c}
                isDark={isDark}
              />
            )}

            {/* Preview footer */}
            {phase === 'preview' && (
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 16px',
                borderTop: `1px solid ${c.border}`,
                flexShrink: 0,
                backgroundColor: c.surface,
                gap: 6,
              }}>
                {/* Left: action buttons */}
                <button
                  onClick={handleRegenerate}
                  style={{
                    height: 32, padding: '0 14px', borderRadius: 6,
                    border: `1px solid ${c.border}`, backgroundColor: 'transparent',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, color: c.t1, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  <RotateCcw style={{ width: 13, height: 13, color: c.t2, flexShrink: 0 }} />
                  Regenerate
                </button>
                <button
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: `1px solid ${c.border}`, backgroundColor: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  <ThumbsUp style={{ width: 14, height: 14, color: c.t2 }} />
                </button>
                <button
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: `1px solid ${c.border}`, backgroundColor: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  <ThumbsDown style={{ width: 14, height: 14, color: c.t2 }} />
                </button>

                <div style={{ flex: 1 }} />

                {/* Right: Add to Calendar */}
                <button
                  onClick={handleInsert}
                  style={{
                    height: 32, padding: '0 20px', borderRadius: 6, border: 'none',
                    backgroundColor: '#1a73e8', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'background-color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#1558c0'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#1a73e8'}
                >
                  Add to Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage participants */}
      <ManageParticipantsModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        initialTab={manageInitTab}
      />
    </>
  );
}