import React, { useState, useRef, useEffect } from 'react';
import {
  X, MoreVertical, Edit2, Trash2, Clock, Calendar,
  Users, User, Plus, Send, Eye, FileText,
  ChevronRight, AlertTriangle, Link2, Stethoscope,
  MessageSquare, RefreshCw, CheckCircle,
  RotateCcw, Database, BarChart2,
} from 'lucide-react';
import {
  Session,
  computeDetailedStatus,
  SESSION_STATUS_CONFIG,
  SESSION_STATUS_ICONS,
} from './SessionCard';
import { useTheme, AppColors } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from './ui/dropdown-menu';

// ─── Event category detection ─────────────────────────────────────────────────

type EventCategory = 'session' | 'supervision' | 'event' | 'unavailability';

function detectCategory(s: Session): EventCategory {
  if (s.color === '#E05252' && s.serviceType === 'Occupational Therapy' && s.students.length === 0)
    return 'unavailability';
  if (s.color === '#2E9E63' && s.serviceType === 'Speech Therapy' && s.students.length === 0)
    return 'event';
  if (s.color === '#7C52D0' && s.serviceType === 'ABA Therapy' && s.students.length === 0)
    return 'supervision';
  return 'session';
}

const CATEGORY_META: Record<EventCategory, { label: string; color: string }> = {
  session:        { label: 'Session',        color: '#4F83CC' },
  supervision:    { label: 'Supervision',    color: '#7C52D0' },
  event:          { label: 'Event',          color: '#2E9E63' },
  unavailability: { label: 'Unavailability', color: '#E05252' },
};

const CANCEL_REASONS = [
  'Provider unavailable', 'Client unavailable', 'Family emergency',
  'Illness', 'Weather/travel issue', 'Scheduling conflict', 'Other',
];

