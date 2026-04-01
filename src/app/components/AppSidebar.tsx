import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, X } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import { useTheme } from '../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';

// ─── Icon helper ───────────────────────────────────────────────────────────────

type SvgAttr = Record<string, string | number>;
function makeIcon(defs: Array<[string, SvgAttr]>): IconSvgElement {
  return defs as unknown as IconSvgElement;
}

// ─── Icon definitions — all 24×24, strokeWidth 1.5 ────────────────────────────

const IC_CALENDAR = makeIcon([
  ['rect',  { key: '0', x: 3, y: 4, width: 18, height: 17, rx: 3,  stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['path',  { key: '1', d: 'M3 10H21',                              stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }],
  ['path',  { key: '2', d: 'M8 2V6',                               stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }],
  ['path',  { key: '3', d: 'M16 2V6',                              stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }],
]);

const IC_LEARNERS = makeIcon([
  ['circle',{ key: '0', cx: 8,  cy: 7, r: 3.5, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['path',  { key: '1', d: 'M2 20c0-3.866 2.686-7 6-7s6 3.134 6 7', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', fill: 'none' }],
  ['circle',{ key: '2', cx: 16, cy: 8, r: 2.5, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['path',  { key: '3', d: 'M14 14c1.333-.333 4 .4 6 3',          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', fill: 'none' }],
]);

const IC_PROGRAM_TEMPLATES = makeIcon([
  ['rect',  { key: '0', x: 3,  y: 3,  width: 8, height: 8, rx: 1.5, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['rect',  { key: '1', x: 13, y: 3,  width: 8, height: 8, rx: 1.5, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['rect',  { key: '2', x: 3,  y: 13, width: 8, height: 8, rx: 1.5, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['path',  { key: '3', d: 'M17 13v8M13 17h8',                    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }],
]);

const IC_REPORTS = makeIcon([
  ['path',  { key: '0', d: 'M3 3v18h18',                          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }],
  ['rect',  { key: '1', x: 6,  y: 13, width: 4, height: 8, rx: 1, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['rect',  { key: '2', x: 12, y: 9,  width: 4, height: 12, rx: 1, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['rect',  { key: '3', x: 18, y: 5,  width: 3, height: 16, rx: 1, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
]);

const IC_HISTORY = makeIcon([
  ['path',  { key: '0', d: 'M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }],
  ['path',  { key: '1', d: 'M3 4v4h4',                            stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }],
  ['path',  { key: '2', d: 'M12 7v5l3 3',                         stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }],
]);

const IC_SETTINGS = makeIcon([
  ['circle',{ key: '0', cx: 12, cy: 12, r: 3, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }],
  ['path',  { key: '1', d: 'M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', fill: 'none' }],
]);

// ─── Module types ──────────────────────────────────────────────────────────────

export type ModuleId =
  | 'calendar'
  | 'learners'
  | 'program-templates'
  | 'reports'
  | 'history-activity'
  | 'settings';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: IconSvgElement;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'calendar',          label: 'Calendar',          icon: IC_CALENDAR          },
  { id: 'learners',          label: 'Learners',           icon: IC_LEARNERS          },
  { id: 'program-templates', label: 'Program Templates',  icon: IC_PROGRAM_TEMPLATES },
  { id: 'reports',           label: 'Reports',            icon: IC_REPORTS           },
  { id: 'history-activity',  label: 'History & Activity', icon: IC_HISTORY           },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: IC_SETTINGS },
];

const SIDEBAR_WIDTH = 240;

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  activeModule: ModuleId;
  onModuleChange: (id: ModuleId) => void;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  visibleRange?: { start: Date; end: Date };
  /** Mobile drawer: controlled open state */
  mobileOpen?: boolean;
  /** Mobile drawer: callback to close */
  onMobileClose?: () => void;
}

// ─── Workspace Switcher ────────────────────────────────────────────────────────

function WorkspaceSwitcher({ c, isDark }: { c: ReturnType<typeof useTheme>['colors']; isDark: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '10px 12px',
        background: 'none', border: 'none', cursor: 'pointer',
        borderRadius: 'var(--radius-button)',
        backgroundColor: hovered ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : 'transparent',
        transition: 'background-color 0.12s',
        fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      {/* Workspace avatar — square, light bg */}
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.72)',
          fontFamily: 'inherit', userSelect: 'none', letterSpacing: '-0.02em',
        }}>
          A
        </span>
      </div>

      {/* Workspace name */}
      <span style={{
        flex: 1, fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)',
        color: isDark ? 'rgba(255,255,255,0.82)' : '#222222',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontFamily: 'inherit',
      }}>
        Autism Clinic
      </span>

      {/* Chevrons */}
      <ChevronsUpDown
        style={{ width: 14, height: 14, flexShrink: 0, color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)' }}
      />
    </button>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export function AppSidebar({
  activeModule,
  onModuleChange,
  currentDate,
  onDateSelect,
  visibleRange,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const { colors, isDark } = useTheme();
  const isMobile = useIsMobile();
  const [miniDate, setMiniDate] = useState(new Date());

  // ── Body scroll lock when mobile sidebar is open ──────────────────────────
  useEffect(() => {
    if (!isMobile) return;
    if (mobileOpen) {
      document.body.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
    }
    return () => { document.body.classList.remove('mobile-sidebar-open'); };
  }, [isMobile, mobileOpen]);

  // Mini calendar helpers
  const getCalendarCells = (date: Date): { date: Date; inMonth: boolean }[] => {
    const year  = date.getFullYear();
    const month = date.getMonth();
    const firstDay    = new Date(year, month, 1).getDay();
    const lastDate    = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ date: new Date(year, month - 1, prevLastDate - i), inMonth: false });
    for (let i = 1; i <= lastDate; i++)
      cells.push({ date: new Date(year, month, i), inMonth: true });
    let next = 1;
    while (cells.length < 42)
      cells.push({ date: new Date(year, month + 1, next++), inMonth: false });
    return cells;
  };

  const prevMonth = () => { const d = new Date(miniDate); d.setMonth(d.getMonth() - 1); setMiniDate(d); };
  const nextMonth = () => { const d = new Date(miniDate); d.setMonth(d.getMonth() + 1); setMiniDate(d); };

  const isToday    = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === currentDate.toDateString();
  const isInRange  = (d: Date): boolean => {
    if (!visibleRange) return false;
    const t  = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const s  = new Date(visibleRange.start.getFullYear(), visibleRange.start.getMonth(), visibleRange.start.getDate()).getTime();
    const e  = new Date(visibleRange.end.getFullYear(), visibleRange.end.getMonth(), visibleRange.end.getDate()).getTime();
    return t >= s && t <= e;
  };

  const cells        = getCalendarCells(miniDate);
  const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthLabel   = miniDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Mobile drawer styles ────────────────────────────────────────────────────
  const mobileAsideStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: Math.min(SIDEBAR_WIDTH + 40, 280),
    zIndex: 60,
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-110%)',
    transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s',
    boxShadow: mobileOpen ? '4px 0 32px rgba(0,0,0,0.22)' : 'none',
  } : {
    width: SIDEBAR_WIDTH,
    flexShrink: 0 as const,
    transition: 'background-color 0.2s',
  };

  return (
    <>
      {/* ── Mobile backdrop ────────────────────────────────────────────────── */}
      {isMobile && (
        <div
          aria-hidden="true"
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 59,
            backgroundColor: 'rgba(0,0,0,0.48)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

    <aside
      className="flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.sideBg,
        borderRight: `1px solid ${colors.border}`,
        ...mobileAsideStyle,
      }}
    >
      {/* ── Mobile header: logo + close button ─────────────────────────────── */}
      {isMobile && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
          height: 48,
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span
            className="font-[Roboto_Mono]"
            style={{ fontSize: 14, fontWeight: 700, color: colors.t0, letterSpacing: '-0.3px', userSelect: 'none' }}
          >
            BCBix
          </span>
          <Button
            variant="ghost" size="icon"
            onClick={onMobileClose}
            className="h-8 w-8 rounded-lg"
            style={{ color: colors.t3 }}
            title="Close menu"
            aria-label="Close sidebar"
          >
            <X style={{ width: 16, height: 16 }} />
          </Button>
        </div>
      )}

      {/* ── Workspace switcher (fixed top, outside scroll) ── */}


      {/* Thin divider */}
      {!isMobile && <div style={{ height: 1, backgroundColor: colors.divider, margin: '0 12px' }} />}

      {/* ── Scrollable nav ── */}
      <ScrollArea className="flex-1">
        <div style={{ padding: '8px 8px 0', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

          {/* "Platform" section label */}
          

          {/* Primary nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

            {/* Calendar nav item — always first */}
            <NavButton
              item={PRIMARY_NAV[0]}
              active={activeModule === 'calendar'}
              onClick={() => onModuleChange('calendar')}
              colors={colors}
            />

            {/* Mini calendar — only shown when Calendar is active */}
            {activeModule === 'calendar' && (
              <div style={{ paddingBottom: 8, paddingTop: 4 }}>
                <div style={{ paddingLeft: 4, paddingRight: 4 }}>

                  {/* Month nav row */}
                  <div className="flex items-center justify-between px-1 mb-1">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-5 w-5 rounded" style={{ color: colors.t3 }}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span style={{ fontSize: 12, fontWeight: 500, color: colors.t2, userSelect: 'none', fontFamily: 'inherit' }}>
                      {monthLabel}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-5 w-5 rounded" style={{ color: colors.t3 }}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Weekday header */}
                  <div className="grid grid-cols-7 mb-0.5">
                    {weekDayLabels.map((d, i) => (
                      <div key={i} className="flex items-center justify-center" style={{ height: 20, fontSize: 11, color: colors.t3, fontWeight: 500, fontFamily: 'inherit' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div>
                    {Array.from({ length: 6 }, (_, rowIdx) => {
                      const row = cells.slice(rowIdx * 7, rowIdx * 7 + 7);
                      const inRangeCols = row.map((cell, colIdx) => ({ ...cell, colIdx })).filter(c => isInRange(c.date));
                      const hasStrip   = inRangeCols.length > 0;
                      const stripFirst = hasStrip ? inRangeCols[0].colIdx : 0;
                      const stripLast  = hasStrip ? inRangeCols[inRangeCols.length - 1].colIdx : 0;
                      return (
                        <div key={rowIdx} style={{ position: 'relative', display: 'flex', height: 28 }}>
                          {hasStrip && (
                            <div style={{
                              position: 'absolute',
                              left:  `${(stripFirst / 7) * 100}%`,
                              right: `${((6 - stripLast) / 7) * 100}%`,
                              top: 2, bottom: 2,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.055)',
                              borderRadius: 6, pointerEvents: 'none', zIndex: 0,
                            }} />
                          )}
                          {row.map(({ date: day, inMonth }, colIdx) => {
                            const today    = isToday(day);
                            const selected = isSelected(day);
                            return (
                              <button
                                key={colIdx}
                                onClick={() => onDateSelect(day)}
                                style={{
                                  flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', justifyContent: 'center',
                                  position: 'relative', zIndex: 1,
                                  background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0', outline: 'none',
                                }}
                              >
                                <div
                                  style={{
                                    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 6,
                                    backgroundColor: today ? colors.t0 : selected ? colors.navActive : 'transparent',
                                    fontSize: 12, fontFamily: 'inherit',
                                    color: today ? colors.sideBg : inMonth ? colors.t1 : colors.t3,
                                    fontWeight: today ? 600 : selected ? 500 : 400,
                                    transition: 'background-color 0.1s', userSelect: 'none', flexShrink: 0,
                                  }}
                                  onMouseEnter={e => { if (!today && !selected) (e.currentTarget as HTMLElement).style.backgroundColor = colors.navHover; }}
                                  onMouseLeave={e => { if (!today && !selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                >
                                  {day.getDate()}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Divider below mini calendar */}
                
              </div>
            )}

            {/* Rest of primary nav */}
            {PRIMARY_NAV.slice(1).map(item => (
              <NavButton
                key={item.id}
                item={item}
                active={activeModule === item.id}
                onClick={() => onModuleChange(item.id)}
                colors={colors}
              />
            ))}
          </div>

          {/* Spacer */}
          

          {/* Settings — bottom */}
          <div style={{ paddingBottom: 10 }}>
            {BOTTOM_NAV.map(item => (
              <NavButton
                key={item.id}
                item={item}
                active={activeModule === item.id}
                onClick={() => onModuleChange(item.id)}
                colors={colors}
              />
            ))}
          </div>

        </div>
      </ScrollArea>
    </aside>
    </>
  );
}

// ─── NavButton ─────────────────────────────────────────────────────────────────

interface NavButtonColors {
  navHover: string;
  navActive: string;
  t0: string;
  t1: string;
  t2: string;
  t3: string;
  sideBg: string;
  border: string;
  divider: string;
  [key: string]: string;
}

function NavButton({
  item, active, onClick, colors,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  colors: NavButtonColors;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => {
        onClick();
      }}
      title={item.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '0 10px',
        height: 34,
        borderRadius: 'var(--radius-button)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'var(--text-base)',
        fontWeight: active ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
        backgroundColor: active
          ? colors.navActive
          : hovered
            ? colors.navHover
            : 'transparent',
        color: active ? colors.t0 : hovered ? colors.t1 : colors.t2,
        transition: 'background-color 0.12s, color 0.12s',
        textAlign: 'left',
        flexShrink: 0,
        userSelect: 'none',
        outline: 'none',
      }}
    >
      <HugeiconsIcon
        icon={item.icon}
        size={15}
        color="currentColor"
        strokeWidth={active ? 2 : 1.5}
        style={{ flexShrink: 0, transition: 'stroke-width 0.12s' }}
      />
      <span style={{
        fontSize: 'var(--text-base)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        lineHeight: 1, fontFamily: 'inherit',
      }}>
        {item.label}
      </span>
    </button>
  );
}
