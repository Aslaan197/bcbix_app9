import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { Session, serviceConfig } from './SessionCard';
import { useTheme } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import { Button } from './ui/button';
import { ViewDropdown } from './ViewDropdown';
import { CreateDropdown } from './CreateDropdown';
import { CollaboratorsDropdown } from './CollaboratorsDropdown';

interface MonthViewProps {
  currentDate: Date;
  sessions: Session[];
  onSessionClick: (session: Session) => void;
  onDateClick: (date: Date) => void;
  enabledLayers: string[];
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onCreateSession?: () => void;
  onAutoSchedule?: () => void;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
  onFilterOpen?: () => void;
}

const darkServiceConfig = {
  'ABA Therapy': {
    bgColor:     'rgba(162,205,230,0.13)',
    borderColor: 'rgba(162,205,230,0.32)',
    accentColor: '#A2CDE6',
    textColor:   '#9BCCE3',
  },
  'Speech Therapy': {
    bgColor:     'rgba(182,212,170,0.12)',
    borderColor: 'rgba(182,212,170,0.30)',
    accentColor: '#B6D4AA',
    textColor:   '#95CC85',
  },
  'Occupational Therapy': {
    bgColor:     'rgba(199,176,228,0.13)',
    borderColor: 'rgba(199,176,228,0.30)',
    accentColor: '#C7B0E4',
    textColor:   '#C2A8E0',
  },
};

