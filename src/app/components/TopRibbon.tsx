import React, { useState, useEffect } from 'react';
import {
  Bell, Search, Settings, Sun, Moon, SunMoon,
  HelpCircle, ExternalLink, ChevronRight, LogOut, Link2,
  ChevronsRight, Calendar, User, Stethoscope,
  Clock, Sparkles, RefreshCw, CheckCheck, Menu,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTheme, AppTheme } from '../context/ThemeContext';
import type { AppColors } from '../context/ThemeContext';
import type { Session } from './SessionCard';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

const profilePhoto = 'https://images.unsplash.com/photo-1592393532405-fb1f165c4a1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGRvY3RvciUyMGhlYWRzaG90JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczNzMzNzEwfDA&ixlib=rb-4.1.0&q=80&w=400';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from './ui/command';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from './ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopRibbonProps {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  sessions: Session[];
  /** Mobile: open the sidebar drawer */
  onMenuOpen?: () => void;
}

type ResultKind = 'session' | 'student' | 'provider' | 'service';

interface SearchResult {
  kind: ResultKind;
  title: string;
  subtitle?: string;
  color?: string;
}

// ─── Search helpers ───────────────────────────────────────────────────────────

function buildResults(sessions: Session[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: SearchResult[] = [];
  const seenStudents  = new Set<string>();
  const seenProviders = new Set<string>();
  const seenServices  = new Set<string>();

  for (const s of sessions) {
    if (s.sessionName.toLowerCase().includes(q)) {
      results.push({ kind: 'session', title: s.sessionName, subtitle: s.serviceType, color: s.color });
    }
    s.students.forEach(st => {
      if (st.toLowerCase().includes(q) && !seenStudents.has(st)) {
        seenStudents.add(st);
        results.push({ kind: 'student', title: st });
      }
    });
    s.providers.forEach(pr => {
      if (pr.toLowerCase().includes(q) && !seenProviders.has(pr)) {
        seenProviders.add(pr);
        results.push({ kind: 'provider', title: pr });
      }
    });
    if (s.serviceType.toLowerCase().includes(q) && !seenServices.has(s.serviceType)) {
      seenServices.add(s.serviceType);
      results.push({ kind: 'service', title: s.serviceType, color: s.color });
    }
  }
  return results.slice(0, 18);
}

const KIND_LABEL: Record<ResultKind, string> = {
  session: 'Sessions', student: 'Students', provider: 'Providers', service: 'Services',
};

type LucideIcon = typeof Calendar;

const KIND_ICON: Record<ResultKind, LucideIcon> = {
  session:  Calendar,
  student:  User,
  provider: Stethoscope,
  service:  Settings,
};

// ─── Rhombus logo icon ────────────────────────────────────────────────────────

function RhombusLogo({ c }: { c: AppColors }) {
  return (
    null
  );
}

// ─── Global Command Palette ───────────────────────────────────────────────────

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessions: Session[];
  c: AppColors;
}

