import React, { useState, useEffect, useRef } from 'react';
import {
  X, Check, ChevronDown, Plus, Trash2, Settings2,
  Calendar, Clock, RepeatIcon, Users, BookOpen,
  ClipboardList, Target, Stethoscope, UserCheck,
  Link, AlertCircle, ChevronRight, ChevronUp,
} from 'lucide-react';
import { Session } from './SessionCard';
import { useTheme, AppColors } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import { useLearnerPrograms } from '../context/LearnerProgramsContext';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { Sheet, SheetPortal, SheetOverlay, SheetTitle, SheetDescription } from './ui/sheet';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ManageParticipantsModal } from './ManageParticipantsModal';

// ─── Static data ──────────────────────────────────────────────────────────────

const SERVICE_CODES = [
  { code: '97151', label: 'Behavior Identification Assessment' },
  { code: '97153', label: 'Adaptive Behavior Treatment (Direct)' },
  { code: '97155', label: 'Adaptive Behavior w/ Protocol Modification' },
  { code: '97156', label: 'Family Adaptive Behavior Treatment Guidance' },
  { code: '97158', label: 'Group Adaptive Behavior Treatment' },
  { code: 'H0031', label: 'Mental Health Assessment' },
  { code: 'H2019', label: 'Therapeutic Behavioral Services' },
  { code: 'T1017', label: 'Targeted Case Management' },
];

const REPEAT_OPTIONS = [
  'Doesn\'t repeat', 'Daily', 'Weekly', 'Bi-weekly', 'Monthly',
];

const NOTE_TEMPLATES = [
  'SOAP Note', 'DAP Note', 'ABC Data', 'Narrative Note', 'Behavior Intervention Plan',
];

const COLOR_SWATCHES = [
  { value: '#4F83CC', label: 'Blue' },
  { value: '#2E9E63', label: 'Green' },
  { value: '#7C52D0', label: 'Purple' },
  { value: '#E05252', label: 'Red' },
  { value: '#E07B39', label: 'Orange' },
  { value: '#D64F8A', label: 'Pink' },
  { value: '#2E9EA0', label: 'Teal' },
  { value: '#C4922A', label: 'Amber' },
];

const LEARNER_PROGRAMS: Record<string, { program: string; targets: string[] }[]> = {
  'Emma Wilson': [
    { program: 'Communication', targets: ['Requesting items', 'Greeting peers', 'Using 2-word phrases', 'Following directions'] },
    { program: 'Social Skills', targets: ['Turn taking', 'Eye contact', 'Sharing with peers'] },
  ],
  'Liam Johnson': [
    { program: 'Articulation', targets: ['Initial /s/ sounds', 'Final /r/ sounds', 'Consonant blends'] },
    { program: 'Language', targets: ['Category naming', 'Answering WH questions'] },
  ],
  'Olivia Brown': [
    { program: 'Fine Motor', targets: ['Pencil grasp', 'Cutting skills', 'Handwriting'] },
    { program: 'Sensory Processing', targets: ['Tactile tolerance', 'Vestibular activities'] },
  ],
  'Noah Davis': [
    { program: 'Self-Regulation', targets: ['Identifying emotions', 'Calm-down strategies', 'Coping skills'] },
    { program: 'Communication', targets: ['Requesting help', 'Using visual supports'] },
  ],
  'Ava Martinez': [
    { program: 'Language', targets: ['Expanding utterances', 'Narrative skills', 'Answering questions'] },
  ],
  'Ethan Garcia': [
    { program: 'Daily Living Skills', targets: ['Morning routine', 'Hygiene independence', 'Meal prep basics'] },
  ],
  'Sophia Rodriguez': [
    { program: 'Behavior Reduction', targets: ['Tantrum duration', 'Self-injury frequency', 'Aggression toward peers'] },
  ],
  'Mason Anderson': [
    { program: 'Academics', targets: ['Number identification', 'Letter-sound correspondence', 'Reading comprehension'] },
  ],
};