export function MonthView({
  currentDate, sessions, onSessionClick, onDateClick, enabledLayers,
  onPrevious, onNext, onToday, onCreateSession, onAutoSchedule,
  viewMode, onViewModeChange, onFilterOpen,
}: MonthViewProps) {
  const { colors: c, isDark } = useTheme();
  const { providers } = useParticipants();
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    () => providers.length > 0 ? [providers[0].name] : []
  );

  const getMonthDays = (date: Date): Date[] => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDow   = new Date(y, m, 1).getDay();
    const lastDate   = new Date(y, m + 1, 0).getDate();
    const prevLast   = new Date(y, m, 0).getDate();
    const days: Date[] = [];
    for (let i = firstDow - 1; i >= 0; i--)
      days.push(new Date(y, m - 1, prevLast - i));
    for (let i = 1; i <= lastDate; i++) days.push(new Date(y, m, i));
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push(new Date(y, m + 1, i));
    return days;
  };

  const days     = getMonthDays(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday  = (d: Date) => d.toDateString() === new Date().toDateString();
  const inMonth  = (d: Date) => d.getMonth() === currentDate.getMonth();

  const sessionsForDay = (d: Date) =>
    sessions.filter(
      s => s.startTime.toDateString() === d.toDateString() &&
           enabledLayers.includes(s.serviceType) &&
           (selectedCollaborators.length === 0 || s.providers.some(p => selectedCollaborators.includes(p)))
    );

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const outerBg   = isDark ? c.appBg    : '#FAFAF9';
  const cardBg    = isDark ? c.surface  : '#ffffff';
  const outerBdr  = isDark ? c.border   : 'rgba(0,0,0,0.08)';
  const cellBdr   = isDark ? c.divider  : 'rgba(0,0,0,0.06)';
  const offCellBg = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)';
  const hoverBg   = isDark ? 'rgba(255,255,255,0.03)'  : 'rgba(66,133,244,0.025)';

  const calTitle = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function NavArrow({
    onClick, title, children, c,
  }: {
    onClick?: () => void; title?: string;
    children: React.ReactNode;
    c: ReturnType<typeof useTheme>['colors'];
  }) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        title={title}
        className="h-5 w-5 rounded"
        style={{ color: c.t3 }}
      >
        {children}
      </Button>
    );
  }

  function CalTodayBtn({ onClick, c }: { onClick?: () => void; c: ReturnType<typeof useTheme>['colors'] }) {
    const [hover, setHover] = useState(false);
    return (
      <Button
        variant="outline" size="sm" onClick={onClick} title="Go to today"
        className="h-[28px] px-[10px] rounded-md focus-visible:ring-0"
        style={{ fontSize: 13, fontWeight: 500, color: c.t1, borderColor: c.border, backgroundColor: hover ? c.navHover : 'transparent', transition: 'background-color 0.12s' }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      >
        Today
      </Button>
    );
  }

  function CalFiltersBtn({ onClick, c }: { onClick?: () => void; c: ReturnType<typeof useTheme>['colors'] }) {
    const [hover, setHover] = useState(false);
    return (
      <Button
        variant="outline" size="sm" onClick={onClick} title="Filter sessions"
        className="h-[28px] px-[9px] gap-[5px] rounded-md focus-visible:ring-0"
        style={{ fontSize: 13, fontWeight: 500, color: c.t1, borderColor: c.border, backgroundColor: hover ? c.navHover : 'transparent', transition: 'background-color 0.12s' }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      >
        <ListFilter style={{ width: 13, height: 13 }} />
        Filters
      </Button>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: c.appBg, transition: 'background-color 0.2s' }}
    >
      {/* ── Navigation toolbar ── */}
      <div
        className="flex-shrink-0"
        style={{ backgroundColor: c.navBg, zIndex: 30, transition: 'background-color 0.2s' }}
      >
        {/* Title row */}
        <div
          className="flex items-center justify-between"
          style={{ height: 48, paddingLeft: 16, paddingRight: 16 }}
        >
          {/* Left: prev arrow + title + next arrow */}
          <div className="flex items-center gap-1">
            <NavArrow onClick={onPrevious} title="Previous month" c={c}>
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </NavArrow>
            <span style={{
              fontSize: 20, fontWeight: 600, color: c.t0,
              letterSpacing: '-0.2px', userSelect: 'none', lineHeight: 1,
            }}>
              {calTitle}
            </span>
            <NavArrow onClick={onNext} title="Next month" c={c}>
              <ChevronRight style={{ width: 15, height: 15 }} />
            </NavArrow>
          </div>

          {/* Right: Today | View | Filters | Collaborators | New */}
          <div className="flex items-center gap-1.5">
            <CalTodayBtn onClick={onToday} c={c} />
            {viewMode && onViewModeChange && (
              <ViewDropdown viewMode={viewMode} onChange={onViewModeChange} />
            )}
            <CalFiltersBtn onClick={onFilterOpen} c={c} />
            <CollaboratorsDropdown
              selected={selectedCollaborators}
              onChange={setSelectedCollaborators}
            />
            <CreateDropdown
              onScheduleSession={onCreateSession || (() => {})}
              onAutoSchedule={onAutoSchedule || (() => {})}
            />
          </div>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div
        className="flex-1 overflow-auto p-4"
        style={{ backgroundColor: outerBg }}
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: `1px solid ${outerBdr}`,
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
            backgroundColor: cardBg,
            maxWidth: 1400, margin: '0 auto',
            transition: 'background-color 0.2s',
          }}
        >
          {/* Weekday headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${cellBdr}` }}>
            {weekDays.map(d => (
              <div
                key={d}
                className="py-2.5 text-center"
                style={{
                  fontSize: 11, fontWeight: 600, color: c.t3,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const daySession  = sessionsForDay(day);
              const today       = isToday(day);
              const current     = inMonth(day);
              const isLast      = idx >= 35;
              const isLastCol   = idx % 7 === 6;

              return (
                <div
                  key={idx}
                  onClick={() => onDateClick(day)}
                  style={{
                    minHeight: 100, padding: '6px',
                    borderRight:  !isLastCol ? `1px solid ${cellBdr}` : 'none',
                    borderBottom: !isLast    ? `1px solid ${cellBdr}` : 'none',
                    backgroundColor: current ? cardBg : offCellBg,
                    cursor: 'pointer', boxSizing: 'border-box',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      current ? hoverBg : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'))
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = current ? cardBg : offCellBg)
                  }
                >
                  {/* Day number */}
                  <div className="flex items-start mb-1">
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 24, height: 24, fontSize: 12,
                        fontWeight: today ? 700 : current ? 400 : 300,
                        backgroundColor: today ? c.t0 : 'transparent',
                        color: today ? (isDark ? c.appBg : '#fff') : current ? c.t1 : c.t3,
                      }}
                    >
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Session pills */}
                  <div className="space-y-0.5">
                    {daySession.slice(0, 3).map(s => {
                      const lightCfg = serviceConfig[s.serviceType];
                      const darkCfg  = darkServiceConfig[s.serviceType];
                      const cfg      = isDark ? darkCfg : lightCfg;
                      return (
                        <div
                          key={s.id}
                          onClick={e => { e.stopPropagation(); onSessionClick(s); }}
                          className="flex items-center gap-1 rounded overflow-hidden"
                          style={{
                            height: 18, padding: '0 5px',
                            backgroundColor: cfg.bgColor,
                            border: `1px solid ${cfg.borderColor}`,
                            cursor: 'pointer',
                            transition: 'filter 0.1s',
                          }}
                          onMouseEnter={e =>
                            ((e.currentTarget as HTMLElement).style.filter = 'brightness(0.94)')
                          }
                          onMouseLeave={e =>
                            ((e.currentTarget as HTMLElement).style.filter = 'brightness(1)')
                          }
                        >
                          <div style={{
                            width: 5, height: 5, borderRadius: '50%',
                            backgroundColor: cfg.accentColor, flexShrink: 0,
                          }} />
                          <span className="truncate" style={{
                            fontSize: 10, color: cfg.textColor, fontWeight: 500,
                          }}>
                            {fmt(s.startTime)} {s.sessionName || s.students?.[0]}
                          </span>
                        </div>
                      );
                    })}
                    {daySession.length > 3 && (
                      <div style={{ fontSize: 10, color: c.t3, paddingLeft: 5 }}>
                        +{daySession.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}