function GlobalCommandPalette({ open, onOpenChange, sessions, c }: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = buildResults(sessions, query);
  const groups  = (['session', 'student', 'provider', 'service'] as ResultKind[])
    .map(k => ({ kind: k, items: results.filter(r => r.kind === k) }))
    .filter(g => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 gap-0"
        style={{
          maxWidth: 560, width: '100%',
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          padding: 0,
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription>Search sessions, students, providers, and services</DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={false}
          style={{ backgroundColor: 'transparent' }}
          className="[&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:px-4 [&_[data-slot=command-input-wrapper]]:gap-3"
        >
          <CommandInput
            placeholder="Search sessions, students, providers, services…"
            value={query}
            onValueChange={setQuery}
          />

          <CommandList style={{ maxHeight: 380, overflowY: 'auto' }}>
            {query.length === 0 && (
              <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 6px 8px' }}>
                  Search categories
                </div>
                {(['session', 'student', 'provider', 'service'] as ResultKind[]).map(k => {
                  const Icon = KIND_ICON[k];
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.navHover, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: 14, height: 14, color: c.t3 }} />
                      </div>
                      <span style={{ fontSize: 13, color: c.t2 }}>{KIND_LABEL[k]}</span>
                    </div>
                  );
                })}
                <div style={{ padding: '10px 8px 4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: c.t3 }}>Press</span>
                  <kbd style={{ fontSize: 10, color: c.t3, backgroundColor: c.navHover, border: `1px solid ${c.border}`, borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit', lineHeight: 1.6 }}>ESC</kbd>
                  <span style={{ fontSize: 11, color: c.t3 }}>to dismiss</span>
                </div>
              </div>
            )}

            {query.length > 0 && results.length === 0 && (
              <CommandEmpty>
                <div style={{ padding: '24px 0', textAlign: 'center', color: c.t3, fontSize: 13 }}>
                  No results for &ldquo;<span style={{ color: c.t1 }}>{query}</span>&rdquo;
                </div>
              </CommandEmpty>
            )}

            {groups.map((group) => {
              const Icon = KIND_ICON[group.kind];
              return (
                <CommandGroup key={group.kind} heading={KIND_LABEL[group.kind]}>
                  {group.items.map((item, ii) => (
                    <CommandItem
                      key={ii}
                      onSelect={() => { onOpenChange(false); setQuery(''); }}
                      style={{ borderRadius: 8, cursor: 'pointer' }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: item.color ? `${item.color}20` : c.navHover }}>
                        <Icon style={{ width: 13, height: 13, color: item.color ?? c.t3 }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, color: c.t0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div style={{ fontSize: 11, color: c.t3, marginTop: 1 }}>{item.subtitle}</div>
                        )}
                      </div>
                      {item.color && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            {groups.length > 0 && <div style={{ height: 6 }} />}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ─── Appearance toggle ────────────────────────────────────────────────────────

const THEME_OPTS: Array<{ value: AppTheme; Icon: LucideIcon; title: string }> = [
  { value: 'light',  Icon: Sun,     title: 'Light mode'  },
  { value: 'dark',   Icon: Moon,    title: 'Dark mode'   },
  { value: 'system', Icon: SunMoon, title: 'System mode' },
];

function AppearanceToggle() {
  const { theme, setTheme, colors: c } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: c.navHover, borderRadius: 8, padding: 2, gap: 1 }}>
      {THEME_OPTS.map(opt => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            title={opt.title}
            style={{
              width: 28, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: 'none', cursor: 'pointer',
              backgroundColor: active ? c.surface : 'transparent',
              color: active ? c.t0 : c.t3,
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              transition: 'background-color 0.14s, color 0.14s, box-shadow 0.14s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.t1; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.t3; }}
          >
            <opt.Icon
              style={{ width: 15, height: 15 }}
              fill={active ? 'currentColor' : 'none'}
              strokeWidth={active ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Notification types ───────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  kind: 'session' | 'schedule' | 'sync' | 'system';
  message: string;
  detail?: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', kind: 'session',  message: "Emma's ABA session starts in 15 min", detail: 'ABA Therapy · 9:00 AM – 10:30 AM', time: 'Just now', read: false },
  { id: 'n2', kind: 'schedule', message: '12 sessions auto-generated', detail: 'Scheduled for the next 2 weeks', time: '1h ago', read: false },
  { id: 'n3', kind: 'session',  message: "Liam's Speech Therapy was updated", detail: 'Time moved to 11:00 AM', time: '3h ago', read: true },
  { id: 'n4', kind: 'sync',     message: 'AbleSpace sync completed', detail: '8 students · 4 providers imported', time: 'Yesterday', read: true },
  { id: 'n5', kind: 'system',   message: 'Weekly schedule ready for review', detail: 'March 17 – March 21, 2025', time: '2 days ago', read: true },
];

type NotifKind = AppNotification['kind'];

const NOTIF_ICON: Record<NotifKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  session:  Clock,
  schedule: Sparkles,
  sync:     RefreshCw,
  system:   Bell,
};

const NOTIF_COLOR: Record<NotifKind, string> = {
  session:  '#4F83CC',
  schedule: '#7C52D0',
  sync:     '#2E9E63',
  system:   '#E07B39',
};

// ─── Notification Dropdown ────────────────────────────────────────────────────

interface NotificationDropdownProps {
  c: AppColors;
  isDark: boolean;
}

function NotificationDropdown({ c, isDark }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Button
            variant="ghost" size="icon" title="Notifications"
            className="h-8 w-8 rounded-lg"
            style={{ color: open ? c.t0 : c.t3 }}
          >
            <Bell style={{ width: 17, height: 17 }} />
          </Button>
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: 4, right: 4,
              width: 14, height: 14, borderRadius: '50%',
              backgroundColor: '#EA4335',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 700, color: '#fff',
              pointerEvents: 'none', border: `1.5px solid ${c.navBg}`, lineHeight: 1,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end" sideOffset={10}
        className="p-0 overflow-hidden"
        style={{
          width: 320,
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 13,
          boxShadow: isDark
            ? '0 4px 6px -1px rgba(0,0,0,0.30), 0 14px 36px -4px rgba(0,0,0,0.50)'
            : '0 4px 6px -1px rgba(0,0,0,0.08), 0 14px 36px -4px rgba(0,0,0,0.16)',
        }}
      >
        {/* Panel header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: `1px solid ${c.divider}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.t0 }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#EA4335', backgroundColor: 'rgba(234,67,53,0.10)', padding: '1px 6px', borderRadius: 10 }}>
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={e => { e.stopPropagation(); markAllRead(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: c.t3, padding: '2px 4px', borderRadius: 5, fontFamily: 'inherit', transition: 'color 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = c.t1}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = c.t3}
            >
              <CheckCheck style={{ width: 12, height: 12 }} />
              <span style={{ fontSize: 11 }}>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: c.t3, fontSize: 13 }}>No notifications</div>
          ) : (
            notifications.map((notif, idx) => {
              const Icon = NOTIF_ICON[notif.kind];
              const iconColor = NOTIF_COLOR[notif.kind];
              return (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 16px',
                    borderBottom: idx < notifications.length - 1 ? `1px solid ${c.divider}` : 'none',
                    backgroundColor: !notif.read ? (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)') : 'transparent',
                    cursor: 'pointer', transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = !notif.read ? (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)') : 'transparent'}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, backgroundColor: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Icon style={{ width: 13, height: 13, color: iconColor }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: notif.read ? 400 : 500, color: notif.read ? c.t1 : c.t0, lineHeight: 1.4, marginBottom: 2 }}>
                      {notif.message}
                    </div>
                    {notif.detail && (
                      <div style={{ fontSize: 11, color: c.t3, lineHeight: 1.3, marginBottom: 3 }}>{notif.detail}</div>
                    )}
                    <div style={{ fontSize: 10, color: c.t3 }}>{notif.time}</div>
                  </div>
                  {!notif.read && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4F83CC', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${c.divider}`, display: 'flex', justifyContent: 'center' }}>
          <button
            style={{ fontSize: 12, color: c.t3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 8px', borderRadius: 5, transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = c.t1}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = c.t3}
          >
            View all notifications
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TopRibbon({
  sidebarCollapsed,
  onToggleCollapse,
  onOpenSettings,
  sessions,
  onMenuOpen,
}: TopRibbonProps) {
  const { colors: c, isDark } = useTheme();
  const isMobile = useIsMobile();
  const [commandOpen, setCommandOpen] = useState(false);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center"
        style={{
          height: 48,
          backgroundColor: c.sideBg,
          borderBottom: `1px solid ${c.border}`,
          zIndex: 50,
          paddingLeft: 14,
          paddingRight: 14,
          transition: 'background-color 0.2s',
        }}
      >
        {/* ── Left: Hamburger (mobile) + Logo + app name ────────────────── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Hamburger — mobile only */}
          {isMobile && (
            <Button
              variant="ghost" size="icon"
              onClick={onMenuOpen}
              className="h-8 w-8 rounded-lg"
              style={{ color: c.t2, marginRight: 2 }}
              title="Open menu"
              aria-label="Open navigation menu"
            >
              <Menu style={{ width: 18, height: 18 }} />
            </Button>
          )}

          {/* Desktop collapse toggle */}
          {!isMobile && sidebarCollapsed && (
            <Button
              variant="ghost" size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7 rounded-md flex-shrink-0"
              style={{ color: c.t3 }}
              title="Expand sidebar"
            >
              <ChevronsRight style={{ width: 15, height: 15 }} />
            </Button>
          )}

          <RhombusLogo c={c} />

          <span className="font-[Roboto_Mono]" style={{ fontSize: 14, fontWeight: 700, color: c.t0, letterSpacing: '-0.3px', whiteSpace: 'nowrap', userSelect: 'none' }}>
            BCBix
          </span>
        </div>

        {/* ── Center: Command palette trigger ───────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: isMobile ? '0 8px' : '0 20px' }}>
          {/* Desktop: full search bar */}
          {!isMobile && (
            <button
              onClick={() => setCommandOpen(true)}
              style={{
                width: 256, height: 32,
                display: 'flex', alignItems: 'center', gap: 8,
                paddingLeft: 10, paddingRight: 10,
                backgroundColor: c.sideBg,
                border: `1px solid ${c.inputBorder}`,
                borderRadius: 8,
                cursor: 'pointer', outline: 'none',
                transition: 'border-color 0.15s, background-color 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = c.inputFocus;
                (e.currentTarget as HTMLElement).style.backgroundColor = c.surface;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = c.inputBorder;
                (e.currentTarget as HTMLElement).style.backgroundColor = c.sideBg;
              }}
            >
              <Search style={{ width: 13, height: 13, color: c.t3, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: c.t3, textAlign: 'left', userSelect: 'none' }}>
                Search
              </span>
              <kbd style={{ fontSize: 10, color: c.t3, backgroundColor: c.navHover, border: `1px solid ${c.border}`, borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit', lineHeight: 1.6, flexShrink: 0 }}>
                ⌘K
              </kbd>
            </button>
          )}

          {/* Mobile: icon-only search button */}
          {isMobile && (
            <Button
              variant="ghost" size="icon"
              onClick={() => setCommandOpen(true)}
              className="h-8 w-8 rounded-lg"
              style={{ color: c.t3 }}
              title="Search (⌘K)"
              aria-label="Open search"
            >
              <Search style={{ width: 17, height: 17 }} />
            </Button>
          )}
        </div>

        {/* ── Right: Bell · Profile Avatar ──────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>

          {/* Notification bell */}
          <NotificationDropdown c={c} isDark={isDark} />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, outline: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
                title="Dr. Sarah Thompson"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profilePhoto} alt="Dr. Sarah Thompson" style={{ objectFit: 'cover' }} />
                  <AvatarFallback style={{ fontSize: 10, fontWeight: 600, backgroundColor: c.t0, color: c.navBg }}>
                    ST
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end" sideOffset={10}
              className="w-[272px] rounded-[13px] p-0 overflow-hidden"
              style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 14px 36px -4px rgba(0,0,0,0.16)' }}
            >
              {/* Profile header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px 12px' }}>
                <Avatar className="h-[38px] w-[38px] flex-shrink-0">
                  <AvatarImage src={profilePhoto} alt="Dr. Sarah Thompson" style={{ objectFit: 'cover' }} />
                  <AvatarFallback style={{ fontSize: 13, fontWeight: 600, backgroundColor: c.t0, color: c.navBg }}>
                    ST
                  </AvatarFallback>
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.t0, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Dr. Sarah Thompson
                  </div>
                  <div style={{ fontSize: 11, color: c.t3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    sarah.thompson@therapy.com
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: 0 }} />

              {/* Appearance row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px' }}>
                <span style={{ fontSize: 13, color: c.t2 }}>Appearance</span>
                <AppearanceToggle />
              </div>

              <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: 0 }} />

              <div style={{ padding: '4px 0' }}>
                <DropdownMenuItem
                  onSelect={onOpenSettings}
                  className="flex items-center gap-[10px] px-4 py-[7px] text-sm cursor-pointer"
                  style={{ color: c.t1 }}
                >
                  <Settings style={{ width: 16, height: 16, color: c.t3, flexShrink: 0 }} />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => window.open('https://support.therapy.com', '_blank', 'noopener')}
                  className="flex items-center gap-[10px] px-4 py-[7px] text-sm cursor-pointer"
                  style={{ color: c.t1 }}
                >
                  <HelpCircle style={{ width: 16, height: 16, color: c.t3, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>Support</span>
                  <ExternalLink style={{ width: 13, height: 13, color: c.t3 }} />
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: 0 }} />

              <div style={{ padding: '4px 0' }}>
                <DropdownMenuItem
                  onSelect={onOpenSettings}
                  className="flex items-center gap-[10px] px-4 py-[7px] text-sm cursor-pointer"
                  style={{ color: c.t1 }}
                >
                  <Link2 style={{ width: 16, height: 16, color: c.t3, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>AbleSpace Account</span>
                  <ChevronRight style={{ width: 14, height: 14, color: c.t3 }} />
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: 0 }} />

              <div style={{ padding: '4px 0 6px' }}>
                <DropdownMenuItem
                  className="flex items-center gap-[10px] px-4 py-[7px] text-sm cursor-pointer"
                  style={{ color: c.danger }}
                >
                  <LogOut style={{ width: 16, height: 16, color: c.danger, flexShrink: 0 }} />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Global Command Palette ───────────────────────────────────────── */}
      <GlobalCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        sessions={sessions}
        c={c}
      />
    </>
  );
}