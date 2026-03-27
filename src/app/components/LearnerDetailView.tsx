import React, { useState } from 'react';
import {
  ChevronDown,
  Search,
  ListFilter,
  Plus,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus as MinusIcon,
  Clock,
  FileText,
  BookOpen,
  Edit2,
  CheckCircle2,
  CalendarDays,
  Download,
  Eye,
  User,
  Phone,
  ArrowLeft,
  AlertTriangle,
  Activity,
  Pencil,
  Trash2,
  MessageSquare,
  Layers,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useLearnerPrograms } from '../context/LearnerProgramsContext';
import { useProgramTemplates } from '../context/ProgramTemplatesContext';
import type { ProgramTemplate } from './ProgramTemplatesPage';
import { ProgramTemplateSheet } from './ProgramTemplateSheet';
import { AddProgramModal } from './AddProgramModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LearnerRow {
  id: string;
  name: string;
  dob?: string;
  collaborators?: { initials: string }[];
  school?: string;
  city?: string;
  state?: string;
}

interface LearnerDetailViewProps {
  learner: LearnerRow;
  allLearners: LearnerRow[];
  onBack: () => void;
  onSelectLearner: (id: string) => void;
}

// ─── Palette helpers ──────────────────────────────────────────────────────────

const BADGE_PALETTES: [string, string][] = [
  ['#E8F0FE', '#3B64C8'],
  ['#E6F4EA', '#267A47'],
  ['#F3E8FD', '#7C3EB5'],
  ['#FFF3E0', '#B85D00'],
  ['#FCE4EC', '#C1365C'],
  ['#E0F7FA', '#00798A'],
  ['#FFF8E1', '#9A7000'],
  ['#EDE7F6', '#5E35B1'],
];

