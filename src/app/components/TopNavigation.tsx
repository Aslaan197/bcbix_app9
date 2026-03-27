import { useState } from 'react';
import {
  Search, Bell, Settings, Sun, Moon, SunMoon,
  HelpCircle, ExternalLink, ChevronRight, LogOut, Link2,
} from 'lucide-react';
import { useTheme, AppTheme } from '../context/ThemeContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from './ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopNavigationProps {
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  sidebarCollapsed: boolean;
  onOpenSettings: () => void;
}

// ─── Appearance segmented control ────────────────────────────────────────────

const THEME_OPTS: { value: AppTheme; Icon: typeof Sun; title: string }[] = [
  { value: 'light',  Icon: Sun,     title: 'Light mode'  },
  { value: 'dark',   Icon: Moon,    title: 'Dark mode'   },
  { value: 'system', Icon: SunMoon, title: 'System mode' },
];

function AppearanceToggle() {
  const { theme, setTheme, colors: c } = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      backgroundColor: c.navHover,
      borderRadius: 8, padding: 2, gap: 1,
    }}>
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
            <opt.Icon style={{ width: 15, height: 15 }} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TopNavigation({
  sidebarCollapsed,
  onOpenSettings,
}: TopNavigationProps) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <header
      className="flex-shrink-0 flex items-center"
      style={{
        height: 44,
        backgroundColor: c.navBg,
        borderBottom: `1px solid ${c.border}`,
        zIndex: 40,
        paddingLeft: 12,
        paddingRight: 16,
        transition: 'background-color 0.2s',
      }}
    >
      {/* ── Left spacer ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Centered search bar ─────────────────────────────────────────── */}
      <div
        onClick={() => document.getElementById('topnav-search')?.focus()}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 32, borderRadius: 8, padding: '0 12px',
          width: 400, maxWidth: '100%',
          backgroundColor: focused ? c.navHover : c.inputBg,
          border: `1px solid ${focused ? c.inputFocus : c.inputBorder}`,
          transition: 'background-color 0.15s, border-color 0.15s',
          cursor: 'text', flexShrink: 0,
        }}
      >
        <Search style={{ width: 14, height: 14, color: focused ? c.t2 : c.t3, flexShrink: 0 }} />
        <Input
          id="topnav-search"
          type="text"
          placeholder="Search sessions, students, providers…"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px] placeholder:text-[13px]"
          style={{ color: c.t1 }}
        />
        {focused && (
          <kbd style={{
            fontSize: 10, color: c.t3, backgroundColor: c.navHover,
            border: `1px solid ${c.border}`, borderRadius: 4,
            padding: '1px 5px', flexShrink: 0, fontFamily: 'inherit',
            lineHeight: 1.6,
          }}>
            ⌘K
          </kbd>
        )}
      </div>

      {/* ── Right actions ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {/* ── Bell ──────────────────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          title="Notifications"
          className="h-7 w-7 rounded-lg"
          style={{ color: c.t3 }}
        >
          <Bell style={{ width: 16, height: 16 }} />
        </Button>

        {/* ── Avatar + Profile Dropdown ──────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center select-none cursor-pointer focus-visible:outline-none"
              style={{
                fontSize: 10, fontWeight: 600,
                backgroundColor: c.t0, color: c.navBg,
                transition: 'opacity 0.12s', flexShrink: 0,
                marginLeft: 4,
              }}
              title="Dr. Sarah Thompson"
            >
              ST
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[272px] rounded-[13px] p-0 overflow-hidden"
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 14px 36px -4px rgba(0,0,0,0.16)',
            }}
          >
            {/* Profile header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px 12px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                backgroundColor: c.t0, color: c.navBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0, letterSpacing: '0.02em',
              }}>
                ST
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: c.t0, lineHeight: 1.3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  Dr. Sarah Thompson
                </div>
                <div style={{
                  fontSize: 11, color: c.t3, marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  sarah.thompson@therapy.com
                </div>
              </div>
            </div>

            <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: '0' }} />

            {/* Appearance row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 16px',
            }}>
              <span style={{ fontSize: 13, color: c.t2 }}>Appearance</span>
              <AppearanceToggle />
            </div>

            <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: '0' }} />

            <div style={{ padding: '4px 0' }}>
              <DropdownMenuItem
                onSelect={() => onOpenSettings()}
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

            <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: '0' }} />

            <div style={{ padding: '4px 0' }}>
              <DropdownMenuItem
                onSelect={() => onOpenSettings()}
                className="flex items-center gap-[10px] px-4 py-[7px] text-sm cursor-pointer"
                style={{ color: c.t1 }}
              >
                <Link2 style={{ width: 16, height: 16, color: c.t3, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>AbleSpace Account</span>
                <ChevronRight style={{ width: 14, height: 14, color: c.t3 }} />
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: '0' }} />

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
  );
}