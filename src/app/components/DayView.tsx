import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { Session, SessionCard } from './SessionCard';
import { useTheme } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import { Button } from './ui/button';
import { ViewDropdown } from './ViewDropdown';
import { CreateDropdown } from './CreateDropdown';
import { CollaboratorsDropdown } from './CollaboratorsDropdown';

interface DayViewProps {
  currentDate: Date;
  sessions: Session[];
  onSessionClick: (session: Session) => void;
  onSlotClick?: (date: Date, hour: number, minute: number) => void;
  onSessionUpdate?: (session: Session) => void;
  enabledLayers: string[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreateSession?: () => void;
  onAutoSchedule?: () => void;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
  onVisibleRangeChange?: (start: Date, end: Date) => void;
  onFilterOpen?: () => void;
}

const SLOT_HEIGHT = 22;
const HOUR_HEIGHT = SLOT_HEIGHT * 2;
const START_HOUR  = 0;
const END_HOUR    = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const GUTTER_W    = 54;

const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

function hourLabel(h: number): string {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function NavArrow({
  onClick, title, children, c,
}: {
  onClick: () => void; title?: string;
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

// ─── Calendar header action buttons ──────────────────────────────────────────

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

export function DayView({
  currentDate, sessions, onSessionClick, onSlotClick,
  onSessionUpdate, enabledLayers, onPrevious, onNext, onToday,
  onCreateSession, onAutoSchedule, viewMode, onViewModeChange, onVisibleRangeChange,
  onFilterOpen,
}: DayViewProps) {
  const { colors: c, isDark } = useTheme();
  const { providers } = useParticipants();
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    () => providers.length > 0 ? [providers[0].name] : []
  );

  const [now, setNow] = useState(new Date());
  const [drag, setDrag] = useState<{
    session: Session; snapHour: number; snapMin: number;
    mouseX: number; mouseY: number;
    offsetX: number; offsetY: number;
    cardW: number; cardH: number; moved: boolean;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    onVisibleRangeChange?.(currentDate, currentDate);
  }, [currentDate]); // eslint-disable-line

  const isToday     = currentDate.toDateString() === new Date().toDateString();
  const timeToTop   = (h: number, m: number) => (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  const nowTop      = timeToTop(now.getHours(), now.getMinutes());

  const sessionGeom = (s: Session) => {
    const top    = timeToTop(s.startTime.getHours(), s.startTime.getMinutes());
    const endTop = timeToTop(s.endTime.getHours(),   s.endTime.getMinutes());
    return { top, height: Math.max(endTop - top - 1, SLOT_HEIGHT - 2) };
  };

  const daySessions = sessions.filter(
    s => s.startTime.toDateString() === currentDate.toDateString() &&
         enabledLayers.includes(s.serviceType) &&
         (selectedCollaborators.length === 0 || s.providers.some(p => selectedCollaborators.includes(p)))
  );

  const calTitle = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const startDrag = (e: React.MouseEvent, session: Session) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({
      session,
      snapHour: session.startTime.getHours(), snapMin: session.startTime.getMinutes(),
      mouseX: e.clientX, mouseY: e.clientY,
      offsetX: e.clientX - rect.left,   // track horizontal offset too
      offsetY: e.clientY - rect.top,
      cardW: rect.width, cardH: rect.height, moved: false,
    });
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      if (!gridRef.current || !scrollRef.current) return;
      const dy = e.clientY - drag.mouseY;
      if (!drag.moved && Math.abs(dy) < 5) return;

      // FIX: gRect.top already incorporates scrollTop; do NOT add scrollTop again
      const gRect = gridRef.current.getBoundingClientRect();
      const relY  = e.clientY - gRect.top - drag.offsetY;
      const slot  = Math.max(0, Math.min(TOTAL_HOURS * 2 - 1, Math.round(relY / SLOT_HEIGHT)));
      const snapHour = START_HOUR + Math.floor(slot / 2);
      const snapMin  = (slot % 2) * 30;
      setDrag(prev => prev ? { ...prev, snapHour, snapMin, mouseX: e.clientX, mouseY: e.clientY, moved: true } : null);
    };
    const onUp = () => {
      if (drag.moved && onSessionUpdate) {
        const dur   = drag.session.endTime.getTime() - drag.session.startTime.getTime();
        const start = new Date(
          currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(),
          drag.snapHour, drag.snapMin
        );
        onSessionUpdate({ ...drag.session, startTime: start, endTime: new Date(start.getTime() + dur) });
      }
      setDrag(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, [drag, currentDate, onSessionUpdate]);

  const totalGridH = TOTAL_HOURS * HOUR_HEIGHT;
  const previewTop = drag?.moved ? timeToTop(drag.snapHour, drag.snapMin) : 0;
  const previewH   = drag?.session
    ? Math.max(
        ((drag.session.endTime.getTime() - drag.session.startTime.getTime()) / 3600000) * HOUR_HEIGHT - 1,
        SLOT_HEIGHT - 2
      )
    : 0;

  const GRID_LINE  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const SLOT_HOVER = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)';
  const DROP_BG    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const DROP_BDR   = isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(0,0,0,0.2)';

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: c.appBg, transition: 'background-color 0.2s' }}
    >

      {/* ── Sticky header ── */}
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
            <NavArrow onClick={onPrevious} title="Previous day" c={c}>
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </NavArrow>
            <span style={{
              fontSize: 20, fontWeight: 600, color: c.t0,
              letterSpacing: '-0.2px', userSelect: 'none', lineHeight: 1,
            }}>
              {calTitle}
            </span>
            <NavArrow onClick={onNext} title="Next day" c={c}>
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

