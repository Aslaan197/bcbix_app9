import React, { useState, useRef, useEffect } from 'react';
import {
  X, User, Shield, Sliders, Bell, Link2,
  Plus, Eye, EyeOff, Trash2, Smartphone, Monitor,
  Check, Camera, ChevronDown, Search,
} from 'lucide-react';
import { useTheme, AppTheme, AppColors } from '../context/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'account' | 'security' | 'preferences' | 'notifications' | 'ablespace';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ablespaceLinked: boolean;
  onUnlinkAblespace: () => void;
  onLinkAblespace: () => void;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children, c }: { children: string; c: AppColors }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: c.t2, marginBottom: 5 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, c }: { children: string; c: AppColors }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: c.t3,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 8, marginTop: 20,
    }}>
      {children}
    </div>
  );
}

function SettingRow({
  label, desc, children, c, last,
}: {
  label: string; desc?: string; children: React.ReactNode; c: AppColors; last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '10px 0',
      borderBottom: last ? 'none' : `1px solid ${c.divider}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: c.t0, lineHeight: 1.3 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: c.t3, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, c }: {
  value: string; onChange: (v: string) => void; placeholder?: string; c: AppColors;
}) {
  return (
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-[34px] rounded-[7px] text-sm focus-visible:ring-1"
      style={{
        border: `1px solid ${c.inputBorder}`, color: c.t0,
        backgroundColor: c.inputBg, fontFamily: 'inherit',
      }}
    />
  );
}

function PasswordInput({ placeholder, c }: { placeholder?: string; c: AppColors }) {
  const [show, setShow] = useState(false);
  const [val,  setVal]  = useState('');
  return (
    <div style={{ position: 'relative' }}>
      <Input
        type={show ? 'text' : 'password'}
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        className="h-[34px] rounded-[7px] text-sm focus-visible:ring-1 pr-9"
        style={{
          border: `1px solid ${c.inputBorder}`, color: c.t0,
          backgroundColor: c.inputBg, fontFamily: 'inherit',
        }}
      />
      <button
        onClick={() => setShow(v => !v)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', color: c.t3, padding: 2,
        }}
      >
        {show ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
      </button>
    </div>
  );
}

function StyledSelect({ value, onChange, options, c }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; c: AppColors;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className="h-[30px] rounded-[7px] text-xs min-w-[110px]"
        style={{ borderColor: c.inputBorder, color: c.t1, backgroundColor: c.inputBg }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PrimaryButton({ children, onClick, c }: {
  children: React.ReactNode; onClick?: () => void; c: AppColors;
}) {
  return (
    <Button
      onClick={onClick}
      className="h-8 px-[14px] rounded-[7px] text-sm font-medium"
      style={{ backgroundColor: c.btnPrimBg, color: c.btnPrimText, border: 'none' }}
    >
      {children}
    </Button>
  );
}

function GhostButton({ children, onClick, c, danger }: {
  children: React.ReactNode; onClick?: () => void; c: AppColors; danger?: boolean;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-8 px-[14px] rounded-[7px] text-sm font-medium"
      style={{
        border: danger ? 'transparent' : `1px solid ${c.btnSecBorder}`,
        backgroundColor: 'transparent',
        color: danger ? c.danger : c.btnSecText,
      }}
    >
      {children}
    </Button>
  );
}

// ─── Accent color swatches ────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { hex: '#111111', name: 'Black'  }, { hex: '#4F83CC', name: 'Blue'   },
  { hex: '#7C52D0', name: 'Purple' }, { hex: '#2E9E63', name: 'Green'  },
  { hex: '#E8872B', name: 'Orange' }, { hex: '#D966A8', name: 'Pink'   },
  { hex: '#E24545', name: 'Red'    }, { hex: '#17A2B8', name: 'Teal'   },
];

function ColorSwatch({ color, name, selected, onSelect, c }: {
  color: string; name: string; selected: boolean; onSelect: () => void; c: AppColors;
}) {
  return (
    <button
      onClick={onSelect} title={name}
      style={{
        width: 26, height: 26, borderRadius: '50%',
        backgroundColor: color, border: 'none', cursor: 'pointer',
        position: 'relative', flexShrink: 0, outline: 'none',
        boxShadow: selected ? `0 0 0 2px ${c.surface}, 0 0 0 4px ${color}` : 'none',
        transition: 'box-shadow 0.14s',
      }}
    >
      {selected && (
        <Check style={{ position: 'absolute', inset: 0, margin: 'auto', width: 11, height: 11, color: '#fff' }} />
      )}
    </button>
  );
}

// ─── Timezone searchable dropdown ─────────────────────────────────────────────

const TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern Time (US & Canada)',  offset: 'UTC−05:00' },
  { value: 'America/Chicago',     label: 'Central Time (US & Canada)',  offset: 'UTC−06:00' },
  { value: 'America/Denver',      label: 'Mountain Time (US & Canada)', offset: 'UTC−07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)',  offset: 'UTC−08:00' },
  { value: 'America/Anchorage',   label: 'Alaska',                      offset: 'UTC−09:00' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii',                      offset: 'UTC−10:00' },
  { value: 'America/Phoenix',     label: 'Arizona',                     offset: 'UTC−07:00' },
  { value: 'Europe/London',       label: 'London',                      offset: 'UTC+00:00' },
  { value: 'Europe/Paris',        label: 'Central European Time',       offset: 'UTC+01:00' },
  { value: 'Asia/Tokyo',          label: 'Tokyo',                       offset: 'UTC+09:00' },
  { value: 'Australia/Sydney',    label: 'Sydney',                      offset: 'UTC+11:00' },
];

function TimezoneSelector({ value, onChange, c }: {
  value: string; onChange: (v: string) => void; c: AppColors;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const current  = TIMEZONES.find(t => t.value === value) ?? TIMEZONES[0];
  const filtered = TIMEZONES.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase()) ||
    t.offset.includes(query) || t.value.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', height: 34, padding: '0 32px 0 11px',
          border: `1px solid ${open ? c.inputFocus : c.inputBorder}`,
          borderRadius: 7, fontSize: 13, color: c.t0,
          backgroundColor: c.inputBg, fontFamily: 'inherit',
          cursor: 'pointer', outline: 'none', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'border-color 0.15s', boxSizing: 'border-box',
        }}
      >
        <span style={{ color: c.t3, fontSize: 12, flexShrink: 0 }}>{current.offset}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current.label}
        </span>
        <ChevronDown style={{
          position: 'absolute', right: 10, top: '50%',
          transform: `translateY(-50%) rotate(${open ? '180deg' : '0'})`,
          width: 14, height: 14, color: c.t3, transition: 'transform 0.15s', pointerEvents: 'none',
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 50, backgroundColor: c.surface, border: `1px solid ${c.border}`,
          borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px 6px', borderBottom: `1px solid ${c.divider}`, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Search style={{ width: 13, height: 13, color: c.t3, flexShrink: 0 }} />
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search timezones…"
              className="flex-1 h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs placeholder:text-xs"
              style={{ color: c.t1 }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.map(tz => (
              <button
                key={tz.value}
                onClick={() => { onChange(tz.value); setOpen(false); setQuery(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', border: 'none', textAlign: 'left',
                  backgroundColor: tz.value === value ? c.navActive : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => { if (tz.value !== value) (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover; }}
                onMouseLeave={e => { if (tz.value !== value) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontSize: 11, color: c.t3, minWidth: 70, flexShrink: 0 }}>{tz.offset}</span>
                <span style={{ fontSize: 13, color: c.t0 }}>{tz.label}</span>
                {tz.value === value && <Check style={{ width: 12, height: 12, color: c.accent, marginLeft: 'auto' }} />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', fontSize: 12, color: c.t3, textAlign: 'center' }}>No timezones found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Account ─────────────────────────────────────────────────────────────

function AccountTab({ c }: { c: AppColors }) {
  const [name,  setName]  = useState('Dr. Sarah Thompson');
  const [email, setEmail] = useState('sarah.thompson@therapy.com');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 20, borderBottom: `1px solid ${c.divider}`, marginBottom: 20 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: c.t0, color: c.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>ST</div>
          <button style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', backgroundColor: c.surface, border: `1.5px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: c.t2 }}>
            <Camera style={{ width: 10, height: 10 }} />
          </button>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.t0, lineHeight: 1.3 }}>Dr. Sarah Thompson</div>
          <button style={{ fontSize: 12, color: c.t3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginTop: 3, transition: 'color 0.14s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = c.t1)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = c.t3)}
          >Change photo</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><FieldLabel c={c}>Full Name</FieldLabel><TextInput value={name} onChange={setName} c={c} /></div>
        <div><FieldLabel c={c}>Email Address</FieldLabel><TextInput value={email} onChange={setEmail} c={c} /></div>
        <div>
          <FieldLabel c={c}>Role</FieldLabel>
          <div style={{ display: 'flex', alignItems: 'center', height: 34, paddingLeft: 2 }}>
            <span style={{ fontSize: 12, color: c.badgeText, backgroundColor: c.badgeBg, padding: '3px 9px', borderRadius: 5 }}>
              Therapist / Supervisor
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <PrimaryButton c={c}>Save Changes</PrimaryButton>
        <GhostButton c={c}>Change Password</GhostButton>
      </div>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  { id: '1', device: 'Chrome on macOS',  location: 'New York, US', time: 'Just now',   current: true,  Icon: Monitor    },
  { id: '2', device: 'Safari on iPhone', location: 'New York, US', time: '2 days ago', current: false, Icon: Smartphone },
];

function SecurityTab({ c }: { c: AppColors }) {
  const [twoFA,    setTwoFA]    = useState(false);
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const revoke = (id: string) => setSessions(prev => prev.filter(s => s.id !== id));

  return (
    <div>
      <SectionLabel c={c}>Change Password</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><FieldLabel c={c}>Current Password</FieldLabel><PasswordInput placeholder="Current password" c={c} /></div>
        <div><FieldLabel c={c}>New Password</FieldLabel><PasswordInput placeholder="New password" c={c} /></div>
        <div><FieldLabel c={c}>Confirm Password</FieldLabel><PasswordInput placeholder="Confirm new password" c={c} /></div>
        <div style={{ paddingTop: 4 }}><PrimaryButton c={c}>Update Password</PrimaryButton></div>
      </div>

      <SectionLabel c={c}>Two-Factor Authentication</SectionLabel>
      <SettingRow label="Authenticator App" desc="Add an extra layer of account security" c={c} last>
        <Switch checked={twoFA} onCheckedChange={setTwoFA} />
      </SettingRow>

      <SectionLabel c={c}>Active Sessions</SectionLabel>
      {sessions.map((s, idx) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: idx < sessions.length - 1 ? `1px solid ${c.divider}` : 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: c.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <s.Icon style={{ width: 16, height: 16, color: c.t2 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: c.t0 }}>{s.device}</div>
            <div style={{ fontSize: 11, color: c.t3, marginTop: 1 }}>{s.location} · {s.time}</div>
          </div>
          {s.current ? (
            <span style={{ fontSize: 11, fontWeight: 500, color: '#2E9E63', backgroundColor: 'rgba(46,158,99,0.10)', padding: '3px 8px', borderRadius: 5 }}>Current</span>
          ) : (
            <GhostButton c={c} danger onClick={() => revoke(s.id)}>Revoke</GhostButton>
          )}
        </div>
      ))}
      <div style={{ marginTop: 14 }}>
        <GhostButton c={c} danger>Log out all other sessions</GhostButton>
      </div>
    </div>
  );
}