function badgePalette(s: string): [string, string] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return BADGE_PALETTES[h % BADGE_PALETTES.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

function getShortCode(name: string, id: string) {
  const suffix = id.length > 8 ? id.slice(0, 6).toUpperCase() : id.padStart(3, '0');
  return `${getInitials(name).toUpperCase()}-${suffix}`;
}

function calcAge(dob: string) {
  const [m, d, y] = dob.split('/').map(Number);
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const COLLAB_NAMES: Record<string, string> = {
  ST: 'Sarah Thompson',
  MC: 'Michael Chen',
  JM: 'Jessica Martinez',
  DP: 'David Park',
};

const MOCK_PROGRAMS = [
  {
    id: 'p1',
    name: 'Mand Training',
    domain: 'Verbal Behavior',
    status: 'Active' as const,
    progress: 68,
    targets: [
      { id: 't1', name: 'Request preferred items', lastScore: 85, trend: 'up' as const },
      { id: 't2', name: 'Request break', lastScore: 70, trend: 'up' as const },
      { id: 't3', name: 'Request help from peers', lastScore: 45, trend: 'stable' as const },
    ],
  },
  {
    id: 'p2',
    name: 'Listener Responding',
    domain: 'Language Skills',
    status: 'Active' as const,
    progress: 52,
    targets: [
      { id: 't4', name: 'Follow 1-step directions', lastScore: 90, trend: 'up' as const },
      { id: 't5', name: 'Follow 2-step directions', lastScore: 55, trend: 'stable' as const },
      { id: 't6', name: 'Identify objects by function', lastScore: 40, trend: 'down' as const },
    ],
  },
  {
    id: 'p3',
    name: 'Social Skills — Greetings',
    domain: 'Social Behavior',
    status: 'Mastered' as const,
    progress: 100,
    targets: [
      { id: 't7', name: 'Wave hello/goodbye', lastScore: 100, trend: 'up' as const },
      { id: 't8', name: 'Say hi to familiar adults', lastScore: 100, trend: 'up' as const },
    ],
  },
  {
    id: 'p4',
    name: 'Tolerance of Transitions',
    domain: 'Adaptive Behavior',
    status: 'Maintenance' as const,
    progress: 82,
    targets: [
      { id: 't9', name: 'Transition with verbal warning', lastScore: 85, trend: 'stable' as const },
      { id: 't10', name: 'Transition without preferred activity', lastScore: 75, trend: 'up' as const },
    ],
  },
];

const MOCK_HISTORY = [
  {
    id: 'h1',
    type: 'session' as const,
    title: 'Session Completed',
    subtitle: 'Mand Training — 85% accuracy across all targets',
    date: 'Mar 17, 2026',
    time: '10:30 AM',
    provider: 'Sarah Thompson',
  },
  {
    id: 'h2',
    type: 'note' as const,
    title: 'Supervision Note Added',
    subtitle: 'Weekly check-in — progress on listener responding targets',
    date: 'Mar 15, 2026',
    time: '2:00 PM',
    provider: 'David Park',
  },
  {
    id: 'h3',
    type: 'program' as const,
    title: 'Program Mastered',
    subtitle: 'Social Skills — Greetings marked as mastered',
    date: 'Mar 14, 2026',
    time: '11:15 AM',
    provider: 'Jessica Martinez',
  },
  {
    id: 'h4',
    type: 'session' as const,
    title: 'Session Completed',
    subtitle: 'Listener Responding — 55% accuracy, prompting level P+',
    date: 'Mar 13, 2026',
    time: '9:00 AM',
    provider: 'Sarah Thompson',
  },
  {
    id: 'h5',
    type: 'edit' as const,
    title: 'Profile Updated',
    subtitle: 'Emergency contact information updated',
    date: 'Mar 11, 2026',
    time: '3:45 PM',
    provider: 'Michael Chen',
  },
  {
    id: 'h6',
    type: 'session' as const,
    title: 'Session Completed',
    subtitle: 'Mand Training — 78% accuracy, introduced 2 new mand targets',
    date: 'Mar 10, 2026',
    time: '10:00 AM',
    provider: 'Sarah Thompson',
  },
  {
    id: 'h7',
    type: 'note' as const,
    title: 'General Note Added',
    subtitle: 'Parent reported regression in home environment',
    date: 'Mar 8, 2026',
    time: '4:15 PM',
    provider: 'David Park',
  },
];

const MOCK_ABC = [
  {
    id: 'abc1',
    date: 'Mar 17, 2026',
    time: '10:15 AM',
    recordedBy: 'Sarah Thompson',
    antecedent: 'Transition from preferred activity (iPad) to table work',
    behavior: 'Screaming, dropping to floor, refusing to move',
    consequence: 'Provided 2-minute wait and visual schedule preview',
    severity: 'High' as const,
  },
  {
    id: 'abc2',
    date: 'Mar 15, 2026',
    time: '9:45 AM',
    recordedBy: 'Sarah Thompson',
    antecedent: 'Peer took preferred toy during free play',
    behavior: 'Crying, hitting peer (1 instance)',
    consequence: 'Redirected learner, modeled appropriate request',
    severity: 'Medium' as const,
  },
  {
    id: 'abc3',
    date: 'Mar 13, 2026',
    time: '11:30 AM',
    recordedBy: 'Jessica Martinez',
    antecedent: 'Denied access to snack before session end',
    behavior: 'Whining, attempting to leave table',
    consequence: 'Offered visual timer, reinforced staying seated',
    severity: 'Low' as const,
  },
  {
    id: 'abc4',
    date: 'Mar 10, 2026',
    time: '2:20 PM',
    recordedBy: 'Sarah Thompson',
    antecedent: 'Loud noise from adjoining room startled learner',
    behavior: 'Covering ears, rocking, vocalizing',
    consequence: 'Moved to quieter space, offered deep pressure input',
    severity: 'Medium' as const,
  },
];

const MOCK_NOTES = {
  session: [
    {
      id: 'n1',
      title: 'Session Note — Mar 17',
      preview: 'Learner demonstrated strong mand performance today. 3 novel mands observed independently. Prompted twice for listener...',
      date: 'Mar 17, 2026',
      author: 'Sarah Thompson',
    },
    {
      id: 'n2',
      title: 'Session Note — Mar 13',
      preview: 'Introduced new targets for listener responding. Baseline data collected. Learner required heavy prompting throughout...',
      date: 'Mar 13, 2026',
      author: 'Sarah Thompson',
    },
    {
      id: 'n3',
      title: 'Session Note — Mar 10',
      preview: 'Reinforcement pairing session. Learner responded well to edible reinforcers. Token board introduced successfully...',
      date: 'Mar 10, 2026',
      author: 'Sarah Thompson',
    },
  ],
  supervision: [
    {
      id: 'n4',
      title: 'Supervision Note — Mar 15',
      preview: 'Reviewed weekly data with team. Mand training targets showing consistent upward trend. Recommend adding 2 new mand targets...',
      date: 'Mar 15, 2026',
      author: 'David Park',
    },
    {
      id: 'n5',
      title: 'Supervision Note — Mar 1',
      preview: 'Monthly BCBA review completed. Program modifications discussed for listener responding. Updated mastery criteria for...',
      date: 'Mar 1, 2026',
      author: 'David Park',
    },
  ],
  general: [
    {
      id: 'n6',
      title: 'Parent Communication — Mar 8',
      preview: 'Parent reported regression in transition behavior at home. Shared home support strategies. Follow-up scheduled for...',
      date: 'Mar 8, 2026',
      author: 'David Park',
    },
  ],
};

const MOCK_REPORTS = [
  {
    id: 'r1',
    title: 'Monthly Progress Report — February 2026',
    dateGenerated: 'Mar 3, 2026',
    type: 'Progress' as const,
  },
  {
    id: 'r2',
    title: 'Session Summary — Week of Mar 10',
    dateGenerated: 'Mar 14, 2026',
    type: 'Session Summary' as const,
  },
  {
    id: 'r3',
    title: 'Monthly Progress Report — January 2026',
    dateGenerated: 'Feb 3, 2026',
    type: 'Progress' as const,
  },
];

// ─── Small shared sub-components ──────────────────────────────────────────────

function AvatarBadge({ initials, size = 24 }: { initials: string; size?: number }) {
  const [bg, text] = badgePalette(initials);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        color: text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        fontFamily: 'inherit',
        letterSpacing: '0.02em',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: 'Active' | 'Mastered' | 'Maintenance' }) {
  const map = {
    Active: { bg: '#E6F4EA', text: '#267A47' },
    Mastered: { bg: '#E8F0FE', text: '#3B64C8' },
    Maintenance: { bg: '#FFF3E0', text: '#B85D00' },
  };
  const { bg, text } = map[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: bg,
        color: text,
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-weight-medium)',
        fontFamily: 'inherit',
        borderRadius: 100,
        padding: '2px 8px',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: 'Low' | 'Medium' | 'High' }) {
  const map = {
    Low: { bg: '#E6F4EA', text: '#267A47' },
    Medium: { bg: '#FFF3E0', text: '#B85D00' },
    High: { bg: '#FCE4EC', text: '#C1365C' },
  };
  const { bg, text } = map[severity];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: bg,
        color: text,
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-weight-medium)',
        fontFamily: 'inherit',
        borderRadius: 100,
        padding: '2px 8px',
        letterSpacing: '0.01em',
      }}
    >
      {severity}
    </span>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up')
    return <TrendingUp style={{ width: 13, height: 13, color: '#267A47' }} />;
  if (trend === 'down')
    return <TrendingDown style={{ width: 13, height: 13, color: '#C1365C' }} />;
  return <MinusIcon style={{ width: 13, height: 13, color: '#999999' }} />;
}

