import React, { useState } from 'react';
import {
  Search, Plus, ListFilter, MoreVertical, Pencil, Trash2, Copy,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProgramTemplates } from '../context/ProgramTemplatesContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from './ui/table';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { ProgramTemplateSheet } from './ProgramTemplateSheet';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataType =
  | 'Percent Correct' | 'Frequency' | 'Task Analysis'
  | 'Custom Prompt' | 'Duration' | 'Text Anecdotal'
  | 'Rate' | 'Partial Interval' | 'Whole Interval' | 'Custom';

export const DATA_TYPES: DataType[] = [
  'Percent Correct', 'Frequency', 'Task Analysis',
  'Custom Prompt', 'Duration', 'Text Anecdotal',
  'Rate', 'Partial Interval', 'Whole Interval', 'Custom',
];

export const DEFAULT_PHASES = [
  'Baseline', 'Intervention', 'Maintenance', 'Generalization', 'Mastery',
] as const;

// ─── Prompt / Task / Form field definitions ───────────────────────────────────

export interface PromptDefinition {
  id:       string;
  name:     string;
  code:     string;        // 2-3 char code, e.g. "I", "G", "PP", "FP"
  passFail: 'pass' | 'fail';
}

export interface TaskDefinition {
  id:   string;
  name: string;
}

export interface FormFieldDef {
  id:       string;
  type:     'text' | 'number' | 'checkbox_group' | 'radio_group';
  label:    string;
  options?: string[];
}

export interface TargetConfig {
  // Task Analysis + Custom Prompt share prompts
  prompts?:       PromptDefinition[];
  // Task Analysis only
  tasks?:         TaskDefinition[];
  // Duration
  minDuration?:   number;   // seconds
  maxDuration?:   number;   // seconds
  // Partial / Whole Interval
  totalDuration?: number;   // seconds
  numIntervals?:  number;
  soundAlert?:    boolean;
  // Custom form
  formFields?:    FormFieldDef[];
}

export interface PhaseTransitionRule {
  fromPhase: string;
  toPhase: string;
  enabled: boolean;
  accuracyThreshold: number;       // 0-100 %
  consecutiveSessions: number;
  minTrialsPerSession: number;
  metricType: 'Accuracy' | 'Frequency' | 'Duration' | 'Task Completion';
  minProviders: number;
  onFailure: 'reset' | 'allow_one';
  autoMove: boolean;
  requireConfirmation: boolean;
  delay: 'immediately' | 'after_sessions';
  delaySessionCount?: number;
  /** Regression: if enabled, revert to fromPhase when scores drop for regressionSessions */
  regressionEnabled?: boolean;
  /** Score below which a session counts as a regression failure (default: accuracyThreshold - 20) */
  regressionThreshold?: number;
  /** Number of consecutive sessions below regressionThreshold before reverting (default: 2) */
  regressionSessions?: number;
}

export interface PhaseProgressionConfig {
  enabled: boolean;
  rules: PhaseTransitionRule[];
  masteredBehavior: {
    hideFromActive: boolean;
    moveToCompleted: boolean;
    keepVisible: boolean;
  };
  startReviewAfterMastery: boolean;
  allowManualOverride: boolean;
}

export const DEFAULT_PROMPTS: PromptDefinition[] = [
  { id: 'p-i',  name: 'Independent',      code: 'I',  passFail: 'pass' },
  { id: 'p-g',  name: 'Gesture',          code: 'G',  passFail: 'fail' },
  { id: 'p-v',  name: 'Verbal',           code: 'V',  passFail: 'fail' },
  { id: 'p-m',  name: 'Model',            code: 'M',  passFail: 'fail' },
  { id: 'p-pp', name: 'Partial Physical', code: 'PP', passFail: 'fail' },
  { id: 'p-fp', name: 'Full Physical',    code: 'FP', passFail: 'fail' },
];

export interface Target {
  id:           string;
  name:         string;
  color:        string;
  dataType:     DataType;
  sd:           string;       // Stimulus Description
  objective:    string;
  description?: string;
  phase:        string;
  config:       TargetConfig;
  phaseProgression?: PhaseProgressionConfig;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  iconId?: string;
  isDefault: boolean;
}

export interface TemplateStatus {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

export interface ProgramTemplate {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  color: string;
  statusId: string;
  targets: Target[];
  lastUpdated: Date;
}

// ─── Default data (kept for re-exports used by other components) ──────────────

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'skill',    name: 'Skill',    color: '#4F83CC', isDefault: true },
  { id: 'behavior', name: 'Behavior', color: '#E07B39', isDefault: true },
];