        {/* Day header */}
        <div style={{ display: 'flex', height: 34 }}>
          <div style={{ width: GUTTER_W, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isToday ? (
              <div className="flex items-center gap-1">
                <span style={{ fontSize: 12, fontWeight: 500, color: c.t1 }}>
                  {currentDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <div className="flex items-center justify-center rounded-full" style={{
                  width: 22, height: 22, backgroundColor: c.t0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: c.navBg, lineHeight: 1 }}>
                    {String(currentDate.getDate()).padStart(2, '0')}
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 500, color: c.t2 }}>
                {currentDate.toLocaleDateString('en-US', { weekday: 'short' })} {String(currentDate.getDate()).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* All-day row */}
        <div style={{
          display: 'flex', height: 22,
          borderTop: `1px solid ${GRID_LINE}`, borderBottom: `1px solid ${GRID_LINE}`,
        }}>
          <div style={{
            width: GUTTER_W, flexShrink: 0,
            borderRight: `1px solid ${GRID_LINE}`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'flex-end', paddingRight: 6,
          }}>
            <span style={{ fontSize: 10, color: c.t3, fontWeight: 400, userSelect: 'none' }}>
              all-day
            </span>
          </div>
          <div style={{ flex: 1 }} />
        </div>
      </div>

      {/* ── Scrollable grid ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ cursor: drag?.moved ? 'grabbing' : 'default' }}
      >
        <div ref={gridRef} className="relative" style={{ height: totalGridH, maxWidth: 960, margin: '0 auto' }}>

          {/* Gutter */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: GUTTER_W,
            zIndex: 22, backgroundColor: c.appBg, borderRight: `1px solid ${GRID_LINE}`,
            transition: 'background-color 0.2s',
          }}>
            {isToday && (
              <span style={{
                position: 'absolute', top: nowTop, right: 5,
                transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600,
                color: '#EA4335', lineHeight: 1, userSelect: 'none',
                whiteSpace: 'nowrap', zIndex: 25, pointerEvents: 'none',
              }}>
                {fmtTime(now)}
              </span>
            )}
            {HOUR_LABELS.map((h, i) => (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0 }}>
                {i > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 6,
                    transform: 'translateY(-50%)', fontSize: 10, color: c.t3,
                    lineHeight: 1, userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    {hourLabel(h)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div style={{ position: 'absolute', top: 0, left: GUTTER_W, right: 0, bottom: 0 }}>
            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0,
                height: HOUR_HEIGHT, borderBottom: `1px solid ${GRID_LINE}`,
                boxSizing: 'border-box', pointerEvents: 'none',
              }} />
            ))}

            {/* Click zones */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const h = START_HOUR + i;
              return (
                <div
                  key={i}
                  onClick={e => {
                    if (drag?.moved) return;
                    const m = (e.nativeEvent as MouseEvent).offsetY < HOUR_HEIGHT / 2 ? 0 : 30;
                    onSlotClick?.(currentDate, h, m);
                  }}
                  style={{
                    position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0,
                    height: HOUR_HEIGHT, zIndex: 1,
                    cursor: drag?.moved ? 'grabbing' : 'pointer', boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    if (!drag?.moved)
                      (e.currentTarget as HTMLElement).style.backgroundColor = SLOT_HOVER;
                  }}
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
                  }
                />
              );
            })}

            {/* Current time line */}
            {isToday && (
              <div style={{
                position: 'absolute', top: nowTop, left: 0, right: 0,
                zIndex: 18, display: 'flex', alignItems: 'center', pointerEvents: 'none',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EA4335', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 2, backgroundColor: '#EA4335' }} />
              </div>
            )}

            {/* Drop preview */}
            {drag?.moved && (
              <div style={{
                position: 'absolute', top: previewTop, height: previewH,
                left: 4, right: 4, zIndex: 4, borderRadius: 2,
                border: `2px dashed ${DROP_BDR}`,
                backgroundColor: DROP_BG, pointerEvents: 'none',
              }} />
            )}

            {/* Session cards */}
            {daySessions
              .filter(s => !drag?.moved || drag.session.id !== s.id)
              .map(session => {
                const { top, height } = sessionGeom(session);
                const isDragging = drag?.session.id === session.id && drag.moved;
                return (
                  <div
                    key={session.id}
                    style={{
                      position: 'absolute', top, height, left: 4, right: 4,
                      zIndex: isDragging ? 0 : 5, opacity: isDragging ? 0.2 : 1,
                      cursor: drag?.moved ? 'grabbing' : 'grab', userSelect: 'none',
                    }}
                    onMouseDown={e => startDrag(e, session)}
                    onClick={e => { if (!drag?.moved) { e.stopPropagation(); onSessionClick(session); } }}
                  >
                    <SessionCard session={session} onClick={() => {}} />
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Drag ghost — now uses offsetX for precise horizontal tracking */}
      {drag?.moved && (
        <div style={{
          position: 'fixed',
          top: drag.mouseY - drag.offsetY,
          left: drag.mouseX - drag.offsetX,
          width: drag.cardW, height: drag.cardH,
          zIndex: 9999, pointerEvents: 'none',
          opacity: 0.9, transform: 'rotate(1deg) scale(1.02)', borderRadius: 2,
        }}>
          <SessionCard session={drag.session} onClick={() => {}} />
        </div>
      )}
    </div>
  );
}