function ProgressBar({ value, colors }: { value: number; colors: any }) {
  return (
    <div
      style={{
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 100,
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${value}%`,
          backgroundColor: value === 100 ? '#267A47' : colors.accent,
          borderRadius: 100,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

// ─── Section label helper ─────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <span
      style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: colors.t3,
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ learner, colors, isDark }: { learner: LearnerRow; colors: any; isDark: boolean }) {
  const [innerTab, setInnerTab] = useState<'info' | 'contacts' | 'medical'>('info');
  const initials = getInitials(learner.name);
  const shortCode = getShortCode(learner.name, learner.id);
  const age = learner.dob ? calcAge(learner.dob) : null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? colors.surface : 'var(--background)',
    border: `1px solid ${colors.border}`,
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  };

  const detailRow = (label: string, value: string, last = false) => (
    <div
      key={label}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        paddingTop: 10,
        paddingBottom: 10,
        borderBottom: last ? 'none' : `1px solid ${colors.border}`,
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: colors.t3,
          fontFamily: 'inherit',
          width: 100,
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-base)',
          color: colors.t1,
          fontFamily: 'inherit',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        {value}
      </span>
    </div>
  );

  const innerTabBtn = (key: 'info' | 'contacts' | 'medical', label: string) => (
    <Button
      key={key}
      variant="ghost"
      onClick={() => setInnerTab(key)}
      className="rounded-none h-auto px-0"
      style={{
        fontFamily: 'inherit',
        fontSize: 'var(--text-base)',
        fontWeight: innerTab === key ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
        color: innerTab === key ? colors.t0 : colors.t3,
        padding: '8px 0',
        borderBottom: innerTab === key ? `2px solid ${colors.t0}` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Button>
  );

  const infoField = (label: string, value: string) => (
    <div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: colors.t3,
          fontFamily: 'inherit',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--text-base)',
          color: colors.t1,
          fontFamily: 'inherit',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* ── Left card ────────────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, width: 220, flexShrink: 0 }}>
        {/* Avatar + name */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 20px 16px',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.accent}cc, ${colors.accent})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'inherit',
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}
          >
            {initials.toUpperCase()}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: colors.t0,
                fontFamily: 'inherit',
                lineHeight: 1.3,
              }}
            >
              {learner.name}
            </div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: colors.t3,
                fontFamily: 'inherit',
                marginTop: 2,
              }}
            >
              {shortCode}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full h-7 rounded-md gap-1.5 mt-1"
            style={{
              fontSize: 'var(--text-xs)',
              fontFamily: 'inherit',
              fontWeight: 'var(--font-weight-medium)',
              color: colors.t1,
            }}
          >
            <Pencil style={{ width: 11, height: 11 }} />
            Edit Profile
          </Button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${colors.border}` }} />

        {/* Key details */}
        <div style={{ padding: '4px 16px 8px' }}>
          {detailRow('Full Name', learner.name)}
          {detailRow('Gender', 'Male')}
          {detailRow('Age', age !== null ? `${age} years` : '—')}
          {detailRow('Allergy', 'Peanuts')}
          {detailRow('Caregiver', 'Maria Wilson')}
          {detailRow('Contact', '+1 512-555-0182', true)}
        </div>
      </div>

      {/* ── Right content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

        {/* Learner info card with inner tabs */}
        <div style={cardStyle}>
          {/* Inner tab bar */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              padding: '0 20px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {innerTabBtn('info', "Learner's Info")}
            {innerTabBtn('contacts', 'Contacts')}
            {innerTabBtn('medical', 'Medical Info')}
          </div>

          {/* Inner tab content */}
          <div style={{ padding: '16px 20px' }}>
            {innerTab === 'info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>
                {infoField('Date of Birth', learner.dob ?? '—')}
                {infoField('Diagnosis', 'ASD – Level 2')}
                {infoField('Grade', '3rd Grade')}
                {infoField('School', learner.school ?? '—')}
                {infoField('City', learner.city ?? '—')}
                {infoField('State', learner.state ?? '—')}
                {infoField('Funding Source', 'Medicaid')}
                {infoField('Enrollment Date', 'Sep 5, 2023')}
                {infoField('Service Type', 'ABA Therapy')}
              </div>
            )}
            {innerTab === 'contacts' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                {infoField('Emergency Contact', 'Maria Wilson')}
                {infoField('Relationship', 'Mother')}
                {infoField('Phone', '+1 512-555-0182')}
                {infoField('Email', 'maria.wilson@email.com')}
                {infoField('Secondary Contact', 'James Wilson')}
                {infoField('Relationship', 'Father')}
                {infoField('Phone', '+1 512-555-0193')}
                {infoField('Email', 'james.wilson@email.com')}
              </div>
            )}
            {innerTab === 'medical' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>
                {infoField('Primary Physician', 'Dr. Rachel Okafor')}
                {infoField('Physician Phone', '+1 512-555-0210')}
                {infoField('Insurance', 'BlueCross TX')}
                {infoField('Allergies', 'Peanuts (severe)')}
                {infoField('Medications', 'Risperidone 0.5mg')}
                {infoField('Medical Notes', 'Epipen on file')}
              </div>
            )}
          </div>
        </div>

        {/* Collaborators card */}
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <SectionLabel label="Collaborators" colors={colors} />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 rounded-md"
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'inherit',
                color: colors.t2,
                padding: '0 8px',
              }}
            >
              <Pencil style={{ width: 11, height: 11 }} />
              Edit
            </Button>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(learner.collaborators ?? []).map((c) => {
              const [bg, text] = badgePalette(c.initials);
              const fullName = COLLAB_NAMES[c.initials] ?? c.initials;
              return (
                <div
                  key={c.initials}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: isDark ? colors.surfaceHover : 'var(--secondary)',
                    borderRadius: 100,
                    padding: '4px 10px 4px 4px',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: bg,
                      color: text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      flexShrink: 0,
                    }}
                  >
                    {c.initials}
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: colors.t1,
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fullName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Programs & Progress Tab ──────────────────────────────────────────────────

// ─── Status helpers for learner programs ─────────────────────────────────────

function programStatusBadge(statusId: string): { label: string; bg: string; text: string } {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    'in-progress': { label: 'Active',       bg: '#E6F4EA', text: '#267A47' },
    'met':         { label: 'Mastered',     bg: '#E8F0FE', text: '#3B64C8' },
    'on-hold':     { label: 'On Hold',      bg: '#FFF3E0', text: '#B85D00' },
    'not-active':  { label: 'Not Active',   bg: '#F3F4F6', text: '#6B7280' },
    'disconnected':{ label: 'Disconnected', bg: '#F3F4F6', text: '#9CA3AF' },
  };
  return map[statusId] ?? { label: statusId, bg: '#F3F4F6', text: '#6B7280' };
}