// ─── Comment type ─────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  message: string;
  timestamp: Date;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1', authorName: 'Dr. Sarah Thompson', authorInitials: 'ST', authorColor: '#4F83CC',
    message: 'Updated goals for this session. Focusing on joint attention and social referencing.',
    timestamp: new Date(Date.now() - 3600000 * 2),
  },
  {
    id: 'c2', authorName: 'Dr. Michael Chen', authorInitials: 'MC', authorColor: '#2E9E63',
    message: 'Parent training completed. Caregiver is confident with prompting hierarchy.',
    timestamp: new Date(Date.now() - 86400000),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtShortDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function calcDuration(s: Session) {
  const mins = Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtShortDate(d);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  initials, color, square = false, size = 28, isDark,
}: { initials: string; color: string; square?: boolean; size?: number; isDark: boolean }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: square ? Math.max(5, size * 0.22) : '50%',
      backgroundColor: isDark ? `${color}28` : `${color}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: size * 0.36, fontWeight: 700,
        color: isDark ? `${color}ee` : color,
        fontFamily: 'inherit', userSelect: 'none',
      }}>
        {initials}
      </span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ children, c, isDark }: { children: React.ReactNode; c: AppColors; isDark: boolean }) {
  return (
    <div style={{
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${c.border}`,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ icon, label, c }: { icon: React.ReactNode; label: string; c: AppColors }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span style={{ color: c.t3, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Person row ───────────────────────────────────────────────────────────────

function PersonRow({
  name, subtitle, color, initials, square = false, isDark, c,
}: {
  name: string; subtitle?: string; color: string; initials: string;
  square?: boolean; isDark: boolean; c: AppColors;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <Avatar initials={initials} color={color} square={square} size={30} isDark={isDark} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: c.t0, fontWeight: 500 }}>{name}</div>
        {subtitle && <div style={{ fontSize: 11, color: c.t3, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Date/Time block ──────────────────────────────────────────────────────────

function DateTimeSection({ session, c, isDark }: { session: Session; c: AppColors; isDark: boolean }) {
  return (
    <SectionCard c={c} isDark={isDark}>
      <SectionLabel icon={<Calendar style={{ width: 12, height: 12 }} />} label="Date & Time" c={c} />
      <div style={{ fontSize: 13, fontWeight: 500, color: c.t0, marginBottom: 6 }}>
        {fmtDate(session.startTime)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock style={{ width: 12, height: 12, color: c.t3 }} />
        <span style={{ fontSize: 13, color: c.t1 }}>
          {fmtTime(session.startTime)} – {fmtTime(session.endTime)}
        </span>
        <span style={{
          fontSize: 11, color: c.t2,
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          padding: '2px 7px', borderRadius: 5,
        }}>
          {calcDuration(session)}
        </span>
        {session.eventType === 'recurring' && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: c.t2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            padding: '2px 7px', borderRadius: 5,
          }}>
            <RefreshCw style={{ width: 9, height: 9 }} />
            Recurring
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Notes section ────────────────────────────────────────────────────────────

function NoteSection({
  title, hasNote, noteText, onAdd, onView, c, isDark,
}: {
  title: string; hasNote: boolean; noteText?: string;
  onAdd: () => void; onView: () => void;
  c: AppColors; isDark: boolean;
}) {
  return (
    <SectionCard c={c} isDark={isDark}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel icon={<FileText style={{ width: 12, height: 12 }} />} label={title} c={c} />
        <Button
          variant="outline"
          size="sm"
          onClick={hasNote ? onView : onAdd}
          className="h-[26px] gap-1.5 rounded-md"
          style={{ fontSize: 12, fontFamily: 'inherit', marginTop: -10, color: c.t1 }}
        >
          {hasNote
            ? <><Eye style={{ width: 11, height: 11 }} /> View Note</>
            : <><Plus style={{ width: 11, height: 11 }} /> Add Note</>
          }
        </Button>
      </div>
      {hasNote && noteText && (
        <p style={{ fontSize: 13, color: c.t1, lineHeight: 1.6, margin: '4px 0 0', wordBreak: 'break-word' }}>
          {noteText}
        </p>
      )}
      {!hasNote && (
        <p style={{ fontSize: 12, color: c.t3, margin: 0, fontStyle: 'italic' }}>
          No note added yet.
        </p>
      )}
    </SectionCard>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ onConfirm, onClose, c, isDark }: {
  onConfirm: (reason: string) => void; onClose: () => void;
  c: AppColors; isDark: boolean;
}) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  const finalReason = reason === 'Other' ? custom.trim() : reason;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, borderRadius: 14, backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'rgba(224,82,82,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle style={{ width: 14, height: 14, color: '#E05252' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: c.t0 }}>Cancel Session</span>
          </div>
          <p style={{ fontSize: 13, color: c.t2, margin: '6px 0 0 39px', lineHeight: 1.5 }}>
            This session will be marked as cancelled. You can reactivate it later.
          </p>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: c.t2, marginBottom: 7 }}>Reason</div>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-[34px] text-[13px] mb-[10px]" style={{ fontFamily: 'inherit' }}>
              <SelectValue placeholder="Select a reason…" />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map(r => (
                <SelectItem key={r} value={r} className="text-[13px]">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {reason === 'Other' && (
            <Input
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Describe the reason…"
              className="h-[34px] text-[13px]"
              style={{ fontFamily: 'inherit' }}
            />
          )}
        </div>
        <div style={{ padding: '0 20px 18px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose} className="h-[34px] rounded-lg" style={{ fontSize: 13, fontFamily: 'inherit' }}>
            Keep Session
          </Button>
          <Button
            onClick={() => finalReason && onConfirm(finalReason)}
            disabled={!finalReason}
            className="h-[34px] rounded-lg bg-[#E05252] hover:bg-[#c94444] text-white border-0"
            style={{ fontSize: 13, fontFamily: 'inherit' }}
          >
            Cancel Session
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Editor Modal ────────────────────────────────────────────────────────

function NoteEditorModal({ title, initialText, onSave, onClose, c, isDark }: {
  title: string; initialText: string;
  onSave: (text: string) => void; onClose: () => void;
  c: AppColors; isDark: boolean;
}) {
  const [text, setText] = useState(initialText);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 460, borderRadius: 14, backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: c.t0 }}>{title}</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-md" style={{ color: c.t3 }}>
            <X style={{ width: 14, height: 14 }} />
          </Button>
        </div>
        <div style={{ padding: '14px 20px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} autoFocus rows={6}
            placeholder="Write your note here…"
            style={{ width: '100%', borderRadius: 8, border: `1px solid ${c.inputBorder}`, backgroundColor: c.inputBg, color: c.t0, fontSize: 13, padding: '10px 12px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose} className="h-[34px] rounded-lg" style={{ fontSize: 13, fontFamily: 'inherit' }}>
            Cancel
          </Button>
          <Button
            onClick={() => { onSave(text); onClose(); }}
            disabled={!text.trim()}
            className="h-[34px] rounded-lg"
            style={{ fontSize: 13, fontFamily: 'inherit' }}
          >
            Save Note
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────

function CommentsTab({ comments, onAddComment, currentUserName, currentUserInitials, currentUserColor, c, isDark }: {
  comments: Comment[]; onAddComment: (msg: string) => void;
  currentUserName: string; currentUserInitials: string; currentUserColor: string;
  c: AppColors; isDark: boolean;
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>
        {comments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare style={{ width: 17, height: 17, color: c.t3 }} />
            </div>
            <span style={{ fontSize: 13, color: c.t3 }}>No comments yet</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {comments.map(comment => (
              <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar initials={comment.authorInitials} color={comment.authorColor} size={30} isDark={isDark} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.t0 }}>{comment.authorName.split(' ').slice(0, 2).join(' ')}</span>
                    <span style={{ fontSize: 11, color: c.t3 }}>{timeAgo(comment.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: c.t1, lineHeight: 1.55, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${c.border}`, borderRadius: '4px 10px 10px 10px', padding: '8px 12px', wordBreak: 'break-word' }}>
                    {comment.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, padding: '10px 16px 16px', borderTop: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Avatar initials={currentUserInitials} color={currentUserColor} size={28} isDark={isDark} />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
              placeholder="Write a comment… (⌘Enter to send)"
              rows={2}
              style={{
                width: '100%', borderRadius: 9, border: `1px solid ${c.inputBorder}`,
                backgroundColor: c.inputBg, color: c.t0, fontSize: 13,
                padding: '8px 36px 8px 12px', outline: 'none', fontFamily: 'inherit',
                resize: 'none', lineHeight: 1.5, boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = c.inputFocus}
              onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = c.inputBorder}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 h-[26px] w-[26px] rounded-md"
              style={{
                backgroundColor: input.trim() ? c.t0 : 'transparent',
                color: input.trim() ? (isDark ? '#111' : '#fff') : c.t3,
              }}
            >
              <Send style={{ width: 12, height: 12 }} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Session Info tab ─────────────────────────────────────────────────────────

function SessionInfoTab({
  session, isCancelled, sessionNoteText, supervisionNoteText,
  onAddSessionNote, onViewSessionNote, onAddSupervisionNote, onViewSupervisionNote,
  c, isDark,
}: {
  session: Session; isCancelled: boolean;
  sessionNoteText: string; supervisionNoteText: string;
  onAddSessionNote: () => void; onViewSessionNote: () => void;
  onAddSupervisionNote: () => void; onViewSupervisionNote: () => void;
  c: AppColors; isDark: boolean;
}) {
  const { students: allStudents, providers: allProviders } = useParticipants();

  const getStudentAv = (name: string) => {
    const s = allStudents.find(x => x.name === name);
    return s ?? { avatarColor: '#4F83CC', initials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() };
  };
  const getProviderAv = (name: string) => {
    const p = allProviders.find(x => x.name === name);
    return p ?? { avatarColor: '#7C52D0', initials: name.split(' ').filter(Boolean).slice(-2).map(p => p[0]).join('').toUpperCase() };
  };

  const accentColor = session.color || '#4F83CC';

  return (
    <div style={{ padding: '14px 16px 20px' }}>
      <DateTimeSection session={session} c={c} isDark={isDark} />

      {session.providers.length > 0 && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<User style={{ width: 12, height: 12 }} />} label="Staff" c={c} />
          {session.providers.map(name => {
            const av = getProviderAv(name);
            return <PersonRow key={name} name={name} subtitle="Therapist" color={av.avatarColor} initials={av.initials} isDark={isDark} c={c} />;
          })}
        </SectionCard>
      )}

      {session.students.length > 0 && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<Users style={{ width: 12, height: 12 }} />} label="Learners" c={c} />
          {session.students.map(name => {
            const av = getStudentAv(name);
            return <PersonRow key={name} name={name} color={av.avatarColor} initials={av.initials} square isDark={isDark} c={c} />;
          })}
        </SectionCard>
      )}

      <SectionCard c={c} isDark={isDark}>
        <SectionLabel icon={<Stethoscope style={{ width: 12, height: 12 }} />} label="Services" c={c} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 6,
          backgroundColor: isDark ? `${accentColor}22` : `${accentColor}14`,
          border: `1px solid ${isDark ? `${accentColor}44` : `${accentColor}30`}`,
          fontSize: 12, fontWeight: 600, color: isDark ? `${accentColor}dd` : accentColor,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accentColor, display: 'inline-block', flexShrink: 0 }} />
          {session.serviceType}
        </span>
      </SectionCard>

      {!isCancelled && (
        <NoteSection title="Session Note" hasNote={!!sessionNoteText} noteText={sessionNoteText}
          onAdd={onAddSessionNote} onView={onViewSessionNote} c={c} isDark={isDark} />
      )}

      <NoteSection title="Supervision Note" hasNote={!!supervisionNoteText} noteText={supervisionNoteText}
        onAdd={onAddSupervisionNote} onView={onViewSupervisionNote} c={c} isDark={isDark} />
    </div>
  );
}

// ─── Supervision Info tab ─────────────────────────────────────────────────────

function SupervisionInfoTab({
  session, supervisionNoteText, onAddSupervisionNote, onViewSupervisionNote, c, isDark,
}: {
  session: Session; supervisionNoteText: string;
  onAddSupervisionNote: () => void; onViewSupervisionNote: () => void;
  c: AppColors; isDark: boolean;
}) {
  const { providers: allProviders } = useParticipants();
  const getProviderAv = (name: string) => {
    const p = allProviders.find(x => x.name === name);
    return p ?? { avatarColor: '#7C52D0', initials: name.split(' ').filter(Boolean).slice(-2).map(p => p[0]).join('').toUpperCase() };
  };

  const supervisor = session.providers[0];
  const staffList  = session.providers.slice(1);

  return (
    <div style={{ padding: '14px 16px 20px' }}>
      <DateTimeSection session={session} c={c} isDark={isDark} />

      {supervisor && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<User style={{ width: 12, height: 12 }} />} label="Supervisor" c={c} />
          {(() => { const av = getProviderAv(supervisor); return (
            <PersonRow name={supervisor} subtitle="BCBA / Supervisor" color={av.avatarColor} initials={av.initials} isDark={isDark} c={c} />
          ); })()}
        </SectionCard>
      )}

      {staffList.length > 0 && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<Users style={{ width: 12, height: 12 }} />} label="Staff Being Supervised" c={c} />
          {staffList.map(name => {
            const av = getProviderAv(name);
            return <PersonRow key={name} name={name} subtitle="RBT / Technician" color={av.avatarColor} initials={av.initials} isDark={isDark} c={c} />;
          })}
        </SectionCard>
      )}

      <SectionCard c={c} isDark={isDark}>
        <SectionLabel icon={<Stethoscope style={{ width: 12, height: 12 }} />} label="Services" c={c} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6,
          backgroundColor: isDark ? 'rgba(124,82,208,0.18)' : 'rgba(124,82,208,0.10)',
          border: `1px solid ${isDark ? 'rgba(124,82,208,0.4)' : 'rgba(124,82,208,0.25)'}`,
          fontSize: 12, fontWeight: 600, color: isDark ? '#C7B0E4' : '#7C52D0',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#7C52D0', display: 'inline-block', flexShrink: 0 }} />
          ABA Supervision
        </span>
      </SectionCard>

      <SectionCard c={c} isDark={isDark}>
        <SectionLabel icon={<Link2 style={{ width: 12, height: 12 }} />} label="Linked Session" c={c} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: c.t2, fontStyle: 'italic' }}>No session linked yet</div>
          <Button
            variant="outline"
            size="sm"
            className="h-[26px] gap-1.5 rounded-md"
            style={{ fontSize: 12, fontFamily: 'inherit', color: c.t2 }}
          >
            <Database style={{ width: 11, height: 11 }} />
            Open Data Collection
          </Button>
        </div>
      </SectionCard>

      <NoteSection title="Supervision Note" hasNote={!!supervisionNoteText} noteText={supervisionNoteText}
        onAdd={onAddSupervisionNote} onView={onViewSupervisionNote} c={c} isDark={isDark} />
    </div>
  );
}

// ─── Event Info tab ───────────────────────────────────────────────────────────

function EventInfoTab({ session, c, isDark }: { session: Session; c: AppColors; isDark: boolean }) {
  const { providers: allProviders } = useParticipants();
  const getProviderAv = (name: string) => {
    const p = allProviders.find(x => x.name === name);
    return p ?? { avatarColor: '#2E9E63', initials: name.split(' ').filter(Boolean).slice(-2).map(p => p[0]).join('').toUpperCase() };
  };
  return (
    <div style={{ padding: '14px 16px 20px' }}>
      <DateTimeSection session={session} c={c} isDark={isDark} />
      {session.providers.length > 0 && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<Users style={{ width: 12, height: 12 }} />} label="Staff" c={c} />
          {session.providers.map(name => {
            const av = getProviderAv(name);
            return <PersonRow key={name} name={name} color={av.avatarColor} initials={av.initials} isDark={isDark} c={c} />;
          })}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Unavailability Info tab ──────────────────────────────────────────────────

function UnavailabilityInfoTab({ session, c, isDark }: { session: Session; c: AppColors; isDark: boolean }) {
  const { providers: allProviders } = useParticipants();
  const getProviderAv = (name: string) => {
    const p = allProviders.find(x => x.name === name);
    return p ?? { avatarColor: '#E05252', initials: name.split(' ').filter(Boolean).slice(-2).map(p => p[0]).join('').toUpperCase() };
  };
  const isDefaultName = session.sessionName === 'Unavailable' || !session.sessionName;
  return (
    <div style={{ padding: '14px 16px 20px' }}>
      {!isDefaultName && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<AlertTriangle style={{ width: 12, height: 12 }} />} label="Reason" c={c} />
          <p style={{ fontSize: 13, color: c.t1, margin: 0, lineHeight: 1.5 }}>{session.sessionName}</p>
        </SectionCard>
      )}
      <DateTimeSection session={session} c={c} isDark={isDark} />
      {session.providers.length > 0 && (
        <SectionCard c={c} isDark={isDark}>
          <SectionLabel icon={<Users style={{ width: 12, height: 12 }} />} label="Staff" c={c} />
          {session.providers.map(name => {
            const av = getProviderAv(name);
            return <PersonRow key={name} name={name} color={av.avatarColor} initials={av.initials} isDark={isDark} c={c} />;
          })}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SessionDetailsPanelProps {
  session: Session | null;
  onClose: () => void;
  onEdit?: (session: Session) => void;
  onDelete?: (session: Session) => void;
  onTakeData?: () => void;
  onViewSummary?: () => void;
}

export function SessionDetailsPanel({ session, onClose, onEdit, onDelete, onTakeData, onViewSummary }: SessionDetailsPanelProps) {
  const { colors: c, isDark } = useTheme();
  const { providers } = useParticipants();

  const [activeTab, setActiveTab]               = useState<'info' | 'comments'>('info');
  const [isCancelled, setIsCancelled]           = useState(false);
  const [cancelReason, setCancelReason]         = useState('');
  const [showCancelModal, setShowCancelModal]   = useState(false);
  const [comments, setComments]                 = useState<Comment[]>(MOCK_COMMENTS);
  const [sessionNoteText, setSessionNoteText]   = useState(session?.notes ?? '');
  const [supervisionNoteText, setSupervisionNoteText] = useState('');
  const [showNoteEditor, setShowNoteEditor]     = useState(false);
  const [noteEditorTarget, setNoteEditorTarget] = useState<'session' | 'supervision'>('session');
  const [noteEditorInitial, setNoteEditorInitial] = useState('');

  useEffect(() => {
    if (session) {
      setActiveTab('info');
      setIsCancelled(false);
      setCancelReason('');
      setSessionNoteText(session.notes ?? '');
      setSupervisionNoteText('');
    }
  }, [session?.id]); // eslint-disable-line

  if (!session) return null;

  const category    = detectCategory(session);
  const meta        = CATEGORY_META[category];
  const canCancel   = category === 'session' || category === 'supervision';

  // Compute live status for title badge
  const sessionStatus = computeDetailedStatus(session, sessionNoteText, supervisionNoteText);
  const statusCfg     = SESSION_STATUS_CONFIG[sessionStatus];
  const statusText    = isDark ? statusCfg.textDark : statusCfg.text;
  const statusBg      = isDark ? statusCfg.bgDark   : statusCfg.bg;
  const statusIcon    = SESSION_STATUS_ICONS[sessionStatus];

  const currentUser         = providers[0];
  const currentUserInitials = currentUser?.initials   ?? 'U';
  const currentUserColor    = currentUser?.avatarColor ?? '#4F83CC';
  const currentUserName     = currentUser?.name        ?? 'You';

  const tabLabel: Record<EventCategory, string> = {
    session:        'Session Info',
    supervision:    'Supervision Info',
    event:          'Event Info',
    unavailability: 'Unavailability Info',
  };

  const handleCancelConfirm = (reason: string) => {
    setIsCancelled(true);
    setCancelReason(reason);
    setShowCancelModal(false);
  };

  const openNoteEditor = (target: 'session' | 'supervision') => {
    setNoteEditorTarget(target);
    setNoteEditorInitial(target === 'session' ? sessionNoteText : supervisionNoteText);
    setShowNoteEditor(true);
  };

  const handleNoteSave = (text: string) => {
    if (noteEditorTarget === 'session') setSessionNoteText(text);
    else setSupervisionNoteText(text);
  };

  const addComment = (msg: string) => {
    setComments(prev => [...prev, {
      id: `c-${Date.now()}`, authorName: currentUserName,
      authorInitials: currentUserInitials, authorColor: currentUserColor,
      message: msg, timestamp: new Date(),
    }]);
  };

  const footerButtons: {
    primary?: { label: string; icon: React.ReactNode; action: () => void };
    secondary?: { label: string; icon: React.ReactNode; action: () => void };
  } = {};
  if (category === 'session' && !isCancelled) {
    footerButtons.primary   = { label: 'Take Data',    icon: <Database  style={{ width: 13, height: 13 }} />, action: () => onTakeData?.() };
    footerButtons.secondary = { label: 'View Summary', icon: <BarChart2 style={{ width: 13, height: 13 }} />, action: () => onViewSummary?.() };
  } else if (category === 'supervision' && !isCancelled) {
    footerButtons.primary   = { label: 'Add Supervision Note', icon: <FileText  style={{ width: 13, height: 13 }} />, action: () => openNoteEditor('supervision') };
    footerButtons.secondary = { label: 'View Summary',         icon: <BarChart2 style={{ width: 13, height: 13 }} />, action: () => onViewSummary?.() };
  }

  const hasFooter = !!(footerButtons.primary || footerButtons.secondary);

  return (
    <>
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 400,
          backgroundColor: c.surface,
          borderLeft: `1px solid ${c.border}`,
          boxShadow: isDark ? '-6px 0 36px rgba(0,0,0,0.40)' : '-6px 0 36px rgba(0,0,0,0.09)',
          transition: 'background-color 0.2s',
        }}
      >
        {/* ── Header ── */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${c.border}`, padding: '0 16px' }}>

          {/* Row: ⋮ menu (left) · · · X close (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46 }}>

            {/* Three-dot menu — LEFT */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" style={{ color: c.t2, flexShrink: 0 }}>
                  <MoreVertical style={{ width: 16, height: 16 }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={4} className="min-w-[168px] rounded-lg p-1"
                style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>

                <DropdownMenuItem onSelect={() => onEdit?.(session)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[13px]"
                  style={{ color: c.t0 }}>
                  <Edit2 style={{ width: 13, height: 13 }} /> Edit
                </DropdownMenuItem>

                {canCancel && (
                  <>
                    <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: '3px 0' }} />
                    {isCancelled ? (
                      <DropdownMenuItem onSelect={() => { setIsCancelled(false); setCancelReason(''); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[13px]"
                        style={{ color: '#2E9E63' }}>
                        <RotateCcw style={{ width: 13, height: 13 }} /> Reactivate Session
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => setShowCancelModal(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[13px]"
                        style={{ color: '#E07B39' }}>
                        <CheckCircle style={{ width: 13, height: 13 }} /> Cancel Session
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                <DropdownMenuSeparator style={{ backgroundColor: c.divider, margin: '3px 0' }} />
                <DropdownMenuItem onSelect={() => onDelete?.(session)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[13px]"
                  style={{ color: c.danger }}>
                  <Trash2 style={{ width: 13, height: 13 }} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close button — RIGHT */}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-md" style={{ color: c.t3, flexShrink: 0 }}>
              <X style={{ width: 14, height: 14 }} />
            </Button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
            {(['info', 'comments'] as const).map(tab => {
              const isActive = activeTab === tab;
              const label = tab === 'info' ? tabLabel[category] : 'Comments';
              return (
                <Button
                  key={tab}
                  variant="ghost"
                  onClick={() => setActiveTab(tab)}
                  className="rounded-none h-auto px-3.5"
                  style={{
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? c.t0 : c.t3,
                    borderBottom: isActive ? `2px solid ${c.t0}` : '2px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                  {tab === 'comments' && comments.length > 0 && (
                    <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 600, backgroundColor: c.navActive, color: c.t2, padding: '1px 5px', borderRadius: 8 }}>
                      {comments.length}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* ── Title block (Info tab only) ── */}
        {activeTab === 'info' && (
          <div style={{ flexShrink: 0, padding: '14px 20px 12px', borderBottom: `1px solid ${c.divider}` }}>
            {/* Session/event name */}
            <h2 style={{
              fontSize: 16, fontWeight: 600, color: c.t0,
              margin: '0 0 8px 0', lineHeight: 1.25, wordBreak: 'break-word',
              fontFamily: 'inherit',
            }}>
              {session.sessionName || session.students?.[0] || 'Event'}
            </h2>

            {/* Status badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Category badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 500,
                color: isDark ? `${meta.color}cc` : meta.color,
                backgroundColor: isDark ? `${meta.color}20` : `${meta.color}12`,
                padding: '2px 8px', borderRadius: 5,
              }}>
                {meta.label}
              </span>

              {/* Status badge (session type only) */}
              {category === 'session' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500,
                  color: statusText,
                  backgroundColor: statusBg,
                  padding: '2px 8px', borderRadius: 5,
                }}>
                  <span style={{ display: 'flex', color: statusText }}>{statusIcon}</span>
                  {statusCfg.label}
                </span>
              )}

              {/* Cancelled badge */}
              {isCancelled && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500, color: '#E05252',
                  backgroundColor: 'rgba(224,82,82,0.10)',
                  padding: '2px 8px', borderRadius: 5,
                }}>
                  <AlertTriangle style={{ width: 9, height: 9 }} />
                  Cancelled{cancelReason ? ` · ${cancelReason}` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {activeTab === 'info' ? (
            <ScrollArea className="h-full">
              {category === 'session' && (
                <SessionInfoTab
                  session={session} isCancelled={isCancelled}
                  sessionNoteText={sessionNoteText} supervisionNoteText={supervisionNoteText}
                  onAddSessionNote={() => openNoteEditor('session')}
                  onViewSessionNote={() => openNoteEditor('session')}
                  onAddSupervisionNote={() => openNoteEditor('supervision')}
                  onViewSupervisionNote={() => openNoteEditor('supervision')}
                  c={c} isDark={isDark}
                />
              )}
              {category === 'supervision' && (
                <SupervisionInfoTab
                  session={session} supervisionNoteText={supervisionNoteText}
                  onAddSupervisionNote={() => openNoteEditor('supervision')}
                  onViewSupervisionNote={() => openNoteEditor('supervision')}
                  c={c} isDark={isDark}
                />
              )}
              {category === 'event' && (
                <EventInfoTab session={session} c={c} isDark={isDark} />
              )}
              {category === 'unavailability' && (
                <UnavailabilityInfoTab session={session} c={c} isDark={isDark} />
              )}
            </ScrollArea>
          ) : (
            <CommentsTab
              comments={comments} onAddComment={addComment}
              currentUserName={currentUserName}
              currentUserInitials={currentUserInitials}
              currentUserColor={currentUserColor}
              c={c} isDark={isDark}
            />
          )}
        </div>

        {/* ── Footer actions ── */}
        {hasFooter && activeTab === 'info' && (
          <div style={{
            flexShrink: 0, borderTop: `1px solid ${c.border}`,
            padding: '12px 16px', display: 'flex', gap: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
          }}>
            {footerButtons.primary && (
              <Button
                onClick={footerButtons.primary.action}
                className="flex-1 h-9 gap-1.5 rounded-[9px]"
                style={{ fontSize: 13, fontFamily: 'inherit' }}
              >
                {footerButtons.primary.icon}
                {footerButtons.primary.label}
              </Button>
            )}
            {footerButtons.secondary && (
              <Button
                variant="outline"
                onClick={footerButtons.secondary.action}
                className="h-9 gap-1.5 rounded-[9px]"
                style={{ fontSize: 13, fontFamily: 'inherit', color: c.t1, whiteSpace: 'nowrap' }}
              >
                {footerButtons.secondary.icon}
                {footerButtons.secondary.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {showCancelModal && (
        <CancelModal onConfirm={handleCancelConfirm} onClose={() => setShowCancelModal(false)} c={c} isDark={isDark} />
      )}
      {showNoteEditor && (
        <NoteEditorModal
          title={noteEditorTarget === 'session' ? 'Session Note' : 'Supervision Note'}
          initialText={noteEditorInitial}
          onSave={handleNoteSave}
          onClose={() => setShowNoteEditor(false)}
          c={c} isDark={isDark}
        />
      )}
    </>
  );
}