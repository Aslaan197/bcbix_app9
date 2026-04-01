import React, { useState, useEffect } from 'react';
import { X, Plus, ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { AppColors } from '../context/ThemeContext';
import { PromptFadingModal } from './PromptFadingModal';
import type { PromptFadingConfig } from '../lib/promptFading';
import { DEFAULT_PROMPT_FADING_CONFIG } from '../lib/promptFading';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { PhaseProgressionModal } from './PhaseProgressionModal';
import type {
  ProgramTemplate, Target, Category, TemplateStatus, DataType,
  PromptDefinition, TaskDefinition, FormFieldDef, TargetConfig, PhaseProgressionConfig,
} from './ProgramTemplatesPage';

// Defined locally to break the circular import with ProgramTemplatesPage
const DEFAULT_PROMPTS: PromptDefinition[] = [
  { id: 'p-i',  name: 'Independent',      code: 'I',  passFail: 'pass' },
  { id: 'p-g',  name: 'Gesture',          code: 'G',  passFail: 'fail' },
  { id: 'p-v',  name: 'Verbal',           code: 'V',  passFail: 'fail' },
  { id: 'p-m',  name: 'Model',            code: 'M',  passFail: 'fail' },
  { id: 'p-pp', name: 'Partial Physical', code: 'PP', passFail: 'fail' },
  { id: 'p-fp', name: 'Full Physical',    code: 'FP', passFail: 'fail' },
];

// ─── Local constants ──────────────────────────────────────────────────────────

const DATA_TYPES: DataType[] = [
  'Percent Correct', 'Frequency', 'Task Analysis',
  'Custom Prompt', 'Duration', 'Text Anecdotal',
  'Rate', 'Partial Interval', 'Whole Interval', 'Custom',
];

const DEFAULT_PHASES = [
  'Baseline', 'Intervention', 'Maintenance', 'Generalization', 'Mastery',
] as const;

const COLOR_PRESETS = [
  '#4F83CC', '#2E9E63', '#7C52D0', '#E07B39',
  '#E04B4B', '#D4AC0D', '#17A2B8', '#E83E8C',
  '#38B2AC', '#8B5CF6', '#EC4899', '#6366F1',
];

const ICON_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'star', label: 'Star' }, { id: 'heart', label: 'Heart' },
  { id: 'target', label: 'Target' }, { id: 'book', label: 'Book' },
  { id: 'flag', label: 'Flag' }, { id: 'zap', label: 'Zap' },
  { id: 'users', label: 'Users' }, { id: 'award', label: 'Award' },
  { id: 'chart', label: 'Chart' }, { id: 'leaf', label: 'Leaf' },
  { id: 'clock', label: 'Clock' }, { id: 'check', label: 'Check' },
  { id: 'brain', label: 'Brain' }, { id: 'puzzle', label: 'Puzzle' },
  { id: 'globe', label: 'Globe' }, { id: 'sparkle', label: 'Sparkle' },
];

// ─── IconShape ────────────────────────────────────────────────────────────────

function IconShape({ id, size = 16, color = 'currentColor' }: { id: string; size?: number; color?: string }) {
  const s = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const icons: Record<string, React.ReactNode> = {
    star:    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" {...s} />,
    heart:   <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...s} />,
    target:  <><circle cx="12" cy="12" r="10" {...s} /><circle cx="12" cy="12" r="6" {...s} /><circle cx="12" cy="12" r="2" {...s} /></>,
    book:    <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...s} /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...s} /></>,
    flag:    <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" {...s} /><line x1="4" y1="22" x2="4" y2="15" {...s} /></>,
    zap:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...s} />,
    users:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s} /><circle cx="9" cy="7" r="4" {...s} /><path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s} /><path d="M16 3.13a4 4 0 0 1 0 7.75" {...s} /></>,
    award:   <><circle cx="12" cy="8" r="6" {...s} /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" {...s} /></>,
    chart:   <><line x1="18" y1="20" x2="18" y2="10" {...s} /><line x1="12" y1="20" x2="12" y2="4" {...s} /><line x1="6" y1="20" x2="6" y2="14" {...s} /></>,
    leaf:    <path d="M17 8C8 10 5.9 16.17 3.82 22c1.15-1.75 4.19-3 7.18-3 4.59 0 7-3 7-7.18C18 10 17.77 9 17 8z" {...s} />,
    clock:   <><circle cx="12" cy="12" r="10" {...s} /><polyline points="12 6 12 12 16 14" {...s} /></>,
    check:   <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...s} /><polyline points="22 4 12 14.01 9 11.01" {...s} /></>,
    brain:   <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z" {...s} /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z" {...s} /></>,
    puzzle:  <><rect x="2" y="11" width="7" height="7" rx="1" {...s} /><rect x="15" y="11" width="7" height="7" rx="1" {...s} /><rect x="8.5" y="2" width="7" height="7" rx="1" {...s} /><rect x="8.5" y="15" width="7" height="7" rx="1" {...s} /></>,
    globe:   <><circle cx="12" cy="12" r="10" {...s} /><line x1="2" y1="12" x2="22" y2="12" {...s} /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s} /></>,
    sparkle: <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" {...s} />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>{icons[id] ?? icons.star}</svg>;
}

// ─── FieldGroup ───────────────────────────────────────────────────────────────