// ─── Programs & Progress Tab ──────────────────────────────────────────────────

function ProgramsTab({ learnerId, learnerName, colors, isDark }: { learnerId: string; learnerName: string; colors: any; isDark: boolean }) {
  const { getProgramsForLearner, addProgram, updateProgram, deleteProgram } = useLearnerPrograms();
  const { templates, categories, statuses, addCategory, addStatus } = useProgramTemplates();

  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState<ProgramTemplate | null>(null);
  // editingId: non-null when the builder is open for an existing program
  const [editingId, setEditingId] = useState<string | null>(null);
  // viewingProgram: non-null when builder is open in read-only view mode
  const [viewMode, setViewMode] = useState(false);

  const allPrograms = getProgramsForLearner(learnerId);
  const filtered = allPrograms.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSave(data: Omit<ProgramTemplate, 'id' | 'lastUpdated'>, editId?: string) {
    if (editId) {
      updateProgram(editId, { ...data, lastUpdated: new Date() });
    } else {
      addProgram(learnerId, learnerName, data);
    }
    closeBuilder();
  }

  function closeBuilder() {
    setBuilderOpen(false);
    setPrefillTemplate(null);
    setEditingId(null);
    setViewMode(false);
  }

  function handleCreateScratch() {
    setPrefillTemplate(null);
    setEditingId(null);
    setViewMode(false);
    setBuilderOpen(true);
  }

  function handleSelectTemplate(tpl: ProgramTemplate) {
    // Clone template data so the builder is pre-filled but original is untouched
    setPrefillTemplate({ ...tpl, id: '', lastUpdated: new Date() });
    setEditingId(null);
    setViewMode(false);
    setBuilderOpen(true);
  }

  function handleEditProgram(prog: ReturnType<typeof getProgramsForLearner>[number]) {
    setPrefillTemplate({
      id:          prog.id,
      title:       prog.title,
      description: prog.description,
      categoryId:  prog.categoryId,
      color:       prog.color,
      statusId:    prog.statusId,
      targets:     prog.targets,
      lastUpdated: prog.lastUpdated,
    });
    setEditingId(prog.id);
    setViewMode(false);
    setBuilderOpen(true);
  }

  function handleViewProgram(prog: ReturnType<typeof getProgramsForLearner>[number]) {
    setPrefillTemplate({
      id:          prog.id,
      title:       prog.title,
      description: prog.description,
      categoryId:  prog.categoryId,
      color:       prog.color,
      statusId:    prog.statusId,
      targets:     prog.targets,
      lastUpdated: prog.lastUpdated,
    });
    setEditingId(null);
    setViewMode(true);
    setBuilderOpen(true);
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? colors.surface : 'var(--background)',
    border: `1px solid ${colors.border}`,
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 220, flexShrink: 0 }}>
          <Search
            style={{
              position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
              width: 13, height: 13, color: colors.t3, pointerEvents: 'none', zIndex: 1,
            }}
          />
          <Input
            placeholder="Search programs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ring/60"
            style={{ paddingLeft: 30, fontSize: 'var(--text-base)', fontFamily: 'inherit', height: 30, borderRadius: 'var(--radius-button)' }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="icon" className="h-7 w-7 rounded-md" style={{ color: colors.t2 }} title="Filter">
          <ListFilter style={{ width: 13, height: 13 }} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t1 }}
          onClick={() => setAddModalOpen(true)}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Add Program
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 20px', gap: 10,
          border: `1px dashed ${colors.border}`,
          borderRadius: 'var(--radius)',
        }}>
          <BookOpen style={{ width: 28, height: 28, color: colors.t3 }} />
          <span style={{ fontSize: 'var(--text-base)', color: colors.t3, fontFamily: 'inherit' }}>
            {search ? 'No programs match your search' : 'No programs yet'}
          </span>
          {!search && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 gap-1.5 rounded-md mt-1"
              style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10 }}
              onClick={() => setAddModalOpen(true)}
            >
              <Plus style={{ width: 12, height: 12 }} />
              Add first program
            </Button>
          )}
        </div>
      )}

      {/* Program cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(program => {
          const badge = programStatusBadge(program.statusId);
          const category = categories.find(c => c.id === program.categoryId);
          return (
            <div key={program.id} style={cardStyle}>
              {/* Program header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderBottom: program.targets.length > 0 ? `1px solid ${colors.border}` : 'none',
                }}
              >
                {/* Color stripe */}
                <div style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: program.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: colors.t0,
                      fontFamily: 'inherit',
                    }}>
                      {program.title}
                    </span>
                    <span style={{
                      fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)',
                      padding: '1px 7px', borderRadius: 100,
                      backgroundColor: badge.bg, color: badge.text,
                    }}>
                      {badge.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                    {category?.name ?? program.categoryId}
                  </span>
                </div>
                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 160, flexShrink: 0 }}>
                  <ProgressBar value={program.progress} colors={colors} />
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: colors.t2,
                    fontFamily: 'inherit',
                    fontWeight: 'var(--font-weight-medium)',
                    width: 32,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {program.progress}%
                  </span>
                </div>
                {/* Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[26px] w-[26px]"
                      style={{ color: colors.t3 }}
                    >
                      <MoreVertical style={{ width: 14, height: 14 }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewProgram(program)}>
                      <Eye style={{ width: 13, height: 13 }} /> View program
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditProgram(program)}>
                      <Pencil style={{ width: 13, height: 13 }} /> Edit program
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteProgram(program.id)}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Targets */}
              {program.targets.length > 0 && (
                <div style={{ padding: '8px 0' }}>
                  {program.targets.map((target, ti) => (
                    <div
                      key={target.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 14px',
                        borderBottom: ti < program.targets.length - 1 ? `1px solid ${colors.border}` : 'none',
                      }}
                    >
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        backgroundColor: target.color || colors.t3, flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, fontSize: 'var(--text-base)', color: colors.t2, fontFamily: 'inherit' }}>
                        {target.name}
                      </span>
                      <span style={{
                        fontSize: 'var(--text-xs)', color: colors.t3,
                        fontFamily: 'inherit',
                      }}>
                        {target.dataType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Program selection modal */}
      <AddProgramModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        templates={templates}
        onCreateScratch={handleCreateScratch}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Program Builder sheet — handles create, edit, and view modes */}
      <ProgramTemplateSheet
        isOpen={builderOpen}
        onClose={closeBuilder}
        onSave={viewMode ? () => closeBuilder() : handleSave}
        editTemplate={prefillTemplate}
        readOnly={viewMode}
        categories={categories}
        statuses={statuses}
        onCreateCategory={addCategory}
        onCreateStatus={addStatus}
      />
    </div>
  );
}