function getDefaultPrograms(learner: string) {
  return LEARNER_PROGRAMS[learner] ?? [
    { program: 'General Goals', targets: ['Participation', 'Compliance', 'Skill generalization'] },
  ];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TabType = 'session' | 'supervision' | 'event' | 'unavailability';

interface ServiceBlock {
  id: string;
  code: string;
  isCreating: boolean;
  createCode: string;
  createDescription: string;
  modifiers: [string, string, string, string];
}

interface StaffEntry { name: string; canCollectData: boolean; }

interface SessionForm {
  title: string; date: string; startTime: string; endTime: string;
  repeat: string; color: string;
  staff: StaffEntry[]; services: ServiceBlock[]; learners: string[];
  noteTemplate: string;
  /** programId → checked; undefined key = checked by default */
  selectedProgramIds: Record<string, boolean>;
}

interface SupervisionForm {
  title: string; date: string; startTime: string; endTime: string;
  repeat: string; supervisor: string;
  services: ServiceBlock[]; staff: string[]; learner: string;
  linkedSession: string; noteTemplate: string;
}

interface EventForm {
  title: string; date: string; startTime: string; endTime: string;
  repeat: string; staff: string[];
}

interface UnavailabilityForm {
  reason: string; date: string; startTime: string; endTime: string;
  repeat: string; staff: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addHour(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${String(Math.min(h + 1, 22)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function makeServiceBlock(): ServiceBlock {
  return { id: `svc-${Date.now()}-${Math.random()}`, code: '', isCreating: false, createCode: '', createDescription: '', modifiers: ['', '', '', ''] };
}

function defaultSessionForm(date?: Date, time?: string): SessionForm {
  const d = date ?? new Date();
  const st = time ?? '09:00';
  return { title: '', date: toDateLocal(d), startTime: st, endTime: addHour(st), repeat: "Doesn't repeat", color: '#4F83CC', staff: [], services: [makeServiceBlock()], learners: [], noteTemplate: '', selectedProgramIds: {} };
}
function defaultSupervisionForm(date?: Date, time?: string): SupervisionForm {
  const d = date ?? new Date(); const st = time ?? '09:00';
  return { title: '', date: toDateLocal(d), startTime: st, endTime: addHour(st), repeat: "Doesn't repeat", supervisor: '', services: [makeServiceBlock()], staff: [], learner: '', linkedSession: '', noteTemplate: '' };
}
function defaultEventForm(date?: Date, time?: string): EventForm {
  const d = date ?? new Date(); const st = time ?? '09:00';
  return { title: '', date: toDateLocal(d), startTime: st, endTime: addHour(st), repeat: "Doesn't repeat", staff: [] };
}
function defaultUnavailabilityForm(date?: Date, time?: string): UnavailabilityForm {
  const d = date ?? new Date(); const st = time ?? '09:00';
  return { reason: '', date: toDateLocal(d), startTime: st, endTime: addHour(st), repeat: "Doesn't repeat", staff: [] };
}

const TAB_COLORS: Record<TabType, string> = {
  session: '#4F83CC', supervision: '#7C52D0', event: '#2E9E63', unavailability: '#E05252',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, required, c }: { children: React.ReactNode; required?: boolean; c: AppColors }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: c.t2, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
      {children}
      {required && <span style={{ color: '#E05252', fontSize: 10 }}>*</span>}
    </div>
  );
}

function SectionBlock({ icon, title, children, c }: { icon?: React.ReactNode; title: string; children: React.ReactNode; c: AppColors }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        {icon && <div style={{ color: c.t3, display: 'flex' }}>{icon}</div>}
        <span style={{ fontSize: 11, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
        <div style={{ flex: 1, height: 1, backgroundColor: c.divider, marginLeft: 4 }} />
      </div>
      {children}
    </div>
  );
}

function AvatarBadge({ initials, color, square, size = 22 }: { initials: string; color: string; square?: boolean; size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: square ? Math.max(4, size * 0.18) : '50%',
      backgroundColor: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Simple Select Dropdown ───────────────────────────────────────────────────

function SimpleSelect({
  value, onChange, options, placeholder, c, isDark,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  placeholder?: string; c: AppColors; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const opts = (options as unknown[]).map(o => typeof o === 'string' ? { value: o, label: o } : o as { value: string; label: string });
  const selected = opts.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button
        variant="ghost"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', height: 34, display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 6,
          border: `1px solid ${open ? c.inputFocus : c.inputBorder}`,
          borderRadius: 8, backgroundColor: c.inputBg, cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ flex: 1, fontSize: 13, color: value ? c.t0 : c.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder ?? 'Select…'}
        </span>
        <ChevronDown style={{ width: 13, height: 13, color: c.t3, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </Button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 400,
          backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 8,
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.14)',
          overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
        }}>
          {opts.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: c.t0,
                backgroundColor: value === o.value ? c.navActive : 'transparent',
                transition: 'background-color 0.08s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = value === o.value ? c.navActive : c.navHover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = value === o.value ? c.navActive : 'transparent'}
            >
              <span style={{ flex: 1 }}>{o.label}</span>
              {value === o.value && <Check style={{ width: 12, height: 12, color: c.accent }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Multi-Select with Avatars ────────────────────────────────────────────────

interface ParticipantOption { name: string; initials: string; avatarColor: string; }

function ParticipantMultiSelect({
  label, options, selected, onChange, placeholder, isSquare, c, isDark, onManage, single,
}: {
  label: string; options: ParticipantOption[];
  selected: string[]; onChange: (v: string[]) => void;
  placeholder?: string; isSquare?: boolean; c: AppColors; isDark: boolean;
  onManage?: () => void; single?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (v: string) => {
    if (single) { onChange(selected[0] === v ? [] : [v]); setOpen(false); return; }
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };
  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const getOpt = (n: string) => options.find(o => o.name === n);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button
        variant="ghost"
        onClick={() => { setOpen(v => !v); setSearch(''); }}
        style={{
          width: '100%', minHeight: 34,
          padding: selected.length > 0 ? '4px 8px' : '0 10px',
          border: `1px solid ${open ? c.inputFocus : c.inputBorder}`,
          borderRadius: 8, backgroundColor: c.inputBg,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 5, boxSizing: 'border-box', textAlign: 'left',
          transition: 'border-color 0.15s', fontFamily: 'inherit',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minWidth: 0 }}>
          {selected.length === 0 ? (
            <span style={{ fontSize: 13, color: c.t3 }}>{placeholder ?? `Select ${label}`}</span>
          ) : selected.map(v => {
            const opt = getOpt(v);
            return (
              <span key={v} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                backgroundColor: c.navActive, borderRadius: 5,
                padding: '2px 6px 2px 4px', fontSize: 12, color: c.t0, whiteSpace: 'nowrap',
              }}>
                {opt && <AvatarBadge initials={opt.initials} color={opt.avatarColor} square={isSquare} size={18} />}
                <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.split(' ')[0]}</span>
                <span onClick={e => { e.stopPropagation(); toggle(v); }} style={{ cursor: 'pointer', color: c.t3, lineHeight: 1 }}>×</span>
              </span>
            );
          })}
        </div>
        <ChevronDown style={{ width: 13, height: 13, color: c.t3, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </Button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 400,
          backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 8,
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.14)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: `1px solid ${c.divider}` }}>
            <Input
              autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${label}…`}
              style={{
                width: '100%', height: 26, border: 'none', outline: 'none',
                backgroundColor: 'transparent', color: c.t0, fontSize: 12,
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 190, overflowY: 'auto' }}>
            {filtered.map(opt => {
              const isSel = selected.includes(opt.name);
              return (
                <div key={opt.name} onClick={() => toggle(opt.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', cursor: 'pointer', backgroundColor: isSel ? c.navActive : 'transparent', transition: 'background-color 0.08s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : c.navHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : 'transparent'}
                >
                  <AvatarBadge initials={opt.initials} color={opt.avatarColor} square={isSquare} size={22} />
                  <span style={{ flex: 1, fontSize: 13, color: c.t0 }}>{opt.name}</span>
                  {isSel && <Check style={{ width: 12, height: 12, color: c.accent, flexShrink: 0 }} />}
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: c.t3 }}>No results</div>}
          </div>
          {onManage && (
            <>
              <div style={{ height: 1, backgroundColor: c.divider }} />
              <Button variant="ghost" onClick={() => { setOpen(false); onManage(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Settings2 style={{ width: 12, height: 12, color: c.t3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: c.t3 }}>Manage {label}…</span>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Service Code Block ───────────────────────────────────────────────────────

function ServiceCodeBlock({
  block, index, onChange, onRemove, canRemove, c, isDark,
}: {
  block: ServiceBlock; index: number;
  onChange: (b: ServiceBlock) => void;
  onRemove: () => void; canRemove: boolean;
  c: AppColors; isDark: boolean;
}) {
  const [codeOpen, setCodeOpen] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (codeRef.current && !codeRef.current.contains(e.target as Node)) setCodeOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const update = (patch: Partial<ServiceBlock>) => onChange({ ...block, ...patch });
  const selectedSvc = SERVICE_CODES.find(s => s.code === block.code);
  const modifierPlaceholders = ['M1', 'M2', 'M3', 'M4'];

  return (
    <div style={{
      border: `1px solid ${c.border}`, borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
      padding: '12px 12px 10px', marginBottom: 8,
    }}>
      {/* Row: Service Code + Remove */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: c.t3, minWidth: 20 }}>#{index + 1}</span>
        {/* Code dropdown */}
        <div ref={codeRef} style={{ flex: 1, position: 'relative' }}>
          <Button
            variant="ghost"
            onClick={() => setCodeOpen(v => !v)}
            style={{
              width: '100%', height: 32, display: 'flex', alignItems: 'center', padding: '0 9px', gap: 5,
              border: `1px solid ${codeOpen ? c.inputFocus : c.inputBorder}`,
              borderRadius: 7, backgroundColor: c.inputBg, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left', boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
          >
            <span style={{ flex: 1, fontSize: 13, color: block.code ? c.t0 : c.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedSvc ? `${selectedSvc.code} – ${selectedSvc.label}` : block.isCreating ? 'Custom service' : 'Select service code…'}
            </span>
            <ChevronDown style={{ width: 12, height: 12, color: c.t3, flexShrink: 0, transform: codeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </Button>
          {codeOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 500,
              backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 8,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.14)',
              overflow: 'hidden',
            }}>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {SERVICE_CODES.map(svc => (
                  <div
                    key={svc.code}
                    onClick={() => { update({ code: svc.code, isCreating: false }); setCodeOpen(false); }}
                    style={{
                      padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                      backgroundColor: block.code === svc.code ? c.navActive : 'transparent',
                      transition: 'background-color 0.08s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = block.code === svc.code ? c.navActive : c.navHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = block.code === svc.code ? c.navActive : 'transparent'}
                  >
                    <span style={{ fontWeight: 600, color: c.t0 }}>{svc.code}</span>
                    <span style={{ color: c.t2, marginLeft: 7 }}>{svc.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${c.divider}` }}>
                <div
                  onClick={() => { update({ isCreating: true, code: '' }); setCodeOpen(false); }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: c.accent,
                    display: 'flex', alignItems: 'center', gap: 7, transition: 'background-color 0.08s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  <Plus style={{ width: 13, height: 13 }} />
                  Create custom service
                </div>
              </div>
            </div>
          )}
        </div>
        {canRemove && (
          <Button
            variant="ghost" onClick={onRemove}
            style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.t3, flexShrink: 0, padding: 0 }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </Button>
        )}
      </div>

      {/* Create custom service */}
      {block.isCreating && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: c.t3, marginBottom: 4 }}>Code</div>
            <Input
              type="text"
              value={block.createCode}
              onChange={e => update({ createCode: e.target.value })}
              placeholder="e.g. 99213"
              maxLength={10}
              style={{
                width: '100%', height: 30, padding: '0 8px', borderRadius: 6,
                border: `1px solid ${c.inputBorder}`, backgroundColor: c.inputBg,
                color: c.t0, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: c.t3, marginBottom: 4 }}>Description</div>
            <Input
              type="text"
              value={block.createDescription}
              onChange={e => update({ createDescription: e.target.value })}
              placeholder="Service description"
              style={{
                width: '100%', height: 30, padding: '0 8px', borderRadius: 6,
                border: `1px solid ${c.inputBorder}`, backgroundColor: c.inputBg,
                color: c.t0, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Modifiers */}
      <div>
        <div style={{ fontSize: 11, color: c.t3, marginBottom: 5 }}>Modifiers (optional)</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {block.modifiers.map((mod, mi) => (
            <Input
              key={mi}
              type="text"
              value={mod}
              maxLength={4}
              onChange={e => {
                const newMods = [...block.modifiers] as [string, string, string, string];
                newMods[mi] = e.target.value.toUpperCase();
                update({ modifiers: newMods });
              }}
              placeholder={modifierPlaceholders[mi]}
              style={{
                width: 46, height: 28, textAlign: 'center', borderRadius: 6,
                border: `1px solid ${mod ? c.inputFocus : c.inputBorder}`,
                backgroundColor: c.inputBg, color: c.t0,
                fontSize: 12, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
                letterSpacing: '0.04em', transition: 'border-color 0.15s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Basic Fields (shared across tabs) ────────────────────────────────────────

function BasicFields({
  title, setTitle, date, setDate, startTime, setStartTime, endTime, setEndTime,
  repeat, setRepeat, titlePlaceholder, color, setColor,
  c, isDark, titleRequired,
}: {
  title: string; setTitle: (v: string) => void;
  date: string; setDate: (v: string) => void;
  startTime: string; setStartTime: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  repeat: string; setRepeat: (v: string) => void;
  titlePlaceholder?: string; color?: string; setColor?: (v: string) => void;
  c: AppColors; isDark: boolean; titleRequired?: boolean;
}) {
  const inputStyle = {
    height: 34, borderRadius: 8, fontSize: 13, color: c.t0,
    backgroundColor: c.inputBg, border: `1px solid ${c.inputBorder}`,
    padding: '0 10px', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  };
  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <FieldLabel required={titleRequired} c={c}>Title</FieldLabel>
        <Input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder={titlePlaceholder ?? 'Add title…'} autoFocus
          style={inputStyle}
        />
      </div>

      {/* Date */}
      <div style={{ marginBottom: 12 }}>
        <FieldLabel required c={c}>Date</FieldLabel>
        <Input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
        />
      </div>

      {/* Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <FieldLabel c={c}>Start time</FieldLabel>
          <Input
            type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>
        <div>
          <FieldLabel c={c}>End time</FieldLabel>
          <Input
            type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>
      </div>

      {/* Repeat */}
      <div style={{ marginBottom: 0 }}>
        <FieldLabel c={c}>Repeat</FieldLabel>
        <SimpleSelect
          value={repeat} onChange={setRepeat}
          options={REPEAT_OPTIONS} placeholder="Doesn't repeat"
          c={c} isDark={isDark}
        />
      </div>
    </div>
  );
}

// ─── Tab: Session ─────────────────────────────────────────────────────────────

function SessionTabContent({
  form, setForm, studentOptions, providerOptions, sessions, c, isDark,
  onManageStudents, onManageProviders,
}: {
  form: SessionForm; setForm: React.Dispatch<React.SetStateAction<SessionForm>>;
  studentOptions: ParticipantOption[]; providerOptions: ParticipantOption[];
  sessions: Session[]; c: AppColors; isDark: boolean;
  onManageStudents: () => void; onManageProviders: () => void;
}) {
  const upd = <K extends keyof SessionForm>(k: K, v: SessionForm[K]) => setForm(p => ({ ...p, [k]: v }));

  const addService = () => upd('services', [...form.services, makeServiceBlock()]);
  const updateService = (id: string, b: ServiceBlock) => upd('services', form.services.map(s => s.id === id ? b : s));
  const removeService = (id: string) => upd('services', form.services.filter(s => s.id !== id));

  const toggleStaff = (name: string) => {
    const existing = form.staff.find(s => s.name === name);
    if (existing) {
      upd('staff', form.staff.filter(s => s.name !== name));
    } else {
      upd('staff', [...form.staff, { name, canCollectData: false }]);
    }
  };
  const toggleCanCollect = (name: string) => {
    upd('staff', form.staff.map(s => s.name === name ? { ...s, canCollectData: !s.canCollectData } : s));
  };

  const { getProgramsByName } = useLearnerPrograms();

  const isProgramChecked = (programId: string): boolean =>
    programId in form.selectedProgramIds ? !!form.selectedProgramIds[programId] : true;

  const toggleProgramId = (programId: string) =>
    upd('selectedProgramIds', { ...form.selectedProgramIds, [programId]: !isProgramChecked(programId) });

  const [staffOpen, setStaffOpen] = useState(false);
  const staffRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (staffRef.current && !staffRef.current.contains(e.target as Node)) setStaffOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ padding: '18px 20px 16px' }}>
      {/* Basic Fields */}
      <SectionBlock icon={<Calendar style={{ width: 12, height: 12 }} />} title="Details" c={c}>
        <BasicFields
          title={form.title} setTitle={v => upd('title', v)}
          date={form.date} setDate={v => upd('date', v)}
          startTime={form.startTime} setStartTime={v => upd('startTime', v)}
          endTime={form.endTime} setEndTime={v => upd('endTime', v)}
          repeat={form.repeat} setRepeat={v => upd('repeat', v)}
          color={form.color} setColor={v => upd('color', v)}
          titlePlaceholder="e.g. Emma – ABA Morning"
          c={c} isDark={isDark} titleRequired
        />
      </SectionBlock>

      {/* Staff */}
      <SectionBlock icon={<Users style={{ width: 12, height: 12 }} />} title="Staff" c={c}>
        {/* Staff multi-select */}
        <div ref={staffRef} style={{ position: 'relative', marginBottom: form.staff.length > 0 ? 10 : 0 }}>
          <Button
            variant="ghost"
            onClick={() => setStaffOpen(v => !v)}
            style={{
              width: '100%', minHeight: 34, padding: form.staff.length > 0 ? '4px 8px' : '0 10px',
              border: `1px solid ${staffOpen ? c.inputFocus : c.inputBorder}`,
              borderRadius: 8, backgroundColor: c.inputBg, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              boxSizing: 'border-box', textAlign: 'left', transition: 'border-color 0.15s', fontFamily: 'inherit',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minWidth: 0 }}>
              {form.staff.length === 0 ? (
                <span style={{ fontSize: 13, color: c.t3 }}>Select staff…</span>
              ) : form.staff.map(s => {
                const opt = providerOptions.find(p => p.name === s.name);
                return (
                  <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: c.navActive, borderRadius: 5, padding: '2px 6px 2px 4px', fontSize: 12, color: c.t0, whiteSpace: 'nowrap' }}>
                    {opt && <AvatarBadge initials={opt.initials} color={opt.avatarColor} size={18} />}
                    <span>{s.name.split(' ')[0]}</span>
                    <span onClick={e => { e.stopPropagation(); toggleStaff(s.name); }} style={{ cursor: 'pointer', color: c.t3, lineHeight: 1 }}>×</span>
                  </span>
                );
              })}
            </div>
            <ChevronDown style={{ width: 13, height: 13, color: c.t3, flexShrink: 0, transform: staffOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </Button>
          {staffOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 400,
              backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 8,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.14)',
              overflow: 'hidden',
            }}>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {providerOptions.map(opt => {
                  const isSel = form.staff.some(s => s.name === opt.name);
                  return (
                    <div key={opt.name} onClick={() => toggleStaff(opt.name)}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', cursor: 'pointer', backgroundColor: isSel ? c.navActive : 'transparent', transition: 'background-color 0.08s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : c.navHover}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : 'transparent'}
                    >
                      <AvatarBadge initials={opt.initials} color={opt.avatarColor} size={22} />
                      <span style={{ flex: 1, fontSize: 13, color: c.t0 }}>{opt.name}</span>
                      {isSel && <Check style={{ width: 12, height: 12, color: c.accent }} />}
                    </div>
                  );
                })}
              </div>
              <div style={{ height: 1, backgroundColor: c.divider }} />
              <Button variant="ghost" onClick={() => { setStaffOpen(false); onManageProviders(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Settings2 style={{ width: 12, height: 12, color: c.t3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: c.t3 }}>Manage staff…</span>
              </Button>
            </div>
          )}
        </div>

        {/* Can collect data checkboxes */}
        {form.staff.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.staff.map(s => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 8,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${c.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(() => { const opt = providerOptions.find(p => p.name === s.name); return opt ? <AvatarBadge initials={opt.initials} color={opt.avatarColor} size={20} /> : null; })()}
                  <span style={{ fontSize: 13, color: c.t1 }}>{s.name.split(' ').slice(0, 2).join(' ')}</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                  <Checkbox
                    checked={s.canCollectData}
                    onCheckedChange={() => toggleCanCollect(s.name)}
                  />
                  <span style={{ fontSize: 11, color: c.t2 }}>Can collect data</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      {/* Services */}
      <SectionBlock icon={<Stethoscope style={{ width: 12, height: 12 }} />} title="Services" c={c}>
        {form.services.map((svc, i) => (
          <ServiceCodeBlock
            key={svc.id} block={svc} index={i}
            onChange={b => updateService(svc.id, b)}
            onRemove={() => removeService(svc.id)}
            canRemove={form.services.length > 1}
            c={c} isDark={isDark}
          />
        ))}
        <Button
          variant="ghost" onClick={addService}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 30,
            padding: '0 10px', border: `1px dashed ${c.border}`, borderRadius: 7,
            cursor: 'pointer', color: c.t3,
            fontSize: 12, fontFamily: 'inherit',
          }}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Add service
        </Button>
      </SectionBlock>

      {/* Learners */}
      <SectionBlock icon={<UserCheck style={{ width: 12, height: 12 }} />} title="Learners" c={c}>
        <ParticipantMultiSelect
          label="learners" options={studentOptions}
          selected={form.learners} onChange={v => upd('learners', v)}
          placeholder="Select learners…" isSquare c={c} isDark={isDark}
        />
      </SectionBlock>

      {/* Data Collection */}
      <SectionBlock icon={<ClipboardList style={{ width: 12, height: 12 }} />} title="Data Collection" c={c}>
        {/* Note template */}
        <div style={{ marginBottom: 14 }}>
          <FieldLabel c={c}>Note Template</FieldLabel>
          <SimpleSelect
            value={form.noteTemplate} onChange={v => upd('noteTemplate', v)}
            options={NOTE_TEMPLATES.map(t => ({ value: t, label: t }))}
            placeholder="Select note template…" c={c} isDark={isDark}
          />
        </div>

        {/* Programs */}
        {form.learners.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen style={{ width: 11, height: 11 }} />
              Programs
            </div>
            {form.learners.map(learner => {
              const learnerOpt = studentOptions.find(o => o.name === learner);
              const programs = getProgramsByName(learner);
              return (
                <div key={learner} style={{ marginBottom: 12, border: `1px solid ${c.border}`, borderRadius: 9, overflow: 'hidden' }}>
                  {/* Learner header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderBottom: `1px solid ${c.border}`,
                  }}>
                    {learnerOpt && <AvatarBadge initials={learnerOpt.initials} color={learnerOpt.avatarColor} square size={24} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.t0 }}>{learner}</span>
                    <span style={{ fontSize: 11, color: c.t3, marginLeft: 'auto' }}>{programs.length} program{programs.length !== 1 ? 's' : ''}</span>
                  </div>

                  {programs.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: c.t3, fontStyle: 'italic' }}>
                      No programs assigned — add via Learner profile
                    </div>
                  ) : (
                    <div style={{ padding: '6px 0' }}>
                      {programs.map(prog => (
                        <label
                          key={prog.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '7px 12px', cursor: 'pointer', userSelect: 'none',
                          }}
                        >
                          <Checkbox
                            checked={isProgramChecked(prog.id)}
                            onCheckedChange={() => toggleProgramId(prog.id)}
                          />
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: prog.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: c.t1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog.title}</span>
                            <span style={{ fontSize: 11, color: c.t3 }}>{prog.targets.length} target{prog.targets.length !== 1 ? 's' : ''}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionBlock>
    </div>
  );
}

// ─── Tab: Supervision ─────────────────────────────────────────────────────────

function SupervisionTabContent({
  form, setForm, studentOptions, providerOptions, sessions, c, isDark,
}: {
  form: SupervisionForm; setForm: React.Dispatch<React.SetStateAction<SupervisionForm>>;
  studentOptions: ParticipantOption[]; providerOptions: ParticipantOption[];
  sessions: Session[]; c: AppColors; isDark: boolean;
}) {
  const upd = <K extends keyof SupervisionForm>(k: K, v: SupervisionForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const addService = () => upd('services', [...form.services, makeServiceBlock()]);
  const updateService = (id: string, b: ServiceBlock) => upd('services', form.services.map(s => s.id === id ? b : s));
  const removeService = (id: string) => upd('services', form.services.filter(s => s.id !== id));

  const sessionOpts = sessions.map(s => ({ value: s.id, label: s.sessionName || s.id }));

  return (
    <div style={{ padding: '18px 20px 16px' }}>
      <SectionBlock icon={<Calendar style={{ width: 12, height: 12 }} />} title="Details" c={c}>
        <BasicFields
          title={form.title} setTitle={v => upd('title', v)}
          date={form.date} setDate={v => upd('date', v)}
          startTime={form.startTime} setStartTime={v => upd('startTime', v)}
          endTime={form.endTime} setEndTime={v => upd('endTime', v)}
          repeat={form.repeat} setRepeat={v => upd('repeat', v)}
          titlePlaceholder="Supervision session…"
          c={c} isDark={isDark} titleRequired
        />
      </SectionBlock>

      <SectionBlock icon={<UserCheck style={{ width: 12, height: 12 }} />} title="Supervisor" c={c}>
        <FieldLabel required c={c}>Select Supervisor</FieldLabel>
        <ParticipantMultiSelect
          label="supervisor" options={providerOptions}
          selected={form.supervisor ? [form.supervisor] : []}
          onChange={v => upd('supervisor', v[0] ?? '')}
          placeholder="Select supervisor…" c={c} isDark={isDark} single
        />
      </SectionBlock>

      <SectionBlock icon={<Stethoscope style={{ width: 12, height: 12 }} />} title="Services" c={c}>
        {form.services.map((svc, i) => (
          <ServiceCodeBlock
            key={svc.id} block={svc} index={i}
            onChange={b => updateService(svc.id, b)}
            onRemove={() => removeService(svc.id)}
            canRemove={form.services.length > 1}
            c={c} isDark={isDark}
          />
        ))}
        <Button variant="ghost" onClick={addService}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', border: `1px dashed ${c.border}`, borderRadius: 7, cursor: 'pointer', color: c.t3, fontSize: 12, fontFamily: 'inherit' }}
        >
          <Plus style={{ width: 12, height: 12 }} /> Add service
        </Button>
      </SectionBlock>

      <SectionBlock icon={<Users style={{ width: 12, height: 12 }} />} title="Staff Being Supervised" c={c}>
        <ParticipantMultiSelect
          label="staff" options={providerOptions}
          selected={form.staff} onChange={v => upd('staff', v)}
          placeholder="Select staff…" c={c} isDark={isDark}
        />
      </SectionBlock>

      <SectionBlock icon={<UserCheck style={{ width: 12, height: 12 }} />} title="Learner" c={c}>
        <ParticipantMultiSelect
          label="learner" options={studentOptions}
          selected={form.learner ? [form.learner] : []}
          onChange={v => upd('learner', v[0] ?? '')}
          placeholder="Select learner…" isSquare c={c} isDark={isDark} single
        />
      </SectionBlock>

      <SectionBlock icon={<Link style={{ width: 12, height: 12 }} />} title="Link Session" c={c}>
        <FieldLabel c={c}>Link to existing session (optional)</FieldLabel>
        <SimpleSelect
          value={form.linkedSession} onChange={v => upd('linkedSession', v)}
          options={[{ value: '', label: 'No linked session' }, ...sessionOpts]}
          placeholder="Select session to supervise…" c={c} isDark={isDark}
        />
      </SectionBlock>

      <SectionBlock icon={<ClipboardList style={{ width: 12, height: 12 }} />} title="Note Template" c={c}>
        <SimpleSelect
          value={form.noteTemplate} onChange={v => upd('noteTemplate', v)}
          options={NOTE_TEMPLATES.map(t => ({ value: t, label: t }))}
          placeholder="Select note template…" c={c} isDark={isDark}
        />
      </SectionBlock>
    </div>
  );
}

// ─── Tab: Event ───────────────────────────────────────────────────────────────

function EventTabContent({
  form, setForm, providerOptions, c, isDark,
}: {
  form: EventForm; setForm: React.Dispatch<React.SetStateAction<EventForm>>;
  providerOptions: ParticipantOption[]; c: AppColors; isDark: boolean;
}) {
  const upd = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ padding: '18px 20px 16px' }}>
      <SectionBlock icon={<Calendar style={{ width: 12, height: 12 }} />} title="Details" c={c}>
        <BasicFields
          title={form.title} setTitle={v => upd('title', v)}
          date={form.date} setDate={v => upd('date', v)}
          startTime={form.startTime} setStartTime={v => upd('startTime', v)}
          endTime={form.endTime} setEndTime={v => upd('endTime', v)}
          repeat={form.repeat} setRepeat={v => upd('repeat', v)}
          titlePlaceholder="Event title…"
          c={c} isDark={isDark} titleRequired
        />
      </SectionBlock>
      <SectionBlock icon={<Users style={{ width: 12, height: 12 }} />} title="Staff" c={c}>
        <ParticipantMultiSelect
          label="staff" options={providerOptions}
          selected={form.staff} onChange={v => upd('staff', v)}
          placeholder="Select staff…" c={c} isDark={isDark}
        />
      </SectionBlock>
    </div>
  );
}

// ─── Tab: Unavailability ──────────────────────────────────────────────────────

function UnavailabilityTabContent({
  form, setForm, providerOptions, c, isDark,
}: {
  form: UnavailabilityForm; setForm: React.Dispatch<React.SetStateAction<UnavailabilityForm>>;
  providerOptions: ParticipantOption[]; c: AppColors; isDark: boolean;
}) {
  const upd = <K extends keyof UnavailabilityForm>(k: K, v: UnavailabilityForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const inputStyle = {
    height: 34, borderRadius: 8, fontSize: 13, color: c.t0,
    backgroundColor: c.inputBg, border: `1px solid ${c.inputBorder}`,
    padding: '0 10px', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  };
  return (
    <div style={{ padding: '18px 20px 16px' }}>
      <SectionBlock icon={<AlertCircle style={{ width: 12, height: 12 }} />} title="Details" c={c}>
        {/* Reason */}
        <div style={{ marginBottom: 12 }}>
          <FieldLabel c={c}>Reason (optional)</FieldLabel>
          <Input
            type="text" value={form.reason} onChange={e => upd('reason', e.target.value)}
            placeholder="e.g. Personal time off, sick leave…" autoFocus
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel required c={c}>Date</FieldLabel>
          <Input
            type="date" value={form.date} onChange={e => upd('date', e.target.value)}
            style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <FieldLabel c={c}>Start time</FieldLabel>
            <Input type="time" value={form.startTime} onChange={e => upd('startTime', e.target.value)} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
          </div>
          <div>
            <FieldLabel c={c}>End time</FieldLabel>
            <Input type="time" value={form.endTime} onChange={e => upd('endTime', e.target.value)} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
          </div>
        </div>
        <div>
          <FieldLabel c={c}>Repeat</FieldLabel>
          <SimpleSelect value={form.repeat} onChange={v => upd('repeat', v)} options={REPEAT_OPTIONS} c={c} isDark={isDark} />
        </div>
      </SectionBlock>
      <SectionBlock icon={<Users style={{ width: 12, height: 12 }} />} title="Staff" c={c}>
        <ParticipantMultiSelect
          label="staff" options={providerOptions}
          selected={form.staff} onChange={v => upd('staff', v)}
          placeholder="Select staff…" c={c} isDark={isDark}
        />
      </SectionBlock>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SessionCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Session, 'id'>, editId?: string) => void;
  initialDate?: Date;
  initialStartTime?: string;
  editSession?: Session | null;
  sessions?: Session[];
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'session',        label: 'Session' },
  { id: 'supervision',    label: 'Supervision' },
  { id: 'event',          label: 'Event' },
  { id: 'unavailability', label: 'Unavailability' },
];

export function SessionCreateSheet({
  isOpen, onClose, onSave,
  initialDate, initialStartTime,
  editSession, sessions = [],
}: SessionCreateSheetProps) {
  const { colors: c, isDark } = useTheme();
  const { students, providers } = useParticipants();
  const { getProgramsByName } = useLearnerPrograms();

  const [activeTab, setActiveTab] = useState<TabType>('session');
  const [sessionForm,        setSessionForm]        = useState<SessionForm>(() => defaultSessionForm(initialDate, initialStartTime));
  const [supervisionForm,    setSupervisionForm]     = useState<SupervisionForm>(() => defaultSupervisionForm(initialDate, initialStartTime));
  const [eventForm,          setEventForm]           = useState<EventForm>(() => defaultEventForm(initialDate, initialStartTime));
  const [unavailabilityForm, setUnavailabilityForm]  = useState<UnavailabilityForm>(() => defaultUnavailabilityForm(initialDate, initialStartTime));

  const [manageOpen,    setManageOpen]    = useState(false);
  const [manageInitTab, setManageInitTab] = useState<'students' | 'providers'>('students');

  // Reset forms when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    if (editSession) {
      // Populate session tab with edit data
      const pad = (n: number) => String(n).padStart(2, '0');
      setSessionForm({
        title: editSession.sessionName,
        date: toDateLocal(editSession.startTime),
        startTime: `${pad(editSession.startTime.getHours())}:${pad(editSession.startTime.getMinutes())}`,
        endTime: `${pad(editSession.endTime.getHours())}:${pad(editSession.endTime.getMinutes())}`,
        repeat: "Doesn't repeat",
        color: editSession.color ?? '#4F83CC',
        staff: editSession.providers.map(p => ({ name: p, canCollectData: false })),
        services: [makeServiceBlock()],
        learners: editSession.students,
        noteTemplate: '',
        selectedProgramIds: editSession.selectedPrograms
          ? Object.fromEntries(
              Object.values(editSession.selectedPrograms).flat().map(id => [id, true])
            )
          : {},
      });
      setActiveTab('session');
    } else {
      setActiveTab('session');
      setSessionForm(defaultSessionForm(initialDate, initialStartTime));
      setSupervisionForm(defaultSupervisionForm(initialDate, initialStartTime));
      setEventForm(defaultEventForm(initialDate, initialStartTime));
      setUnavailabilityForm(defaultUnavailabilityForm(initialDate, initialStartTime));
    }
  }, [isOpen]); // eslint-disable-line

  const studentOptions = students.map(s => ({ name: s.name, initials: s.initials, avatarColor: s.avatarColor }));
  const providerOptions = providers.map(p => ({ name: p.name, initials: p.initials, avatarColor: p.avatarColor }));

  // Validate
  const isValid = (() => {
    if (activeTab === 'session') return sessionForm.title.trim().length > 0;
    if (activeTab === 'supervision') return supervisionForm.title.trim().length > 0;
    if (activeTab === 'event') return eventForm.title.trim().length > 0;
    if (activeTab === 'unavailability') return unavailabilityForm.date.length > 0;
    return false;
  })();

  const handleSubmit = () => {
    if (!isValid) return;

    let data: Omit<Session, 'id'>;
    const parseDateTime = (date: string, time: string) => {
      const [y, m, d] = date.split('-').map(Number);
      const [h, mi] = time.split(':').map(Number);
      return new Date(y, m - 1, d, h, mi);
    };

    if (activeTab === 'session') {
      // Build selectedPrograms: learnerName → checked programIds
      const selectedPrograms: Record<string, string[]> = {};
      for (const learner of sessionForm.learners) {
        const ids = getProgramsByName(learner)
          .filter(p => !(p.id in sessionForm.selectedProgramIds) || sessionForm.selectedProgramIds[p.id])
          .map(p => p.id);
        if (ids.length > 0) selectedPrograms[learner] = ids;
      }

      data = {
        sessionName: sessionForm.title.trim(),
        students: sessionForm.learners,
        providers: sessionForm.staff.map(s => s.name),
        serviceType: 'ABA Therapy',
        startTime: parseDateTime(sessionForm.date, sessionForm.startTime),
        endTime: parseDateTime(sessionForm.date, sessionForm.endTime),
        color: sessionForm.color,
        eventType: sessionForm.repeat !== "Doesn't repeat" ? 'recurring' : 'normal',
        selectedPrograms,
      };
    } else if (activeTab === 'supervision') {
      data = {
        sessionName: supervisionForm.title.trim(),
        students: supervisionForm.learner ? [supervisionForm.learner] : [],
        providers: [...supervisionForm.staff, ...(supervisionForm.supervisor ? [supervisionForm.supervisor] : [])],
        serviceType: 'ABA Therapy',
        startTime: parseDateTime(supervisionForm.date, supervisionForm.startTime),
        endTime: parseDateTime(supervisionForm.date, supervisionForm.endTime),
        color: '#7C52D0',
        eventType: supervisionForm.repeat !== "Doesn't repeat" ? 'recurring' : 'normal',
      };
    } else if (activeTab === 'event') {
      data = {
        sessionName: eventForm.title.trim(),
        students: [],
        providers: eventForm.staff,
        serviceType: 'Speech Therapy',
        startTime: parseDateTime(eventForm.date, eventForm.startTime),
        endTime: parseDateTime(eventForm.date, eventForm.endTime),
        color: '#2E9E63',
        eventType: eventForm.repeat !== "Doesn't repeat" ? 'recurring' : 'normal',
      };
    } else {
      data = {
        sessionName: unavailabilityForm.reason.trim() || 'Unavailable',
        students: [],
        providers: unavailabilityForm.staff,
        serviceType: 'Occupational Therapy',
        startTime: parseDateTime(unavailabilityForm.date, unavailabilityForm.startTime),
        endTime: parseDateTime(unavailabilityForm.date, unavailabilityForm.endTime),
        color: '#E05252',
        eventType: unavailabilityForm.repeat !== "Doesn't repeat" ? 'recurring' : 'normal',
      };
    }

    onSave(data, editSession?.id);
    onClose();
  };

  const createLabel = {
    session: editSession ? 'Save Changes' : 'Create Session',
    supervision: 'Create Supervision',
    event: 'Create Event',
    unavailability: 'Mark Unavailable',
  }[activeTab];

  const accentColor = TAB_COLORS[activeTab];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
        <SheetPortal>
          <SheetOverlay className="bg-black/20" />
          <SheetPrimitive.Content
            className={cn(
              'fixed right-0 top-0 h-full z-51 flex flex-col',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              'data-[state=open]:duration-300 data-[state=closed]:duration-250',
            )}
            style={{
              width: 460, zIndex: 51,
              backgroundColor: c.surface,
              borderLeft: `1px solid ${c.border}`,
              boxShadow: isDark ? '-8px 0 40px rgba(0,0,0,0.40)' : '-8px 0 40px rgba(0,0,0,0.10)',
              display: 'flex', flexDirection: 'column', height: '100%',
            }}
          >
            <SheetTitle className="sr-only">
              {editSession ? 'Edit Session' : 'Create New'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Create a new session, supervision, event, or unavailability block
            </SheetDescription>

            {/* ── Header ── */}
            <div style={{
              flexShrink: 0,
              borderBottom: `1px solid ${c.border}`,
            }}>
              {/* Title row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', height: 50,
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: c.t0 }}>
                  {editSession ? 'Edit Session' : 'Create New'}
                </span>
                <Button
                  type="button" variant="ghost" size="icon" onClick={onClose}
                  className="h-7 w-7 rounded-md"
                  style={{ color: c.t3 }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </Button>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, padding: '0 20px' }}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  const tabColor = TAB_COLORS[tab.id];
                  return (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      onClick={() => setActiveTab(tab.id)}
                      className="rounded-none"
                      style={{
                        padding: '8px 12px',
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? c.t0 : c.t3,
                        background: 'none',
                        borderBottom: isActive ? `2px solid ${c.t0}` : '2px solid transparent',
                        transition: 'color 0.15s, border-color 0.15s',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <ScrollArea className="h-full">
                {activeTab === 'session' && (
                  <SessionTabContent
                    form={sessionForm} setForm={setSessionForm}
                    studentOptions={studentOptions} providerOptions={providerOptions}
                    sessions={sessions} c={c} isDark={isDark}
                    onManageStudents={() => { setManageInitTab('students'); setManageOpen(true); }}
                    onManageProviders={() => { setManageInitTab('providers'); setManageOpen(true); }}
                  />
                )}
                {activeTab === 'supervision' && (
                  <SupervisionTabContent
                    form={supervisionForm} setForm={setSupervisionForm}
                    studentOptions={studentOptions} providerOptions={providerOptions}
                    sessions={sessions} c={c} isDark={isDark}
                  />
                )}
                {activeTab === 'event' && (
                  <EventTabContent
                    form={eventForm} setForm={setEventForm}
                    providerOptions={providerOptions} c={c} isDark={isDark}
                  />
                )}
                {activeTab === 'unavailability' && (
                  <UnavailabilityTabContent
                    form={unavailabilityForm} setForm={setUnavailabilityForm}
                    providerOptions={providerOptions} c={c} isDark={isDark}
                  />
                )}
              </ScrollArea>
            </div>

            {/* ── Footer ── */}
            <div style={{
              flexShrink: 0,
              borderTop: `1px solid ${c.border}`,
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              gap: 8, backgroundColor: c.surface,
            }}>
              <Button
                type="button" variant="outline" onClick={onClose}
                className="h-[34px] px-4 rounded-lg text-sm"
                style={{ fontWeight: 500, color: c.t1, borderColor: c.inputBorder, backgroundColor: 'transparent' }}
              >
                Cancel
              </Button>
              <Button
                disabled={!isValid}
                onClick={handleSubmit}
                className="h-[34px] px-[18px] rounded-lg text-sm"
                style={{
                  backgroundColor: isValid ? c.t0 : c.toggleOff,
                  color: isValid ? (isDark ? '#111111' : '#ffffff') : c.t3,
                  fontWeight: 500, cursor: isValid ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                  opacity: isValid ? 1 : 0.6,
                }}
              >
                {createLabel}
              </Button>
            </div>
          </SheetPrimitive.Content>
        </SheetPortal>
      </Sheet>

      <ManageParticipantsModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        initialTab={manageInitTab}
      />
    </>
  );
}
