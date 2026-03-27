import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { Session, SessionCard } from './SessionCard';
import { useTheme } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import { Button } from './ui/button';
import { ViewDropdown } from './ViewDropdown';
import { CreateDropdown } from './CreateDropdown';
import { CollaboratorsDropdown } from './CollaboratorsDropdown';

interface WeekViewProps {
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

const SLOT_HEIGHT  = 22;
const HOUR_HEIGHT  = SLOT_HEIGHT * 2;
const START_HOUR   = 0;
const END_HOUR     = 24;
const TOTAL_HOURS  = END_HOUR - START_HOUR;
const GUTTER_W     = 54;
const MIN_COL_W    = 96;

const WEEKS_AROUND = 2;
const TOTAL_WEEKS  = WEEKS_AROUND * 2 + 1;
const TOTAL_DAYS   = TOTAL_WEEKS * 7;

const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

function hourLabel(h: number): string {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Small nav arrow ──────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export function WeekView({
  currentDate, sessions, onSessionClick, onSlotClick,
  onSessionUpdate, enabledLayers, onPrevious, onNext, onToday,
  onCreateSession, onAutoSchedule, viewMode, onViewModeChange, onVisibleRangeChange,
  onFilterOpen,
}: WeekViewProps) {
  const { colors: c, isDark } = useTheme();
  const { providers } = useParticipants();
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    () => providers.length > 0 ? [providers[0].name] : []
  );

  const [now, setNow]                       = useState(new Date());
  const [containerWidth, setContainerWidth] = useState(0);
  const [drag, setDrag] = useState<{
    session: Session; dayIdx: number;
    snapHour: number; snapMin: number;
    mouseX: number; mouseY: number;
    offsetX: number; offsetY: number;
    cardW: number; cardH: number; moved: boolean;
  } | null>(null);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const gridRef     = useRef<HTMLDivElement>(null);
  const headerRef   = useRef<HTMLDivElement>(null);
  const allDayRef   = useRef<HTMLDivElement>(null);
  const colWidthRef = useRef(MIN_COL_W);

  const getWeekStart = (d: Date): Date => {
    const x = new Date(d);
    x.setDate(x.getDate() - x.getDay());
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

  const allDays = useMemo(() => {
    const ws   = getWeekStart(currentDate);
    const base = new Date(ws);
    base.setDate(base.getDate() - WEEKS_AROUND * 7);
    return Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [currentDate]); // eslint-disable-line

  const weekDays = allDays.slice(WEEKS_AROUND * 7, WEEKS_AROUND * 7 + 7);

  const todayIdx = useMemo(
    () => allDays.findIndex(d => isToday(d)),
    [allDays] // eslint-disable-line
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const colWidth = containerWidth > 0
    ? Math.max(MIN_COL_W, (containerWidth - GUTTER_W) / 7)
    : MIN_COL_W;

  colWidthRef.current = colWidth;
  const totalGridWidth = GUTTER_W + TOTAL_DAYS * colWidth;

  const reportVisibleRange = (scrollLeft: number, viewW: number) => {
    const cw = colWidthRef.current;
    if (cw <= 0) return;
    const firstIdx = Math.max(0, Math.floor(scrollLeft / cw));
    const cols     = Math.max(1, Math.floor((viewW - GUTTER_W) / cw));
    const lastIdx  = Math.min(TOTAL_DAYS - 1, firstIdx + cols - 1);
    onVisibleRangeChange?.(allDays[firstIdx], allDays[lastIdx]);
  };

  useLayoutEffect(() => {
    if (!scrollRef.current || containerWidth === 0) return;
    const target = WEEKS_AROUND * 7 * colWidthRef.current;
    scrollRef.current.scrollLeft = target;
    reportVisibleRange(target, containerWidth);
  }, [currentDate, containerWidth]); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      // Default scroll to 8 AM at top of view
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []); // eslint-disable-line

  const handleBodyScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft } = el;
    if (headerRef.current) headerRef.current.scrollLeft = scrollLeft;
    if (allDayRef.current) allDayRef.current.scrollLeft = scrollLeft;
    reportVisibleRange(scrollLeft, el.clientWidth);
  };

  const calTitle = () => {
    const end = weekDays[6];
    if (weekDays[0].getMonth() === end.getMonth())
      return weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (weekDays[0].getFullYear() === end.getFullYear())
      return `${weekDays[0].toLocaleDateString('en-US', { month: 'long' })} – ${end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    return `${weekDays[0].toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const timeToTop = (h: number, m: number) => (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  const nowTop    = timeToTop(now.getHours(), now.getMinutes());

  const sessionGeom = (s: Session) => {
    const top    = timeToTop(s.startTime.getHours(), s.startTime.getMinutes());
    const endTop = timeToTop(s.endTime.getHours(),   s.endTime.getMinutes());
    return { top, height: Math.max(endTop - top - 1, SLOT_HEIGHT - 2) };
  };

  const sessionsForDay = (d: Date) =>
    sessions.filter(
      s => s.startTime.toDateString() === d.toDateString() &&
           enabledLayers.includes(s.serviceType) &&
           (selectedCollaborators.length === 0 || s.providers.some(p => selectedCollaborators.includes(p)))
    );

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const startDrag = (e: React.MouseEvent, session: Session, dayIdx: number) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({
      session, dayIdx,
      snapHour: session.startTime.getHours(), snapMin: session.startTime.getMinutes(),
      mouseX: e.clientX, mouseY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      cardW: rect.width, cardH: rect.height, moved: false,
    });
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      if (!gridRef.current || !scrollRef.current) return;
      const dx = e.clientX - drag.mouseX;
      const dy = e.clientY - drag.mouseY;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;

      // FIX: gRect.top already accounts for scrollTop — do NOT add scrollTop again
      const gRect = gridRef.current.getBoundingClientRect();
      const relY  = e.clientY - gRect.top - drag.offsetY;
      const slot  = Math.max(0, Math.min(TOTAL_HOURS * 2 - 1, Math.round(relY / SLOT_HEIGHT)));
      const snapHour = START_HOUR + Math.floor(slot / 2);
      const snapMin  = (slot % 2) * 30;

      const scrollLeft = scrollRef.current.scrollLeft;
      const cw         = colWidthRef.current;
      const scrollContainerRect = scrollRef.current.getBoundingClientRect();
      const relX   = e.clientX - scrollContainerRect.left + scrollLeft - GUTTER_W;
      const dayIdx = Math.max(0, Math.min(TOTAL_DAYS - 1, Math.floor(relX / cw)));

      setDrag(prev => prev ? { ...prev, dayIdx, snapHour, snapMin, mouseX: e.clientX, mouseY: e.clientY, moved: true } : null);
    };
    const onUp = () => {
      if (drag.moved && onSessionUpdate) {
        const { session, snapHour, snapMin, dayIdx } = drag;
        const dur   = session.endTime.getTime() - session.startTime.getTime();
        const d     = allDays[dayIdx];
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), snapHour, snapMin);
        onSessionUpdate({ ...session, startTime: start, endTime: new Date(start.getTime() + dur) });
      }
      setDrag(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, [drag, allDays, onSessionUpdate]); // eslint-disable-line

  // ── Colors ───────────────────────────────────────────────────────────────────

  const totalGridH = TOTAL_HOURS * HOUR_HEIGHT;
  const GRID_LINE  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const SLOT_HOVER = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)';
  const DROP_BG    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const DROP_BDR   = isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(0,0,0,0.2)';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: c.appBg, transition: 'background-color 0.2s' }}
    >

      {/* ── Sticky header ──────────────────────────────────────────────────────── */}
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
            <NavArrow onClick={onPrevious} title="Previous week" c={c}>
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </NavArrow>
            <span style={{
              fontSize: 20, fontWeight: 600, color: c.t0,
              letterSpacing: '-0.2px', userSelect: 'none', lineHeight: 1,
            }}>
              {calTitle()}
            </span>
            <NavArrow onClick={onNext} title="Next week" c={c}>
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

        {/* Weekday header — synced via ref */}
        <div ref={headerRef} style={{ overflowX: 'hidden' }}>
          <div style={{ display: 'flex', height: 34, minWidth: totalGridWidth }}>
            {/* Sticky gutter */}
            <div style={{
              width: GUTTER_W, flexShrink: 0, position: 'sticky',
              left: 0, backgroundColor: c.navBg, zIndex: 5,
              transition: 'background-color 0.2s',
            }} />
            {allDays.map((day, i) => {
              const today   = isToday(day);
              const dateStr = String(day.getDate()).padStart(2, '0');
              const weekStr = day.toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <div key={i} style={{
                  width: colWidth, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {today ? (
                    <div className="flex items-center gap-1">
                      <span style={{ fontSize: 12, fontWeight: 500, color: c.t1 }}>{weekStr}</span>
                      <div className="flex items-center justify-center rounded-full" style={{
                        width: 22, height: 22, backgroundColor: c.t0, borderRadius: 6,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: c.navBg, lineHeight: 1 }}>
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 500, color: c.t2 }}>
                      {weekStr} {dateStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* All-day row */}
        <div ref={allDayRef} style={{ overflowX: 'hidden' }}>
          <div style={{
            display: 'flex', height: 22, minWidth: totalGridWidth,
            borderTop: `1px solid ${GRID_LINE}`, borderBottom: `1px solid ${GRID_LINE}`,
          }}>
            {/* Sticky label */}
            <div style={{
              width: GUTTER_W, flexShrink: 0, position: 'sticky',
              left: 0, backgroundColor: c.navBg, zIndex: 5,
              borderRight: `1px solid ${GRID_LINE}`,
              display: 'flex', alignItems: 'center',
              justifyContent: 'flex-end', paddingRight: 6,
              transition: 'background-color 0.2s',
            }}>
              <span style={{ fontSize: 10, color: c.t3, fontWeight: 400, userSelect: 'none' }}>
                all-day
              </span>
            </div>
            {allDays.map((_, i) => (
              <div key={i} style={{
                width: colWidth, flexShrink: 0,
                borderRight: i < allDays.length - 1 ? `1px solid ${GRID_LINE}` : 'none',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        style={{ cursor: drag?.moved ? 'grabbing' : 'default' }}
        onScroll={handleBodyScroll}
      >
        <div
          ref={gridRef}
          style={{ height: totalGridH, display: 'flex', minWidth: totalGridWidth, position: 'relative' }}
        >
          {/* ── Sticky time gutter ─────────────────────────────────────────────── */}
          <div style={{
            position: 'sticky', left: 0, width: GUTTER_W, flexShrink: 0,
            zIndex: 22, backgroundColor: c.appBg,
            borderRight: `1px solid ${GRID_LINE}`, alignSelf: 'stretch',
            transition: 'background-color 0.2s',
          }}>
            {/* Current time label */}
            {todayIdx !== -1 && (
              <span style={{
                position: 'absolute', top: nowTop, right: 5,
                transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600,
                color: '#EA4335', lineHeight: 1, userSelect: 'none',
                whiteSpace: 'nowrap', zIndex: 25, pointerEvents: 'none',
                backgroundColor: c.appBg,
              }}>
                {fmtTime(now)}
              </span>
            )}
            {/* Hour labels */}
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

          {/* ── Day columns (35 total) ────────────────────────────────────────── */}
          <div style={{ display: 'flex', flex: 1 }}>
            {allDays.map((day, dayIdx) => {
              const daySessions  = sessionsForDay(day).filter(
                s => !drag?.moved || drag.session.id !== s.id
              );
              const isDragTarget = drag?.moved && drag.dayIdx === dayIdx;
              const previewTop   = isDragTarget ? timeToTop(drag!.snapHour, drag!.snapMin) : 0;
              const previewH     = drag?.session
                ? Math.max(
                    ((drag.session.endTime.getTime() - drag.session.startTime.getTime()) / 3600000) * HOUR_HEIGHT - 1,
                    SLOT_HEIGHT - 2
                  )
                : 0;

              return (
                <div
                  key={dayIdx}
                  className="relative"
                  style={{ width: colWidth, flexShrink: 0, borderRight: `1px solid ${GRID_LINE}` }}
                >
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
                          onSlotClick?.(day, h, m);
                        }}
                        style={{
                          position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0,
                          height: HOUR_HEIGHT, zIndex: 1,
                          cursor: drag?.moved ? 'grabbing' : 'pointer',
                          boxSizing: 'border-box',
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

                  {/* Current time indicator */}
                  {todayIdx !== -1 && dayIdx === todayIdx && (
                    <div style={{
                      position: 'absolute', top: nowTop, left: 0, right: 0,
                      height: 0, zIndex: 18, display: 'flex', alignItems: 'center',
                      pointerEvents: 'none',
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EA4335', flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 2, backgroundColor: '#EA4335' }} />
                    </div>
                  )}
                  {todayIdx !== -1 && dayIdx < todayIdx && (
                    <div style={{
                      position: 'absolute', top: nowTop, left: 0, right: 0,
                      height: 1, borderTop: '1px dashed rgba(234,67,53,0.4)',
                      zIndex: 18, pointerEvents: 'none',
                    }} />
                  )}

                  {/* Drop preview */}
                  {isDragTarget && drag?.moved && (
                    <div style={{
                      position: 'absolute', top: previewTop, height: previewH,
                      left: 2, right: 2, zIndex: 4, borderRadius: 2,
                      border: `2px dashed ${DROP_BDR}`,
                      backgroundColor: DROP_BG, pointerEvents: 'none',
                    }} />
                  )}

                  {/* Session cards */}
                  {daySessions.map(session => {
                    const { top, height } = sessionGeom(session);
                    const isDragging = drag?.session.id === session.id && drag.moved;
                    return (
                      <div
                        key={session.id}
                        style={{
                          position: 'absolute', top, height, left: 2, right: 2,
                          zIndex: isDragging ? 0 : 5,
                          opacity: isDragging ? 0.2 : 1,
                          cursor: drag?.moved ? 'grabbing' : 'grab',
                          userSelect: 'none',
                        }}
                        onMouseDown={e => startDrag(e, session, dayIdx)}
                        onClick={e => {
                          if (!drag?.moved) { e.stopPropagation(); onSessionClick(session); }
                        }}
                      >
                        <SessionCard session={session} onClick={() => {}} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Drag ghost ────────────────────────────────────────────────────────── */}
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