// ─── Tab: Preferences ────────────────────────────────────────────────────────

// Single-letter labels for circular day buttons: Sun Mon Tue Wed Thu Fri Sat
const WORK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WORK_DAYS_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WORK_DAYS_TITLE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const period = i < 12 ? 'AM' : 'PM';
  return { value: i.toString(), label: `${h}:00 ${period}` };
});

function PreferencesTab({ c }: { c: AppColors }) {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const [timezone,  setTimezone]  = useState('America/New_York');
  const [workDays,  setWorkDays]  = useState<string[]>(['monday','tuesday','wednesday','thursday','friday']);
  const [workStart, setWorkStart] = useState('9');
  const [workEnd,   setWorkEnd]   = useState('17');
  const [defView,   setDefView]   = useState('week');
  const [weekStart, setWeekStart] = useState('sunday');

  const toggleDay = (day: string) =>
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  return (
    <div>
      <SectionLabel c={c}>Appearance</SectionLabel>
      <SettingRow label="Theme" desc="Controls the visual appearance of the app" c={c} last>
        <StyledSelect
          value={theme} onChange={v => setTheme(v as AppTheme)}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
          c={c}
        />
      </SettingRow>

      <SectionLabel c={c}>Accent Color</SectionLabel>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', paddingBottom: 4 }}>
        {ACCENT_COLORS.map(ac => (
          <ColorSwatch key={ac.hex} color={ac.hex} name={ac.name} selected={accent === ac.hex} onSelect={() => setAccent(ac.hex)} c={c} />
        ))}
      </div>

      <SectionLabel c={c}>Work Schedule</SectionLabel>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel c={c}>Work Days</FieldLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {WORK_DAYS.map((label, i) => {
            const val = WORK_DAYS_FULL[i];
            const active = workDays.includes(val);
            return (
              <button key={val} onClick={() => toggleDay(val)} title={WORK_DAYS_TITLE[i]}
                style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  border: active ? `2px solid ${c.accent}` : `1.5px solid ${c.inputBorder}`,
                  backgroundColor: active ? c.accent : 'transparent',
                  color: active ? '#fff' : c.t2, fontSize: 11, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.14s',
                }}
              >{label}</button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}><FieldLabel c={c}>Start Time</FieldLabel><StyledSelect value={workStart} onChange={setWorkStart} options={HOUR_OPTIONS} c={c} /></div>
        <div style={{ flex: 1 }}><FieldLabel c={c}>End Time</FieldLabel><StyledSelect value={workEnd} onChange={setWorkEnd} options={HOUR_OPTIONS} c={c} /></div>
      </div>

      <SectionLabel c={c}>Timezone</SectionLabel>
      <TimezoneSelector value={timezone} onChange={setTimezone} c={c} />

      <SectionLabel c={c}>Calendar</SectionLabel>
      <SettingRow label="Default view" desc="View shown when the app opens" c={c}>
        <StyledSelect value={defView} onChange={setDefView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} c={c} />
      </SettingRow>
      <SettingRow label="Week starts on" c={c} last>
        <StyledSelect value={weekStart} onChange={setWeekStart} options={[{ value: 'sunday', label: 'Sunday' }, { value: 'monday', label: 'Monday' }]} c={c} />
      </SettingRow>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab({ c }: { c: AppColors }) {
  const [email,  setEmail]  = useState(true);
  const [remind, setRemind] = useState(true);
  const [auto,   setAuto]   = useState(false);
  const [sound,  setSound]  = useState(true);

  return (
    <div>
      <SectionLabel c={c}>Notifications</SectionLabel>
      <SettingRow label="Email notifications" desc="Receive session updates and summaries via email" c={c}>
        <Switch checked={email} onCheckedChange={setEmail} />
      </SettingRow>
      <SettingRow label="Session reminders" desc="Alert 15 minutes before each session starts" c={c}>
        <Switch checked={remind} onCheckedChange={setRemind} />
      </SettingRow>
      <SettingRow label="Auto-schedule alerts" desc="Notify when auto-schedule finishes generating sessions" c={c}>
        <Switch checked={auto} onCheckedChange={setAuto} />
      </SettingRow>
      <SettingRow label="Sound notifications" desc="Play a sound for alerts and reminders" c={c} last>
        <Switch checked={sound} onCheckedChange={setSound} />
      </SettingRow>
    </div>
  );
}

// ─── Tab: AbleSpace ───────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  { id: 'acc1', email: 'sarah.thompson@ablespace.io', active: true  },
  { id: 'acc2', email: 'therapy.clinic@ablespace.io', active: false },
];

function AbleSpaceTab({ c, ablespaceLinked, onLink }: {
  c: AppColors; ablespaceLinked: boolean; onLink: () => void;
}) {
  const [activeId,  setActiveId]  = useState('acc1');
  const [accounts,  setAccounts]  = useState(MOCK_ACCOUNTS);
  const remove = (id: string) => setAccounts(prev => prev.filter(a => a.id !== id));

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10,
        backgroundColor: ablespaceLinked ? 'rgba(46,158,99,0.08)' : c.inputBg, marginBottom: 20,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #5b7ef5, #7c52d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7L12 3z" fill="white" opacity="0.9"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.t0 }}>AbleSpace</div>
          <div style={{ fontSize: 11, color: ablespaceLinked ? '#2E9E63' : c.t3, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            {ablespaceLinked ? <><Check style={{ width: 10, height: 10 }} /> Connected · Syncing</> : 'Not connected'}
          </div>
        </div>
        {!ablespaceLinked && <PrimaryButton c={c} onClick={onLink}>Connect</PrimaryButton>}
      </div>

      {ablespaceLinked && (
        <>
          <SectionLabel c={c}>Connected Accounts</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {accounts.map(acc => {
              const isActive = acc.id === activeId;
              return (
                <div key={acc.id} onClick={() => setActiveId(acc.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, backgroundColor: isActive ? c.navActive : 'transparent', cursor: 'pointer', transition: 'background-color 0.12s' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, backgroundColor: c.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: c.t2 }}>
                    {acc.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, color: c.t0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.email}
                    </div>
                  </div>
                  {isActive && <span style={{ fontSize: 10, fontWeight: 500, color: '#2E9E63', backgroundColor: 'rgba(46,158,99,0.10)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>Active</span>}
                  <button onClick={e => { e.stopPropagation(); remove(acc.id); }} title="Remove account"
                    style={{ width: 24, height: 24, borderRadius: 5, border: 'none', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: c.t3, flexShrink: 0, transition: 'background-color 0.12s, color 0.12s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = c.dangerHover; el.style.color = c.danger; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = 'transparent'; el.style.color = c.t3; }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={onLink}
            style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '8px 10px', border: `1px dashed ${c.border}`, borderRadius: 8, backgroundColor: 'transparent', color: c.t3, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'border-color 0.14s, color 0.14s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.t2; el.style.color = c.t1; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.border; el.style.color = c.t3; }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add Account
          </button>
        </>
      )}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({ icon, label, active, onClick, c }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; c: AppColors;
}) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, border: 'none', backgroundColor: active ? c.navActive : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: active ? c.t0 : c.t2, marginBottom: 1, transition: 'background-color 0.12s, color 0.12s' }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover; (e.currentTarget as HTMLElement).style.color = c.t1; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = c.t2; } }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: active ? 500 : 400 }}>{label}</span>
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

const NAV_MAIN: { key: Tab; label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'account',       label: 'Account',      Icon: User    },
  { key: 'security',      label: 'Security',      Icon: Shield  },
  { key: 'preferences',   label: 'Preferences',   Icon: Sliders },
  { key: 'notifications', label: 'Notifications', Icon: Bell    },
];

const TAB_LABELS: Record<Tab, string> = {
  account: 'Account', security: 'Security',
  preferences: 'Preferences', notifications: 'Notifications',
  ablespace: 'AbleSpace Account',
};

export function SettingsModal({
  isOpen, onClose, ablespaceLinked, onUnlinkAblespace, onLinkAblespace,
}: SettingsModalProps) {
  const { colors: c, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="p-0 gap-0 border-0 rounded-[14px] overflow-hidden flex"
        style={{
          width: '100%', maxWidth: 800, height: 580,
          backgroundColor: c.surface,
          boxShadow: isDark
            ? '0 4px 6px -1px rgba(0,0,0,0.30), 0 24px 60px -8px rgba(0,0,0,0.60)'
            : '0 4px 6px -1px rgba(0,0,0,0.10), 0 24px 60px -8px rgba(0,0,0,0.30)',
          border: `1px solid ${c.border}`,
          transition: 'background-color 0.2s',
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account and preferences</DialogDescription>
        </DialogHeader>

        {/* ── LEFT SIDEBAR ────────────────────────────────────────── */}
        <div style={{
          width: 210, flexShrink: 0,
          backgroundColor: c.sideBg, borderRight: `1px solid ${c.border}`,
          display: 'flex', flexDirection: 'column',
          padding: '20px 10px 16px', transition: 'background-color 0.2s',
        }}>
          <div style={{ flex: 1 }}>
            {NAV_MAIN.map(tab => (
              <NavItem
                key={tab.key}
                icon={<tab.Icon style={{ width: 16, height: 16 }} />}
                label={tab.label}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                c={c}
              />
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '14px 10px 6px' }}>
              AbleSpace
            </div>
            <NavItem
              icon={<Link2 style={{ width: 16, height: 16 }} />}
              label="AbleSpace Account"
              active={activeTab === 'ablespace'}
              onClick={() => setActiveTab('ablespace')}
              c={c}
            />
          </div>
          <div style={{ padding: '0 10px' }}>
            <div style={{ fontSize: 10, color: c.t3 }}>Version 1.0.0</div>
          </div>
        </div>

        {/* ── RIGHT CONTENT ────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: c.surface, overflow: 'hidden', transition: 'background-color 0.2s' }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 26px 14px', flexShrink: 0, borderBottom: `1px solid ${c.divider}` }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: c.t0, letterSpacing: '-0.2px' }}>
              {TAB_LABELS[activeTab]}
            </span>
            <Button
              variant="ghost" size="icon" onClick={onClose}
              className="h-7 w-7 rounded-md"
              style={{ color: c.t3 }}
            >
              <X style={{ width: 15, height: 15 }} />
            </Button>
          </div>

          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div style={{ padding: '20px 26px 28px' }}>
              {activeTab === 'account'       && <AccountTab       c={c} />}
              {activeTab === 'security'      && <SecurityTab      c={c} />}
              {activeTab === 'preferences'   && <PreferencesTab   c={c} />}
              {activeTab === 'notifications' && <NotificationsTab c={c} />}
              {activeTab === 'ablespace'     && (
                <AbleSpaceTab c={c} ablespaceLinked={ablespaceLinked} onLink={onLinkAblespace} />
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}