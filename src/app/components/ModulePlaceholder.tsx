import React from 'react';
import type { ModuleId } from './AppSidebar';

// ─── Module metadata ──────────────────────────────────────────────────────────

const MODULE_META: Record<
  Exclude<ModuleId, 'calendar'>,
  { title: string; description: string; badge: string }
> = {
  learners: {
    title: 'Learners',
    description: 'Manage learner profiles, goals, and progress for every student on your caseload.',
    badge: 'Coming Soon',
  },
  'program-templates': {
    title: 'Program Templates',
    description: 'Build and assign individualized ABA program templates, skill acquisition plans, and behavior protocols.',
    badge: 'Coming Soon',
  },
  reports: {
    title: 'Reports',
    description: 'Generate progress reports, session summaries, and insurance-ready documentation.',
    badge: 'Coming Soon',
  },
  'history-activity': {
    title: 'History & Activity',
    description: 'Review a full audit trail of session activity, edits, and provider actions across your practice.',
    badge: 'Coming Soon',
  },
  settings: {
    title: 'Settings',
    description: 'Configure your practice preferences, integrations, billing, and account details.',
    badge: 'Coming Soon',
  },
};

// ─── SVG illustrations per module ─────────────────────────────────────────────

function LearnersIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="20" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M8 52C8 43.163 15.163 36 24 36C32.837 36 40 43.163 40 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="22" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M44 36C49.523 36 56 39.477 56 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ProgramTemplatesIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="34" y="8" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="34" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="34" y="34" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M45 40v12M39 46h12" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ReportsIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8H36L52 24V56C52 57.1046 51.1046 58 50 58H16C14.8954 58 14 57.1046 14 56V10C14 8.89543 14.8954 8 16 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M36 8V24H52" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 36H42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 44H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="34" r="20" stroke="currentColor" strokeWidth="2" />
      <path d="M32 22V34L40 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18L10 10L18 12" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 10C16 6 24 4 32 4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M32 8v6M32 50v6M8 32h6M50 32h6M15.515 15.515l4.243 4.243M44.243 44.243l4.243 4.243M48.485 15.515l-4.243 4.243M19.757 44.243l-4.243 4.243" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<Exclude<ModuleId, 'calendar'>, React.FC> = {
  learners:            LearnersIllustration,
  'program-templates': ProgramTemplatesIllustration,
  reports:             ReportsIllustration,
  'history-activity':  HistoryIllustration,
  settings:            SettingsIllustration,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ModulePlaceholderProps {
  module: Exclude<ModuleId, 'calendar'>;
}

export function ModulePlaceholder({ module }: ModulePlaceholderProps) {
  const meta = MODULE_META[module];
  const Illustration = ILLUSTRATIONS[module];

  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ backgroundColor: 'var(--background)', overflow: 'hidden' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          maxWidth: 420,
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'inherit',
            backgroundColor: 'var(--secondary)',
            color: 'var(--muted-foreground)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {meta.badge}
        </span>

        {/* Illustration */}
        <div style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>
          <Illustration />
        </div>

        {/* Title */}
        <div>
          <h3
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'inherit',
              color: 'var(--foreground)',
              margin: 0,
              marginBottom: 8,
            }}
          >
            {meta.title}
          </h3>
          <p
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-regular)',
              fontFamily: 'inherit',
              color: 'var(--muted-foreground)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {meta.description}
          </p>
        </div>

        {/* CTA */}
        <button
          style={{
            marginTop: 4,
            padding: '0 20px',
            height: 36,
            borderRadius: 'var(--radius-button)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            color: 'var(--muted-foreground)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-medium)',
            fontFamily: 'inherit',
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          Notify me when ready
        </button>
      </div>
    </div>
  );
}