// ─── History & Activity Tab ───────────────────────────────────────────────────

function HistoryTab({ colors, isDark }: { colors: any; isDark: boolean }) {
  const typeIcon = (type: string) => {
    if (type === 'session') return <CheckCircle2 style={{ width: 14, height: 14, color: '#267A47' }} />;
    if (type === 'note') return <FileText style={{ width: 14, height: 14, color: '#3B64C8' }} />;
    if (type === 'program') return <BookOpen style={{ width: 14, height: 14, color: '#7C3EB5' }} />;
    return <Edit2 style={{ width: 14, height: 14, color: colors.t3 }} />;
  };
  const typeDot = (type: string) => {
    if (type === 'session') return '#267A47';
    if (type === 'note') return '#3B64C8';
    if (type === 'program') return '#7C3EB5';
    return colors.t3;
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t2 }}>
          <CalendarDays style={{ width: 12, height: 12 }} /> Date Range
        </Button>
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t2 }}>
          <ListFilter style={{ width: 12, height: 12 }} /> Type
        </Button>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 11, top: 8, bottom: 8,
          width: 1, backgroundColor: colors.border,
        }} />

        {MOCK_HISTORY.map((item, idx) => (
          <div
            key={item.id}
            style={{
              position: 'relative',
              display: 'flex',
              gap: 12,
              paddingBottom: idx < MOCK_HISTORY.length - 1 ? 20 : 0,
            }}
          >
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: -21,
              top: 3,
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: isDark ? colors.surface : 'var(--background)',
              border: `1.5px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {typeIcon(item.type)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <span style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: colors.t0,
                    fontFamily: 'inherit',
                  }}>
                    {item.title}
                  </span>
                  <p style={{
                    fontSize: 'var(--text-base)',
                    color: colors.t2,
                    fontFamily: 'inherit',
                    margin: '2px 0 0',
                    lineHeight: 1.4,
                  }}>
                    {item.subtitle}
                  </p>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: colors.t3,
                    fontFamily: 'inherit',
                    display: 'block',
                    marginTop: 4,
                  }}>
                    {item.provider}
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit', display: 'block' }}>
                    {item.date}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit', display: 'block' }}>
                    {item.time}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ABC Tab ──────────────────────────────────────────────────────────────────

function ABCTab({ colors, isDark }: { colors: any; isDark: boolean }) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? colors.surface : 'var(--background)',
    border: `1px solid ${colors.border}`,
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  };

  const ABC_COLORS = {
    A: { bg: isDark ? 'rgba(59,100,200,0.12)' : '#EEF2FF', text: '#3B64C8', label: 'Antecedent' },
    B: { bg: isDark ? 'rgba(193,54,92,0.12)' : '#FFF0F4', text: '#C1365C', label: 'Behavior' },
    C: { bg: isDark ? 'rgba(38,122,71,0.12)' : '#EDFAF3', text: '#267A47', label: 'Consequence' },
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t1 }}>
          <Plus style={{ width: 12, height: 12 }} />
          Add ABC Entry
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MOCK_ABC.map(entry => (
          <div key={entry.id} style={cardStyle}>
            {/* Card header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                  {entry.date} · {entry.time}
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit',
                }}>
                  <User style={{ width: 11, height: 11 }} />
                  {entry.recordedBy}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SeverityBadge severity={entry.severity} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  style={{ color: colors.t3 }}
                >
                  <MoreVertical style={{ width: 14, height: 14 }} />
                </Button>
              </div>
            </div>

            {/* A / B / C sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              {(['A', 'B', 'C'] as const).map((key, ki) => {
                const cfg = ABC_COLORS[key];
                const text = key === 'A' ? entry.antecedent : key === 'B' ? entry.behavior : entry.consequence;
                return (
                  <div
                    key={key}
                    style={{
                      padding: '10px 14px',
                      borderRight: ki < 2 ? `1px solid ${colors.border}` : 'none',
                      backgroundColor: cfg.bg,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        backgroundColor: cfg.text,
                        color: '#fff',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
                      }}>
                        {key}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: cfg.text, fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)' }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 'var(--text-base)', color: colors.t1,
                      fontFamily: 'inherit', margin: 0, lineHeight: 1.45,
                    }}>
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ colors, isDark }: { colors: any; isDark: boolean }) {
  const [noteTab, setNoteTab] = useState<'session' | 'supervision' | 'general'>('session');

  const notes = MOCK_NOTES[noteTab];

  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? colors.surface : 'var(--background)',
    border: `1px solid ${colors.border}`,
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.12s',
  };

  const innerTabBtn = (key: 'session' | 'supervision' | 'general', label: string) => (
    <Button
      key={key}
      variant="ghost"
      onClick={() => setNoteTab(key)}
      className="rounded-none h-auto px-0"
      style={{
        fontFamily: 'inherit',
        fontSize: 'var(--text-base)',
        fontWeight: noteTab === key ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
        color: noteTab === key ? colors.t0 : colors.t3,
        padding: '6px 0',
        borderBottom: noteTab === key ? `2px solid ${colors.t0}` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Button>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {innerTabBtn('session', 'Session Notes')}
          {innerTabBtn('supervision', 'Supervision Notes')}
          {innerTabBtn('general', 'General Notes')}
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t1 }}>
          <Plus style={{ width: 12, height: 12 }} />
          Add Note
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 16px',
            fontSize: 'var(--text-base)', color: colors.t3, fontFamily: 'inherit',
          }}>
            No notes yet
          </div>
        ) : notes.map(note => (
          <div key={note.id} style={cardStyle}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = isDark ? colors.surfaceHover : 'rgba(0,0,0,0.016)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = isDark ? colors.surface : 'var(--background)')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)',
                  color: colors.t0, fontFamily: 'inherit', display: 'block', marginBottom: 4,
                }}>
                  {note.title}
                </span>
                <p style={{
                  fontSize: 'var(--text-base)', color: colors.t2, fontFamily: 'inherit',
                  margin: '0 0 6px', lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {note.preview}
                </p>
                <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                  {note.author}
                </span>
              </div>
              <span style={{
                fontSize: 'var(--text-xs)', color: colors.t3,
                fontFamily: 'inherit', flexShrink: 0,
              }}>
                {note.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ colors, isDark }: { colors: any; isDark: boolean }) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? colors.surface : 'var(--background)',
    border: `1px solid ${colors.border}`,
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
  };

  const reportTypeColors = {
    Progress: { bg: '#E8F0FE', text: '#3B64C8' },
    'Session Summary': { bg: '#E6F4EA', text: '#267A47' },
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t2 }}>
          <CalendarDays style={{ width: 12, height: 12 }} /> Date Range
        </Button>
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t2 }}>
          <ListFilter style={{ width: 12, height: 12 }} /> Program
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 rounded-md"
          style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 10, paddingRight: 10, color: colors.t1 }}>
          <BarChart3 style={{ width: 12, height: 12 }} />
          Generate Report
        </Button>
      </div>

      {MOCK_REPORTS.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 16px',
          fontSize: 'var(--text-base)', color: colors.t3, fontFamily: 'inherit',
        }}>
          No reports yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_REPORTS.map(report => {
            const { bg, text } = reportTypeColors[report.type];
            return (
              <div key={report.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-button)',
                      backgroundColor: isDark ? colors.surfaceHover : 'var(--secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText style={{ width: 16, height: 16, color: colors.t2 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)',
                        color: colors.t0, fontFamily: 'inherit',
                      }}>
                        {report.title}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        backgroundColor: bg, color: text,
                        fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)',
                        fontFamily: 'inherit', borderRadius: 100, padding: '2px 8px',
                      }}>
                        {report.type}
                      </span>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                      Generated {report.dateGenerated}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" className="h-6 gap-1 rounded-md"
                      style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', padding: '0 8px', color: colors.t2 }}>
                      <Eye style={{ width: 11, height: 11 }} /> View
                    </Button>
                    <Button variant="secondary" size="sm" className="h-6 gap-1 rounded-md"
                      style={{ fontSize: 'var(--text-xs)', fontFamily: 'inherit', padding: '0 8px', color: colors.t2 }}>
                      <Download style={{ width: 11, height: 11 }} /> Download
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = 'profile' | 'programs' | 'history' | 'abc' | 'notes' | 'reports';

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'programs', label: 'Programs & Progress' },
  { id: 'history', label: 'History & Activity' },
  { id: 'abc', label: 'ABC' },
  { id: 'notes', label: 'Notes' },
  { id: 'reports', label: 'Reports' },
];

export function LearnerDetailView({
  learner,
  allLearners,
  onBack,
  onSelectLearner,
}: LearnerDetailViewProps) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ backgroundColor: colors.appBg }}
    >
      {/* ── Top header ────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.appBg,
          gap: 6,
        }}
      >
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-6 w-6 flex-shrink-0"
          style={{ color: colors.t2 }}
          title="Back to Learners"
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
        </Button>

        {/* Breadcrumb: Learners */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-auto px-0 py-0"
          style={{
            fontFamily: 'inherit',
            fontSize: 'var(--text-base)',
            color: colors.t3,
            fontWeight: 'var(--font-weight-regular)',
          }}
        >
          Learners
        </Button>

        {/* Separator */}
        <span style={{ fontSize: 'var(--text-base)', color: colors.t3, fontFamily: 'inherit' }}>
          /
        </span>

        {/* Learner selector dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto gap-1 px-1 py-0.5"
              style={{
                fontFamily: 'inherit',
                fontSize: 'var(--text-base)',
                color: colors.t0,
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              {learner.name}
              <ChevronDown style={{ width: 12, height: 12, color: colors.t3 }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6}>
            {allLearners.map(l => (
              <DropdownMenuItem
                key={l.id}
                onClick={() => onSelectLearner(l.id)}
                style={l.id === learner.id ? { fontWeight: 'var(--font-weight-semibold)' } : undefined}
              >
                <AvatarBadge initials={getInitials(l.name)} size={20} />
                {l.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Tab navigation bar ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0,
          paddingLeft: 20,
          paddingRight: 20,
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.appBg,
          height: 38,
        }}
      >
        {TABS.map(tab => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => setActiveTab(tab.id)}
            className="rounded-none h-full px-3.5"
            style={{
              fontFamily: 'inherit',
              fontSize: 'var(--text-base)',
              fontWeight: activeTab === tab.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
              color: activeTab === tab.id ? colors.t0 : colors.t3,
              borderBottom: activeTab === tab.id
                ? `2px solid ${colors.t0}`
                : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ padding: 20, maxWidth: 1100 }}>
          {activeTab === 'profile' && (
            <ProfileTab learner={learner} colors={colors} isDark={isDark} />
          )}
          {activeTab === 'programs' && (
            <ProgramsTab learnerId={learner.id} learnerName={learner.name} colors={colors} isDark={isDark} />
          )}
          {activeTab === 'history' && (
            <HistoryTab colors={colors} isDark={isDark} />
          )}
          {activeTab === 'abc' && (
            <ABCTab colors={colors} isDark={isDark} />
          )}
          {activeTab === 'notes' && (
            <NotesTab colors={colors} isDark={isDark} />
          )}
          {activeTab === 'reports' && (
            <ReportsTab colors={colors} isDark={isDark} />
          )}
        </div>
      </div>
    </div>
  );
}