function FieldGroup({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'inherit', color: 'var(--muted-foreground)' }}>
          {label}{required && <span style={{ color: 'var(--destructive)', marginLeft: 2 }}>*</span>}
        </span>
        {hint && <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'inherit', opacity: 0.7 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── SectionDivider ───────────────────────────────────────────────────────────

function SectionDivider({ label, c }: { label: string; c: AppColors }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 2px' }}>
      <span style={{ fontSize: 10, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'inherit', color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
    </div>
  );
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange, small, disabled }: { value: string; onChange: (c: string) => void; small?: boolean; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: small ? 5 : 6 }}>
      {COLOR_PRESETS.map(color => (
        <button key={color} type="button" onClick={disabled ? undefined : () => onChange(color)} title={color}
          style={{
            width: small ? 18 : 22, height: small ? 18 : 22,
            borderRadius: small ? 5 : 6, backgroundColor: color,
            border: value === color ? '2.5px solid var(--foreground)' : '2.5px solid transparent',
            boxShadow: value === color ? `0 0 0 2px ${color}55` : 'none',
            cursor: 'pointer', transition: 'transform 0.1s', flexShrink: 0, outline: 'none',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
        />
      ))}
    </div>
  );
}

// ─── IconPicker ───────────────────────────────────────────────────────────────

function IconPicker({ value, onChange, c }: { value: string; onChange: (id: string) => void; c: AppColors }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
      {ICON_OPTIONS.map(icon => {
        const active = value === icon.id;
        return (
          <button key={icon.id} type="button" onClick={() => onChange(icon.id)} title={icon.label}
            style={{
              aspectRatio: '1', borderRadius: 6, padding: 5,
              border: `1px solid ${active ? c.accent : c.border}`,
              backgroundColor: active ? c.accent : 'transparent',
              color: active ? '#fff' : c.t2,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.1s', outline: 'none',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <IconShape id={icon.id} size={13} color="currentColor" />
          </button>
        );
      })}
    </div>
  );
}

// ─── ComboSelect ─────────────────────────────────────────────────────────────

interface ComboOption { id: string; name: string; color?: string; }

function ComboSelect({ value, options, placeholder, onChange, onCreateClick, createLabel, disabled, c, isDark }: {
  value: string; options: ComboOption[]; placeholder: string;
  onChange: (id: string) => void; onCreateClick: () => void;
  createLabel?: string; disabled?: boolean; c: AppColors; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={disabled}
          className="w-full h-8 justify-between gap-1.5 px-2.5"
          style={{
            backgroundColor: c.inputBg,
            borderColor: open ? c.accent : c.inputBorder,
            fontFamily: 'inherit',
          }}
        >
          <span className="flex items-center gap-1.5 min-w-0 flex-1">
            {selected ? (
              <>
                {selected.color && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: selected.color, flexShrink: 0 }} />}
                <span style={{ fontSize: 'var(--text-base)', color: c.t0, fontFamily: 'inherit' }}>{selected.name}</span>
              </>
            ) : (
              <span style={{ fontSize: 'var(--text-base)', color: c.t3, fontFamily: 'inherit' }}>{placeholder}</span>
            )}
          </span>
          <ChevronDown style={{ width: 12, height: 12, color: c.t3, flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}
        style={{ minWidth: 'var(--radix-popover-trigger-width)', padding: 4, backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
      >
        {options.map(opt => (
          <Button key={opt.id} variant="ghost" type="button" onClick={() => { onChange(opt.id); setOpen(false); }}
            className="w-full h-[30px] justify-start gap-2 px-2"
            style={{
              backgroundColor: value === opt.id ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : undefined,
              fontFamily: 'inherit',
            }}
          >
            {opt.color && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />}
            <span style={{ flex: 1, textAlign: 'left', fontSize: 'var(--text-base)', color: c.t0, fontFamily: 'inherit' }}>{opt.name}</span>
            {value === opt.id && <Check style={{ width: 12, height: 12, color: c.t1 }} />}
          </Button>
        ))}
        <div style={{ height: 1, backgroundColor: c.divider, margin: '4px 0' }} />
        <Button variant="ghost" type="button" onClick={() => { setOpen(false); onCreateClick(); }}
          className="w-full h-7 justify-start gap-1.5 px-2"
          style={{ fontFamily: 'inherit' }}
        >
          <Plus style={{ width: 12, height: 12, color: c.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-base)', color: c.accent, fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)' }}>{createLabel}</span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ─── PromptsEditor ────────────────────────────────────────────────────────────

function PromptsEditor({ prompts, onChange, c, isDark }: {
  prompts: PromptDefinition[]; onChange: (p: PromptDefinition[]) => void; c: AppColors; isDark: boolean;
}) {
  const addPrompt = () => {
    const newPrompt: PromptDefinition = { id: `p-${Date.now()}`, name: '', code: '', passFail: 'fail' };
    onChange([...prompts, newPrompt]);
  };
  const updatePrompt = (idx: number, updates: Partial<PromptDefinition>) => {
    const next = [...prompts];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  };
  const removePrompt = (idx: number) => onChange(prompts.filter((_, i) => i !== idx));


  return (
    <div>
      {prompts.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Column headers */}
          <div style={{ display: 'flex', gap: 6, paddingLeft: 2 }}>
            <span style={{ width: 42, fontSize: 10, color: c.t3, fontFamily: 'inherit', textAlign: 'center' }}>Code</span>
            <span style={{ flex: 1, fontSize: 10, color: c.t3, fontFamily: 'inherit' }}>Name</span>
            <span style={{ width: 72, fontSize: 10, color: c.t3, fontFamily: 'inherit', textAlign: 'center' }}>Maps to</span>
            <span style={{ width: 24 }} />
          </div>
          {prompts.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Code */}
              <Input
                value={p.code}
                onChange={e => updatePrompt(i, { code: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder="I"
                className="h-7 text-center font-mono text-[11px] font-bold w-[42px] flex-shrink-0 focus-visible:ring-0 px-1.5"
                style={{ backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0 }}
              />
              {/* Name */}
              <Input
                value={p.name}
                onChange={e => updatePrompt(i, { name: e.target.value })}
                placeholder="Prompt name…"
                className="flex-1 h-7 text-[var(--text-xs)] focus-visible:ring-0"
                style={{ backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, fontFamily: 'inherit' }}
              />
              {/* Pass/Fail toggle */}
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <Button type="button" onClick={() => updatePrompt(i, { passFail: 'pass' })}
                  className="h-7 px-2 text-[11px] font-semibold"
                  style={{
                    backgroundColor: p.passFail === 'pass' ? 'rgba(46,158,99,0.18)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    color: p.passFail === 'pass' ? '#2E9E63' : c.t3,
                    fontFamily: 'inherit', border: 'none',
                  }}
                >P</Button>
                <Button type="button" onClick={() => updatePrompt(i, { passFail: 'fail' })}
                  className="h-7 px-2 text-[11px] font-semibold"
                  style={{
                    backgroundColor: p.passFail === 'fail' ? (isDark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.10)') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    color: p.passFail === 'fail' ? (isDark ? '#f87171' : '#c0392b') : c.t3,
                    fontFamily: 'inherit', border: 'none',
                  }}
                >F</Button>
              </div>
              {/* Delete */}
              <Button variant="ghost" size="icon" type="button" onClick={() => removePrompt(i)}
                className="h-6 w-6 flex-shrink-0"
                style={{ color: c.t3 }}
              ><Trash2 size={11} /></Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" type="button" onClick={addPrompt}
        className="h-7 gap-1.5"
        style={{ borderStyle: 'dashed', fontSize: 'var(--text-xs)', fontFamily: 'inherit', color: c.t2 }}
      >
        <Plus size={11} /> Add Prompt
      </Button>
    </div>
  );
}

// ─── TasksEditor ──────────────────────────────────────────────────────────────

function TasksEditor({ tasks, onChange, c }: {
  tasks: TaskDefinition[]; onChange: (t: TaskDefinition[]) => void; c: AppColors;
}) {
  const addTask = () => onChange([...tasks, { id: `tk-${Date.now()}`, name: '' }]);
  const updateTask = (idx: number, name: string) => {
    const next = [...tasks]; next[idx] = { ...next[idx], name }; onChange(next);
  };
  const removeTask = (idx: number) => onChange(tasks.filter((_, i) => i !== idx));

  return (
    <div>
      {tasks.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {tasks.map((task, i) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: c.t3, width: 18, textAlign: 'right', fontFamily: 'inherit', flexShrink: 0 }}>{i + 1}</span>
              <Input
                value={task.name}
                onChange={e => updateTask(i, e.target.value)}
                placeholder={`Task ${i + 1}…`}
                className="flex-1 h-7 text-[var(--text-xs)] focus-visible:ring-0"
                style={{ backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, fontFamily: 'inherit' }}
              />
              <Button variant="ghost" size="icon" type="button" onClick={() => removeTask(i)}
                className="h-6 w-6 flex-shrink-0"
                style={{ color: c.t3 }}
              ><Trash2 size={11} /></Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" type="button" onClick={addTask}
        className="h-7 gap-1.5"
        style={{ borderStyle: 'dashed', fontSize: 'var(--text-xs)', fontFamily: 'inherit', color: c.t2 }}
      >
        <Plus size={11} /> Add Task
      </Button>
    </div>
  );
}

// ─── CustomFormBuilder ────────────────────────────────────────────────────────

const FORM_FIELD_TYPES: Array<{ type: FormFieldDef['type']; label: string }> = [
  { type: 'text', label: 'Text' }, { type: 'number', label: 'Number' },
  { type: 'checkbox_group', label: 'Checkboxes' }, { type: 'radio_group', label: 'Radio' },
];

function CustomFormBuilder({ fields, onChange, c, isDark }: {
  fields: FormFieldDef[]; onChange: (f: FormFieldDef[]) => void; c: AppColors; isDark: boolean;
}) {
  const addField = () => onChange([...fields, { id: `ff-${Date.now()}`, type: 'text', label: '' }]);
  const updateField = (idx: number, updates: Partial<FormFieldDef>) => {
    const next = [...fields]; next[idx] = { ...next[idx], ...updates }; onChange(next);
  };
  const removeField = (idx: number) => onChange(fields.filter((_, i) => i !== idx));

  return (
    <div>
      {fields.map((field, i) => (
        <div key={field.id} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 'var(--radius-button)', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
            {/* Type selector */}
            <Select value={field.type} onValueChange={val => updateField(i, { type: val as FormFieldDef['type'] })}>
              <SelectTrigger className="h-7 w-[100px] text-[var(--text-xs)] focus:ring-0" style={{ fontFamily: 'inherit', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_FIELD_TYPES.map(ft => <SelectItem key={ft.type} value={ft.type} className="text-[var(--text-xs)]">{ft.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Label input */}
            <Input value={field.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Field label…"
              className="flex-1 h-7 text-[var(--text-xs)] focus-visible:ring-0"
              style={{ backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, fontFamily: 'inherit' }}
            />
            <Button variant="ghost" size="icon" type="button" onClick={() => removeField(i)}
              className="h-6 w-6 flex-shrink-0 rounded"
              style={{ color: c.t3 }}
            ><Trash2 size={11} /></Button>
          </div>
          {['checkbox_group', 'radio_group'].includes(field.type) && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 10, color: c.t3, fontFamily: 'inherit', marginBottom: 4 }}>Options</div>
              {(field.options ?? []).map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Button variant="ghost" type="button"
                      onClick={() => {
                        const opts = [...(field.options ?? [])];
                        if (oi > 0) { [opts[oi - 1], opts[oi]] = [opts[oi], opts[oi - 1]]; updateField(i, { options: opts }); }
                      }}
                      disabled={oi === 0}
                      className="h-[13px] w-4 p-0 rounded-none"
                      style={{ color: oi === 0 ? 'transparent' : c.t3 }}
                    ><ChevronUp size={9} /></Button>
                    <Button variant="ghost" type="button"
                      onClick={() => {
                        const opts = [...(field.options ?? [])];
                        if (oi < opts.length - 1) { [opts[oi], opts[oi + 1]] = [opts[oi + 1], opts[oi]]; updateField(i, { options: opts }); }
                      }}
                      disabled={oi === (field.options ?? []).length - 1}
                      className="h-[13px] w-4 p-0 rounded-none"
                      style={{ color: oi === (field.options ?? []).length - 1 ? 'transparent' : c.t3 }}
                    ><ChevronDown size={9} /></Button>
                  </div>
                  <Input
                    value={opt}
                    onChange={e => {
                      const opts = [...(field.options ?? [])];
                      opts[oi] = e.target.value;
                      updateField(i, { options: opts });
                    }}
                    placeholder={`Option ${oi + 1}…`}
                    className="flex-1 h-7 text-[var(--text-xs)] focus-visible:ring-0"
                    style={{ backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, fontFamily: 'inherit' }}
                  />
                  <Button variant="ghost" size="icon" type="button"
                    onClick={() => updateField(i, { options: (field.options ?? []).filter((_, j) => j !== oi) })}
                    className="h-[22px] w-[22px] flex-shrink-0 rounded"
                    style={{ color: c.t3 }}
                  ><Trash2 size={10} /></Button>
                </div>
              ))}
              <Button variant="outline" type="button"
                onClick={() => updateField(i, { options: [...(field.options ?? []), ''] })}
                className="h-6 gap-1 text-[11px]"
                style={{ borderStyle: 'dashed', fontFamily: 'inherit', color: c.t2 }}
              ><Plus size={10} /> Add Option</Button>
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" type="button" onClick={addField}
        className="h-7 gap-1.5"
        style={{ borderStyle: 'dashed', fontSize: 'var(--text-xs)', fontFamily: 'inherit', color: c.t2 }}
      ><Plus size={11} /> Add Field</Button>
    </div>
  );
}

// ─── TargetCard ───────────────────────────────────────────────────────────────

const DEFAULT_PHASE_PROGRESSION: PhaseProgressionConfig = {
  enabled: false,
  rules: [],
  masteredBehavior: { hideFromActive: false, moveToCompleted: true, keepVisible: false },
  startReviewAfterMastery: false,
  allowManualOverride: true,
};

function TargetCard({ target, index, expanded, onToggle, onUpdate, onRemove, readOnly = false, c, isDark }: {
  target: Target; index: number; expanded: boolean;
  onToggle: () => void; onUpdate: (t: Target) => void; onRemove: () => void;
  readOnly?: boolean; c: AppColors; isDark: boolean;
}) {
  const [showProgressionModal, setShowProgressionModal] = useState(false);
  const [showPromptFadingModal, setShowPromptFadingModal] = useState(false);
  const [promptFadingError, setPromptFadingError]         = useState('');

  const updateConfig = (updates: Partial<TargetConfig>) =>
    onUpdate({ ...target, config: { ...target.config, ...updates } });

  const progression = target.phaseProgression ?? DEFAULT_PHASE_PROGRESSION;

  // Prompt fading
  const fadingConfig: PromptFadingConfig = target.promptFading ?? DEFAULT_PROMPT_FADING_CONFIG;
  const showPromptFadingToggle =
    target.dataType === 'Task Analysis' || target.dataType === 'Custom Prompt';
  const currentPrompts = target.config.prompts ?? [];
  const hasPassPrompt  = currentPrompts.some(p => p.passFail === 'pass');

  function handlePromptFadingToggle(enabled: boolean) {
    setPromptFadingError('');
    if (!enabled) {
      // Disable — just turn it off
      onUpdate({ ...target, promptFading: { ...fadingConfig, enabled: false } });
      return;
    }
    // Enable — validate first
    if (!hasPassPrompt) {
      setPromptFadingError(
        'You must mark at least one prompt level as "Pass" to enable Prompt Fading.',
      );
      return;
    }
    // Open modal to configure (toggle will revert if modal is closed without saving)
    setShowPromptFadingModal(true);
  }

  function handlePromptFadingModalClose() {
    // If fading was not yet enabled, revert the toggle back to OFF
    if (!fadingConfig.enabled) {
      // Nothing to revert in target state — modal was opened before save, so enabled is still false
    }
    setShowPromptFadingModal(false);
  }

  function handlePromptFadingSave(
    config: PromptFadingConfig,
    startingLevel: string,
    orderedActivePrompts: import('./ProgramTemplatesPage').PromptDefinition[],
  ) {
    // Sync prompt order: active prompts first (in flow order), then removed prompts at the bottom
    const removedCodes = config.excludedPromptCodes ?? [];
    const removedPrompts = currentPrompts.filter(p => removedCodes.includes(p.code));
    // Build merged list: ordered active prompts (which may be a subset of currentPrompts)
    // followed by any removed ones. Preserve any extra prompts not in the flow list.
    const activeIds = new Set(orderedActivePrompts.map(p => p.id));
    const extraActive = currentPrompts.filter(p => !activeIds.has(p.id) && !removedCodes.includes(p.code));
    const syncedPrompts = [...orderedActivePrompts, ...extraActive, ...removedPrompts];

    onUpdate({
      ...target,
      promptFading:       config,
      currentPromptLevel: startingLevel,
      config: {
        ...target.config,
        prompts: syncedPrompts,
      },
    });
    setPromptFadingError('');
  }

  const inputStyle: React.CSSProperties = {
    height: 32, fontSize: 'var(--text-base)', fontFamily: 'inherit',
    backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0,
    borderRadius: 'var(--radius-button)',
  };

  const selectTriggerStyle: React.CSSProperties = {
    fontSize: 'var(--text-base)', fontFamily: 'inherit',
    backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0,
    borderRadius: 'var(--radius-button)', height: 32,
  };

  const numberInputStyle: React.CSSProperties = {
    height: 32, width: '100%', padding: '0 10px', borderRadius: 'var(--radius-button)',
    border: `1px solid ${c.inputBorder}`, backgroundColor: c.inputBg, color: c.t0,
    fontSize: 'var(--text-base)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const showPromptsSection  = target.dataType === 'Task Analysis' || target.dataType === 'Custom Prompt';
  const showTasksSection    = target.dataType === 'Task Analysis';
  const showDurationSection = target.dataType === 'Duration';
  const showIntervalSection = target.dataType === 'Partial Interval' || target.dataType === 'Whole Interval';
  const showCustomForm      = target.dataType === 'Custom';
  const hasConfigSection    = showPromptsSection || showTasksSection || showDurationSection || showIntervalSection || showCustomForm;

  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>
      {/* ── Collapsed header ── */}
      <div onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
          cursor: 'pointer', userSelect: 'none',
          backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)'}
      >
        <span style={{ minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: c.t2, fontFamily: 'inherit', flexShrink: 0 }}>
          {index + 1}
        </span>
        {/* Color dot */}
        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: target.color || '#9CA3AF', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', color: target.name ? c.t0 : c.t3, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {target.name || 'New Target'}
        </span>
        {target.dataType && (
          <span style={{ fontSize: 10, color: c.t3, fontFamily: 'inherit', backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {target.dataType}
          </span>
        )}
        {!readOnly && (
          <Button variant="ghost" size="icon" type="button"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="h-[22px] w-[22px] flex-shrink-0 rounded-[5px]"
            style={{ color: c.t3 }}
            title="Remove target"
          ><Trash2 style={{ width: 12, height: 12 }} /></Button>
        )}
        {expanded ? <ChevronUp style={{ width: 13, height: 13, color: c.t3, flexShrink: 0 }} /> : <ChevronDown style={{ width: 13, height: 13, color: c.t3, flexShrink: 0 }} />}
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ padding: '14px 12px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${c.divider}`, ...(readOnly ? { pointerEvents: 'none', opacity: 0.75 } : {}) }}>

          {/* Row 1: Name + Color */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <FieldGroup label="Target Name" required>
                <Input
                  value={target.name}
                  onChange={e => onUpdate({ ...target, name: e.target.value })}
                  placeholder="e.g. Eye Contact"
                  className="focus-visible:ring-0 focus-visible:border-ring/60"
                  style={inputStyle}
                />
              </FieldGroup>
            </div>
          </div>

          {/* Color */}
          <FieldGroup label="Color">
            <ColorPicker value={target.color} onChange={color => onUpdate({ ...target, color })} small />
          </FieldGroup>

          {/* Row 2: Data Type + Phase */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FieldGroup label="Data Type" required>
              <Select value={target.dataType} onValueChange={val => { setPromptFadingError(''); onUpdate({ ...target, dataType: val as DataType, config: {} }); }}>
                <SelectTrigger className="focus-visible:ring-0" style={selectTriggerStyle}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map(dt => <SelectItem key={dt} value={dt} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)' }}>{dt}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Phase" required>
              <Select value={target.phase} onValueChange={val => onUpdate({ ...target, phase: val })}>
                <SelectTrigger className="focus-visible:ring-0" style={selectTriggerStyle}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_PHASES.map(ph => <SelectItem key={ph} value={ph} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)' }}>{ph}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>

          {/* SD */}
          <FieldGroup label="SD – Stimulus Description">
            <Input
              value={target.sd}
              onChange={e => onUpdate({ ...target, sd: e.target.value })}
              placeholder="e.g. Look at me"
              className="focus-visible:ring-0 focus-visible:border-ring/60"
              style={inputStyle}
            />
          </FieldGroup>

          {/* Objective */}
          <FieldGroup label="Objective">
            <Input
              value={target.objective}
              onChange={e => onUpdate({ ...target, objective: e.target.value })}
              placeholder="e.g. 80% correct for 3 consecutive sessions"
              className="focus-visible:ring-0 focus-visible:border-ring/60"
              style={inputStyle}
            />
          </FieldGroup>

          {/* Description */}
          <FieldGroup label="Description" hint="(optional)">
            <Textarea
              value={target.description || ''}
              onChange={e => onUpdate({ ...target, description: e.target.value })}
              placeholder="Clinical notes, procedure details…"
              rows={2}
              className="focus-visible:ring-0 resize-none focus-visible:border-ring/60"
              style={{ fontSize: 'var(--text-base)', fontFamily: 'inherit', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, borderRadius: 'var(--radius-button)', padding: '6px 10px' }}
            />
          </FieldGroup>

          {/* ── Data-type-specific configuration ── */}
          {hasConfigSection && (
            <>
              <SectionDivider label="Configuration" c={c} />

              {/* Prompts section (Task Analysis + Custom Prompt) */}
              {showPromptsSection && (
                <FieldGroup label="Prompts" hint="shown as codes during data collection">
                  <div style={{ marginTop: 2 }}>
                    {/* Use default prompts button if empty */}
                    {(target.config.prompts ?? []).length === 0 && (
                      <Button variant="outline" type="button"
                        onClick={() => updateConfig({ prompts: DEFAULT_PROMPTS.map(p => ({ ...p })) })}
                        className="h-7 gap-1.5 mb-2"
                        style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', color: c.t2 }}
                      >
                        Load defaults (I, G, V, M, PP, FP)
                      </Button>
                    )}
                    <PromptsEditor
                      prompts={target.config.prompts ?? []}
                      onChange={prompts => updateConfig({ prompts })}
                      c={c} isDark={isDark}
                    />
                  </div>
                </FieldGroup>
              )}

              {/* Tasks section (Task Analysis only) */}
              {showTasksSection && (
                <FieldGroup label="Tasks" hint="steps performed in sequence">
                  <div style={{ marginTop: 2 }}>
                    <TasksEditor
                      tasks={target.config.tasks ?? []}
                      onChange={tasks => updateConfig({ tasks })}
                      c={c}
                    />
                  </div>
                </FieldGroup>
              )}

              {/* Duration settings */}
              {showDurationSection && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FieldGroup label="Min Duration" hint="(sec, optional)">
                    <Input type="number" min={0}
                      value={target.config.minDuration ?? ''}
                      onChange={e => updateConfig({ minDuration: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      placeholder="e.g. 30"
                      className="focus-visible:ring-0"
                      style={numberInputStyle}
                    />
                  </FieldGroup>
                  <FieldGroup label="Max Duration" hint="(sec, auto-stop)">
                    <Input type="number" min={0}
                      value={target.config.maxDuration ?? ''}
                      onChange={e => updateConfig({ maxDuration: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      placeholder="e.g. 120"
                      className="focus-visible:ring-0"
                      style={numberInputStyle}
                    />
                  </FieldGroup>
                </div>
              )}

              {/* Interval settings */}
              {showIntervalSection && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <FieldGroup label="Total Duration" hint="(sec)">
                      <Input type="number" min={1}
                        value={target.config.totalDuration ?? ''}
                        onChange={e => updateConfig({ totalDuration: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        placeholder="e.g. 300"
                        className="focus-visible:ring-0"
                        style={numberInputStyle}
                      />
                    </FieldGroup>
                    <FieldGroup label="Num. Intervals">
                      <Input type="number" min={2} max={60}
                        value={target.config.numIntervals ?? ''}
                        onChange={e => updateConfig({ numIntervals: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        placeholder="e.g. 10"
                        className="focus-visible:ring-0"
                        style={numberInputStyle}
                      />
                    </FieldGroup>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button"
                      onClick={() => updateConfig({ soundAlert: !target.config.soundAlert })}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                        backgroundColor: target.config.soundAlert ? '#4F83CC' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.14)'),
                        position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', backgroundColor: '#fff',
                        position: 'absolute', top: 3, transition: 'left 0.2s',
                        left: target.config.soundAlert ? 19 : 3,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
                      }} />
                    </button>
                    <span style={{ fontSize: 'var(--text-xs)', color: c.t2, fontFamily: 'inherit' }}>Sound alert at end of each interval</span>
                  </div>
                  {target.config.totalDuration && target.config.numIntervals && (
                    <p style={{ fontSize: 10, color: c.t3, margin: 0, fontFamily: 'inherit' }}>
                      Each interval: {Math.floor(target.config.totalDuration / target.config.numIntervals)}s
                    </p>
                  )}
                </>
              )}

              {/* Custom form builder */}
              {showCustomForm && (
                <FieldGroup label="Form Fields">
                  <div style={{ marginTop: 4 }}>
                    <CustomFormBuilder
                      fields={target.config.formFields ?? []}
                      onChange={formFields => updateConfig({ formFields })}
                      c={c} isDark={isDark}
                    />
                  </div>
                </FieldGroup>
              )}
            </>
          )}

          {/* ── Prompt Fading ── */}
          {showPromptFadingToggle && (
            <>
              <SectionDivider label="Prompt Fading" c={c} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <Label style={{ fontSize: 'var(--text-base)', fontFamily: 'inherit', color: c.t0, fontWeight: 'var(--font-weight-medium)' }}>
                    Enable Prompt Fading
                  </Label>
                  <p style={{ fontSize: 'var(--text-xs)', color: c.t3, fontFamily: 'inherit', margin: 0, marginTop: 1 }}>
                    Automatically adjust prompt level based on trial performance
                  </p>
                </div>
                <Switch
                  checked={fadingConfig.enabled}
                  className="data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-600"
                  onCheckedChange={handlePromptFadingToggle}
                />
              </div>

              {promptFadingError && (
                <p style={{
                  margin: 0, fontSize: 'var(--text-xs)', fontFamily: 'inherit',
                  color: isDark ? '#f87171' : '#c0392b',
                  padding: '6px 10px', borderRadius: 6,
                  backgroundColor: isDark ? 'rgba(220,38,38,0.10)' : 'rgba(220,38,38,0.07)',
                  border: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : 'rgba(220,38,38,0.18)'}`,
                }}>
                  {promptFadingError}
                </p>
              )}

              {fadingConfig.enabled && (() => {
                // Build active flow (prompts not in excluded list), in current order
                const excludedCodes = fadingConfig.excludedPromptCodes ?? [];
                const flowPrompts   = currentPrompts.filter(p => !excludedCodes.includes(p.code));
                const flowText      = flowPrompts.length > 0
                  ? flowPrompts.map(p => p.name).join(' → ')
                  : currentPrompts.map(p => p.name).join(' → ');
                const fadeAccPct    = Math.round((fadingConfig.accuracyThreshold ?? 0.8) * 100);
                const fadeTrials    = fadingConfig.minTrials ?? fadingConfig.windowSize ?? 3;
                const fadeSessions  = fadingConfig.minSessions ?? 1;
                const regAccPct     = Math.round((fadingConfig.regressionThreshold ?? 0.5) * 100);
                const regTrials     = fadingConfig.regressionWindowSize ?? 3;
                const rowStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
                const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: c.t3, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em' };
                const valueStyle: React.CSSProperties = { fontSize: 12, color: c.t1, fontFamily: 'inherit' };
                return (
                  <div style={{
                    borderRadius: 'var(--radius-button)',
                    backgroundColor: isDark ? 'rgba(79,131,204,0.08)' : 'rgba(79,131,204,0.05)',
                    border: `1px solid ${isDark ? 'rgba(79,131,204,0.2)' : 'rgba(79,131,204,0.15)'}`,
                    padding: '10px 12px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2E9E63', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.t0, fontFamily: 'inherit' }}>
                          Prompt Fading Active
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        type="button"
                        className="h-6 text-xs px-2.5"
                        style={{ fontFamily: 'inherit', color: c.t2, borderColor: c.border, flexShrink: 0 }}
                        onClick={() => setShowPromptFadingModal(true)}
                      >
                        Edit
                      </Button>
                    </div>

                    {/* Flow */}
                    <div style={rowStyle}>
                      <span style={labelStyle}>Flow</span>
                      <span style={valueStyle}>{flowText}</span>
                    </div>

                    {/* Move Forward */}
                    <div style={rowStyle}>
                      <span style={labelStyle}>Move Forward</span>
                      <span style={valueStyle}>
                        ≥{fadeAccPct}% over {fadeTrials} trial{fadeTrials !== 1 ? 's' : ''}
                        {fadeSessions > 1 ? ` and ${fadeSessions} sessions` : ''}
                      </span>
                    </div>

                    {/* Move Backward */}
                    <div style={rowStyle}>
                      <span style={labelStyle}>Move Backward</span>
                      <span style={valueStyle}>
                        {fadingConfig.regressionEnabled
                          ? `<${regAccPct}% over ${regTrials} trial${regTrials !== 1 ? 's' : ''}`
                          : 'Disabled'}
                      </span>
                    </div>

                    {/* Current level */}
                    {target.currentPromptLevel && (
                      <div style={rowStyle}>
                        <span style={labelStyle}>Current Level</span>
                        <span style={{ ...valueStyle, fontFamily: 'monospace', fontWeight: 700 }}>
                          {target.currentPromptLevel}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <PromptFadingModal
                open={showPromptFadingModal}
                onClose={handlePromptFadingModalClose}
                prompts={currentPrompts}
                config={fadingConfig}
                startingLevel={target.currentPromptLevel ?? currentPrompts[0]?.code ?? ''}
                onSave={handlePromptFadingSave}
                targetName={target.name || 'New Target'}
              />
            </>
          )}

          {/* ── Phase Progression ── */}
          <SectionDivider label="Phase Progression" c={c} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <Label style={{ fontSize: 'var(--text-base)', fontFamily: 'inherit', color: c.t0, fontWeight: 'var(--font-weight-medium)' }}>
                Automatic Level Progression
              </Label>
              <p style={{ fontSize: 'var(--text-xs)', color: c.t3, fontFamily: 'inherit', margin: 0, marginTop: 1 }}>
                Auto-advance phases based on performance criteria
              </p>
            </div>
            <Switch
              checked={progression.enabled}
              className="data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-600"
              onCheckedChange={enabled => {
                const next = { ...progression, enabled };
                onUpdate({ ...target, phaseProgression: next });
                // Only open modal automatically on first enable (no rules configured yet)
                if (enabled && progression.rules.filter(r => r.enabled).length === 0) {
                  setShowProgressionModal(true);
                }
              }}
            />
          </div>
          {progression.enabled && (() => {
            const activeCount = progression.rules.filter(r => r.enabled).length;
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '8px 10px', borderRadius: 'var(--radius-button)',
                backgroundColor: isDark ? 'rgba(79,131,204,0.08)' : 'rgba(79,131,204,0.06)',
                border: `1px solid ${isDark ? 'rgba(79,131,204,0.2)' : 'rgba(79,131,204,0.15)'}`,
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: c.t2, fontFamily: 'inherit' }}>
                  {activeCount === 0
                    ? 'No transitions configured'
                    : `${activeCount} transition${activeCount !== 1 ? 's' : ''} configured`}
                </span>
                <Button
                  variant="outline"
                  type="button"
                  className="h-6 text-xs px-2.5"
                  style={{ fontFamily: 'inherit', color: c.t2, borderColor: c.border }}
                  onClick={() => setShowProgressionModal(true)}
                >
                  Edit Configuration
                </Button>
              </div>
            );
          })()}

          <PhaseProgressionModal
            open={showProgressionModal}
            onClose={() => setShowProgressionModal(false)}
            phases={[...DEFAULT_PHASES]}
            config={progression}
            onChange={cfg => onUpdate({ ...target, phaseProgression: cfg })}
            targetName={target.name || 'New Target'}
            dataType={target.dataType}
          />
        </div>
      )}
    </div>
  );
}

// ─── CreateCategoryModal ──────────────────────────────────────────────────────

function CreateCategoryModal({ open, onClose, onSave, c }: {
  open: boolean; onClose: () => void;
  onSave: (cat: Category) => void;
  c: AppColors; isDark?: boolean;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4F83CC');
  const [iconId, setIconId] = useState('star');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: `cat-${Date.now()}`, name: name.trim(), color, iconId, isDefault: false });
    setName(''); setColor('#4F83CC'); setIconId('star');
    onClose();
  };

  const inputStyle: React.CSSProperties = { height: 32, fontSize: 'var(--text-base)', fontFamily: 'inherit', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, borderRadius: 'var(--radius-button)' };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="overflow-hidden"
        style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', padding: 0, gap: 0, maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}
      >
        <DialogHeader style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${c.divider}` }}>
          <DialogTitle style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'inherit', color: c.t0 }}>Create Category</DialogTitle>
          <DialogDescription style={{ fontSize: 'var(--text-xs)', color: c.t3, fontFamily: 'inherit' }}>Add a custom category for organizing program templates.</DialogDescription>
        </DialogHeader>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-button)', backgroundColor: `${color}12`, border: `1px solid ${color}30` }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: `${color}22`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconShape id={iconId} size={14} color={color} />
            </div>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'inherit', color: color || c.t2 }}>{name || 'Category Name'}</span>
          </div>
          <FieldGroup label="Category Name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Communication" className="focus-visible:ring-0 focus-visible:border-ring/60" style={inputStyle} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </FieldGroup>
          <FieldGroup label="Color"><ColorPicker value={color} onChange={setColor} /></FieldGroup>
          <FieldGroup label="Icon"><IconPicker value={iconId} onChange={setIconId} c={c} /></FieldGroup>
        </div>
        <DialogFooter style={{ padding: '12px 20px', borderTop: `1px solid ${c.divider}`, display: 'flex', justifyContent: 'flex-end', gap: 8, flexDirection: 'row' }}>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)', color: c.t2 }}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)', backgroundColor: name.trim() ? c.btnPrimBg : undefined, color: name.trim() ? c.btnPrimText : undefined }}>Create Category</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CreateStatusModal ────────────────────────────────────────────────────────

function CreateStatusModal({ open, onClose, onSave, c }: {
  open: boolean; onClose: () => void;
  onSave: (status: TemplateStatus) => void; c: AppColors;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4F83CC');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: `status-${Date.now()}`, name: name.trim(), color, isDefault: false });
    setName(''); setColor('#4F83CC');
    onClose();
  };

  const inputStyle: React.CSSProperties = { height: 32, fontSize: 'var(--text-base)', fontFamily: 'inherit', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, borderRadius: 'var(--radius-button)' };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="overflow-hidden"
        style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', padding: 0, gap: 0, maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}
      >
        <DialogHeader style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${c.divider}` }}>
          <DialogTitle style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'inherit', color: c.t0 }}>Create Status</DialogTitle>
          <DialogDescription style={{ fontSize: 'var(--text-xs)', color: c.t3, fontFamily: 'inherit' }}>Add a custom status to track template progress.</DialogDescription>
        </DialogHeader>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'inherit', backgroundColor: `${color}18`, color }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              {name || 'Status Name'}
            </span>
          </div>
          <FieldGroup label="Status Name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Draft" className="focus-visible:ring-0 focus-visible:border-ring/60" style={inputStyle} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </FieldGroup>
          <FieldGroup label="Color"><ColorPicker value={color} onChange={setColor} /></FieldGroup>
        </div>
        <DialogFooter style={{ padding: '12px 20px', borderTop: `1px solid ${c.divider}`, display: 'flex', justifyContent: 'flex-end', gap: 8, flexDirection: 'row' }}>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)', color: c.t2 }}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)', backgroundColor: name.trim() ? c.btnPrimBg : undefined, color: name.trim() ? c.btnPrimText : undefined }}>Create Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ProgramTemplateSheet ─────────────────────────────────────────────────────

export interface ProgramTemplateSheetProps {
  isOpen: boolean; onClose: () => void;
  onSave: (data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>, editId?: string) => void;
  editTemplate?: ProgramTemplate | null;
  /** When true: all fields are read-only, save button is hidden, title shows "View Program" */
  readOnly?: boolean;
  categories: Category[]; statuses: TemplateStatus[];
  onCreateCategory: (cat: Category) => void;
  onCreateStatus: (status: TemplateStatus) => void;
}

interface FormData {
  title: string; description: string; categoryId: string; color: string; statusId: string; targets: Target[];
}

export function ProgramTemplateSheet({
  isOpen, onClose, onSave, editTemplate, readOnly = false, categories, statuses, onCreateCategory, onCreateStatus,
}: ProgramTemplateSheetProps) {
  const { colors: c, isDark } = useTheme();

  const [formData, setFormData]               = useState<FormData>({ title: '', description: '', categoryId: '', color: '#4F83CC', statusId: '', targets: [] });
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [createCatOpen, setCreateCatOpen]     = useState(false);
  const [createStatusOpen, setCreateStatusOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editTemplate) {
      setFormData({
        title: editTemplate.title, description: editTemplate.description || '',
        categoryId: editTemplate.categoryId, color: editTemplate.color,
        statusId: editTemplate.statusId,
        targets: editTemplate.targets.map(t => ({ ...t, config: { ...t.config } })),
      });
      setExpandedTargets(new Set(editTemplate.targets.map(t => t.id)));
    } else {
      const defStatus = statuses.find(s => s.id === 'in-progress') ?? statuses[0];
      setFormData({ title: '', description: '', categoryId: categories[0]?.id ?? '', color: '#4F83CC', statusId: defStatus?.id ?? '', targets: [] });
      setExpandedTargets(new Set());
    }
  }, [isOpen, editTemplate]);

  const addTarget = () => {
    const id = `t-${Date.now()}`;
    const newTarget: Target = { id, name: '', color: '#4F83CC', dataType: 'Percent Correct', sd: '', objective: '', description: '', phase: 'Baseline', config: {} };
    setFormData(prev => ({ ...prev, targets: [...prev.targets, newTarget] }));
    setExpandedTargets(prev => new Set([...prev, id]));
  };

  const updateTarget = (id: string, updated: Target) =>
    setFormData(prev => ({ ...prev, targets: prev.targets.map(t => t.id === id ? updated : t) }));

  const removeTarget = (id: string) => {
    setFormData(prev => ({ ...prev, targets: prev.targets.filter(t => t.id !== id) }));
    setExpandedTargets(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleTarget = (id: string) =>
    setExpandedTargets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave({ title: formData.title.trim(), description: formData.description.trim() || undefined, categoryId: formData.categoryId, color: formData.color, statusId: formData.statusId, targets: formData.targets }, editTemplate?.id);
    onClose();
  };

  const taskAnalysisEmpty = formData.targets.some(
    t => t.dataType === 'Task Analysis' && (t.config.tasks ?? []).length === 0,
  );
  const isValid = formData.title.trim().length > 0 && !taskAnalysisEmpty;
  const isEdit  = !!editTemplate;

  const inputStyle: React.CSSProperties = { height: 32, fontSize: 'var(--text-base)', fontFamily: 'inherit', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, borderRadius: 'var(--radius-button)' };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={v => !v && onClose()}>
        <SheetContent side="right" className="p-0 flex flex-col sm:max-w-none focus:outline-none [&>button]:hidden"
          style={{ width: 560, maxWidth: '94vw', backgroundColor: c.surface, borderLeft: `1px solid ${c.border}` }}
        >
          {/* Header */}
          <SheetHeader style={{ padding: '14px 20px 13px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <SheetTitle style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'inherit', color: c.t0, lineHeight: 1.3 }}>
                  {readOnly ? 'View Program' : isEdit ? 'Edit Template' : 'New Program Template'}
                </SheetTitle>
                <SheetDescription style={{ fontSize: 'var(--text-xs)', color: c.t3, fontFamily: 'inherit', marginTop: 2 }}>
                  {readOnly ? 'Read-only view of this program.' : isEdit ? 'Update the program template details and targets.' : 'Create a reusable template to assign to learners.'}
                </SheetDescription>
              </div>
              <Button variant="ghost" size="icon" type="button" onClick={onClose}
                className="h-7 w-7 rounded-md flex-shrink-0 ml-3"
                style={{ color: c.t3 }}
              ><X style={{ width: 15, height: 15 }} /></Button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

            <SectionDivider label="Template Details" c={c} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, marginTop: 10 }}>
              <FieldGroup label="Template Title" required={!readOnly}>
                <Input value={formData.title} onChange={readOnly ? undefined : e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Social Skills Group" disabled={readOnly} className="focus-visible:ring-0 focus-visible:border-ring/60" style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="Description" hint={readOnly ? undefined : '(optional)'}>
                <Textarea value={formData.description} onChange={readOnly ? undefined : e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe this program template…" rows={2} disabled={readOnly} className="focus-visible:ring-0 resize-none focus-visible:border-ring/60" style={{ fontSize: 'var(--text-base)', fontFamily: 'inherit', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.t0, borderRadius: 'var(--radius-button)', padding: '6px 10px' }} />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label="Category">
                  <ComboSelect
                    value={formData.categoryId}
                    options={categories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
                    placeholder="Select category…"
                    onChange={readOnly ? () => {} : categoryId => setFormData(p => ({ ...p, categoryId }))}
                    onCreateClick={readOnly ? () => {} : () => setCreateCatOpen(true)}
                    createLabel={readOnly ? undefined : 'New Category'}
                    disabled={readOnly}
                    c={c} isDark={isDark}
                  />
                </FieldGroup>
                <FieldGroup label="Status">
                  <ComboSelect
                    value={formData.statusId}
                    options={statuses.map(s => ({ id: s.id, name: s.name, color: s.color }))}
                    placeholder="Select status…"
                    onChange={readOnly ? () => {} : statusId => setFormData(p => ({ ...p, statusId }))}
                    onCreateClick={readOnly ? () => {} : () => setCreateStatusOpen(true)}
                    createLabel={readOnly ? undefined : 'New Status'}
                    disabled={readOnly}
                    c={c} isDark={isDark}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Color">
                <ColorPicker value={formData.color} onChange={readOnly ? () => {} : color => setFormData(p => ({ ...p, color }))} disabled={readOnly} />
              </FieldGroup>
            </div>

            <SectionDivider label="Targets" c={c} />
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formData.targets.length === 0 && (
                <div style={{ padding: '16px 0', textAlign: 'center', color: c.t3, fontSize: 'var(--text-xs)', fontFamily: 'inherit' }}>
                  No targets yet. Add one to define data collection for this program.
                </div>
              )}
              {formData.targets.map((target, idx) => (
                <TargetCard
                  key={target.id} target={target} index={idx}
                  expanded={expandedTargets.has(target.id)}
                  onToggle={() => toggleTarget(target.id)}
                  onUpdate={readOnly ? () => {} : updated => updateTarget(target.id, updated)}
                  onRemove={readOnly ? () => {} : () => removeTarget(target.id)}
                  readOnly={readOnly}
                  c={c} isDark={isDark}
                />
              ))}
              {!readOnly && (
                <Button variant="outline" type="button" onClick={addTarget}
                  className="h-[34px] w-full gap-1.5 justify-center"
                  style={{ borderStyle: 'dashed', fontSize: 'var(--text-base)', fontFamily: 'inherit', color: c.t2 }}
                >
                  <Plus style={{ width: 13, height: 13 }} /> Add Target
                </Button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid ${c.border}`, backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}>
            {taskAnalysisEmpty && !readOnly && (
              <p style={{ margin: '0 0 8px', fontSize: 11, color: isDark ? '#f87171' : '#c0392b', fontFamily: 'inherit' }}>
                Please add at least one task to create this target.
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)', color: c.t2 }}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {!readOnly && (
              <Button size="sm" onClick={handleSave} disabled={!isValid}
                style={{ fontFamily: 'inherit', fontSize: 'var(--text-base)', backgroundColor: isValid ? c.btnPrimBg : undefined, color: isValid ? c.btnPrimText : undefined, paddingLeft: 16, paddingRight: 16 }}
              >
                {isEdit ? 'Save Changes' : 'Create Template'}
              </Button>
            )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateCategoryModal open={createCatOpen} onClose={() => setCreateCatOpen(false)} onSave={cat => { onCreateCategory(cat); setFormData(p => ({ ...p, categoryId: cat.id })); }} c={c} isDark={isDark} />
      <CreateStatusModal open={createStatusOpen} onClose={() => setCreateStatusOpen(false)} onSave={status => { onCreateStatus(status); setFormData(p => ({ ...p, statusId: status.id })); }} c={c} />
    </div>
  );
}