export const DEFAULT_STATUSES: TemplateStatus[] = [
  { id: 'disconnected', name: 'Disconnected', color: '#9CA3AF', isDefault: true },
  { id: 'not-active',   name: 'Not Active',   color: '#6B7280', isDefault: true },
  { id: 'in-progress',  name: 'In Progress',  color: '#4F83CC', isDefault: true },
  { id: 'on-hold',      name: 'On Hold',      color: '#E07B39', isDefault: true },
  { id: 'met',          name: 'Met',          color: '#2E9E63', isDefault: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: TemplateStatus | undefined }) {
  if (!status) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'inherit',
      backgroundColor: `${status.color}18`, color: status.color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: status.color, flexShrink: 0 }} />
      {status.name}
    </span>
  );
}

// ─── CategoryBadge ────────────────────────────────────────────────────────────

export function CategoryBadge({ category }: { category: Category | undefined }) {
  if (!category) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'inherit',
      backgroundColor: `${category.color}15`, color: category.color, whiteSpace: 'nowrap',
    }}>
      {category.name}
    </span>
  );
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────

function RowMenu({ template, onEdit, onDelete, onDuplicate }: {
  template: ProgramTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            borderRadius: 'var(--radius-button)',
            border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--muted-foreground)', outline: 'none',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          aria-label={`Options for ${template.title}`}
        >
          <MoreVertical style={{ width: 16, height: 16 }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil style={{ width: 13, height: 13 }} /> Edit template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy style={{ width: 13, height: 13 }} /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 style={{ width: 13, height: 13 }} /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgramTemplatesPage() {
  const { colors, isDark } = useTheme();
  const {
    templates, categories, statuses,
    addTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
    addCategory, addStatus,
  } = useProgramTemplates();

  const [search,    setSearch]   = useState('');
  const [selected,  setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTpl,   setEditTpl]  = useState<ProgramTemplate | null>(null);

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const allSelected  = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const someSelected = filtered.some(t => selected.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(t => n.delete(t.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(t => n.add(t.id)); return n; });
    }
  };

  const toggleRow = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSave = (data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>, editId?: string) => {
    if (editId) {
      updateTemplate(editId, data);
    } else {
      addTemplate(data);
    }
  };

  const handleDelete    = (id: string) => deleteTemplate(id);
  const handleDuplicate = (tpl: ProgramTemplate) => duplicateTemplate(tpl);

  const openCreate = () => { setEditTpl(null);  setSheetOpen(true); };
  const openEdit   = (t: ProgramTemplate) => { setEditTpl(t); setSheetOpen(true); };

  const headerCellStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-weight-medium)',
    fontFamily: 'inherit',
    color: colors.t2,
    height: 30,
    paddingTop: 0, paddingBottom: 0,
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
    userSelect: 'none',
    backgroundColor: isDark ? colors.surface : 'var(--secondary)',
  };

  const rowCellStyle: React.CSSProperties = {
    fontSize: 'var(--text-base)',
    fontFamily: 'inherit',
    color: colors.t2,
    height: 44,
    paddingTop: 0, paddingBottom: 0,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.appBg }}>

      {/* ── Page header ──────────────────────────────────── */}
      <div style={{
        height: 40, display: 'flex', alignItems: 'center',
        paddingLeft: 20, paddingRight: 20, flexShrink: 0,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.appBg,
      }}>
        <span style={{
          fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)',
          fontFamily: 'inherit', color: colors.t0, letterSpacing: '-0.01em',
        }}>
          Program Templates
        </span>
      </div>

      {/* ── Scrollable body ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ padding: 20 }}>

          {/* ── Toolbar ──────────────────────────────────── */}
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 240, flexShrink: 0 }}>
              <Search style={{
                position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                width: 13, height: 13, color: colors.t3, pointerEvents: 'none', zIndex: 1,
              }} />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ring/60"
                style={{
                  paddingLeft: 30, fontSize: 'var(--text-base)',
                  fontFamily: 'inherit', borderRadius: 'var(--radius-button)', height: 32,
                }}
              />
            </div>

            <div style={{ flex: 1 }} />

            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-md" style={{ color: colors.t2 }} title="Filter">
              <ListFilter style={{ width: 14, height: 14 }} />
            </Button>

            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-md"
              onClick={openCreate}
              style={{
                fontSize: 'var(--text-base)', fontFamily: 'inherit',
                fontWeight: 'var(--font-weight-medium)',
                paddingLeft: 12, paddingRight: 12,
                backgroundColor: colors.btnPrimBg, color: colors.btnPrimText,
              }}
            >
              <Plus style={{ width: 13, height: 13 }} />
              New Template
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" style={{ color: colors.t2 }} title="More options">
              <MoreVertical style={{ width: 20, height: 20 }} />
            </Button>
          </div>

          {/* ── Table card ───────────────────────────────── */}
          <div style={{
            backgroundColor: isDark ? colors.surface : 'var(--background)',
            border: `1px solid ${colors.border}`,
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b" style={{ borderColor: colors.border }}>
                  <TableHead style={{ ...headerCellStyle, width: 44, paddingLeft: 16, paddingRight: 8 }}>
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      className="border-zinc-400 dark:border-zinc-500"
                    />
                  </TableHead>
                  <TableHead style={{ ...headerCellStyle, paddingLeft: 6, minWidth: 200 }}>Program Name</TableHead>
                  <TableHead style={{ ...headerCellStyle, width: 120 }}>Category</TableHead>
                  <TableHead style={{ ...headerCellStyle, width: 110 }}>Targets</TableHead>
                  <TableHead style={{ ...headerCellStyle, width: 140 }}>Status</TableHead>
                  <TableHead style={{ ...headerCellStyle, width: 140 }}>Last Updated</TableHead>
                  <TableHead style={{ ...headerCellStyle, width: 56, textAlign: 'center' }}>Menu</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={7} style={{
                      textAlign: 'center', padding: '48px 16px',
                      fontSize: 'var(--text-base)', fontFamily: 'inherit', color: colors.t3,
                    }}>
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tpl, idx) => {
                    const isChecked = selected.has(tpl.id);
                    const isLast    = idx === filtered.length - 1;
                    const cat       = categories.find(c => c.id === tpl.categoryId);
                    const status    = statuses.find(s => s.id === tpl.statusId);

                    return (
                      <TableRow
                        key={tpl.id}
                        data-state={isChecked ? 'selected' : undefined}
                        className="border-b transition-colors"
                        style={{
                          borderColor: isLast ? 'transparent' : colors.border,
                          backgroundColor: isChecked
                            ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.022)')
                            : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          const el = e.target as HTMLElement;
                          if (el.closest('[role="checkbox"]') || el.closest('button')) return;
                          openEdit(tpl);
                        }}
                        onMouseEnter={e => {
                          if (!isChecked)
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.016)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.backgroundColor =
                            isChecked ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.022)') : 'transparent';
                        }}
                      >
                        {/* Checkbox */}
                        <TableCell style={{ ...rowCellStyle, width: 44, paddingLeft: 16, paddingRight: 8 }} onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleRow(tpl.id)}
                            aria-label={`Select ${tpl.title}`}
                            className="border-zinc-400 dark:border-zinc-500"
                          />
                        </TableCell>

                        {/* Program Name */}
                        <TableCell style={{ ...rowCellStyle, paddingLeft: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{
                              width: 9, height: 9, borderRadius: 3,
                              backgroundColor: tpl.color, flexShrink: 0,
                            }} />
                            <div>
                              <div style={{
                                fontWeight: 'var(--font-weight-medium)', color: colors.t0,
                                fontFamily: 'inherit', fontSize: 'var(--text-base)', lineHeight: 1.3,
                              }}>
                                {tpl.title}
                              </div>
                              {tpl.description && (
                                <div style={{
                                  fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit',
                                  lineHeight: 1.3, maxWidth: 300, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {tpl.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell style={rowCellStyle}>
                          <CategoryBadge category={cat} />
                        </TableCell>

                        {/* Targets count */}
                        <TableCell style={rowCellStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: 22, height: 20, padding: '0 6px', borderRadius: 5,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)',
                              fontFamily: 'inherit', color: colors.t1,
                            }}>
                              {tpl.targets.length}
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                              target{tpl.targets.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell style={rowCellStyle}>
                          <StatusBadge status={status} />
                        </TableCell>

                        {/* Last Updated */}
                        <TableCell style={{ ...rowCellStyle, color: colors.t3, fontSize: 'var(--text-xs)' }}>
                          {fmtDate(tpl.lastUpdated)}
                        </TableCell>

                        {/* Row menu */}
                        <TableCell
                          style={{ ...rowCellStyle, width: 56, textAlign: 'center', paddingLeft: 0, paddingRight: 0 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RowMenu
                              template={tpl}
                              onEdit={() => openEdit(tpl)}
                              onDelete={() => handleDelete(tpl.id)}
                              onDuplicate={() => handleDuplicate(tpl)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

        </div>
      </div>

      {/* Sheet */}
      <ProgramTemplateSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        editTemplate={editTpl}
        categories={categories}
        statuses={statuses}
        onCreateCategory={cat    => addCategory(cat)}
        onCreateStatus={status  => addStatus(status)}
      />
    </div>
  );
}