import React, { useState } from 'react';
import { Search, Plus, ListFilter, MoreVertical, Trash2, Eye, UserRound } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import type { Student } from '../context/ParticipantsContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from './ui/table';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from './ui/dialog';
import { Label } from './ui/label';
import { LearnerDetailView } from './LearnerDetailView';
import type { LearnerRow } from './LearnerDetailView';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function studentToRow(s: Student): LearnerRow {
  return { id: s.id, name: s.name, dob: s.dob ?? '', collaborators: [], school: '', city: '', state: '' };
}

// ─── Add Learner Dialog ───────────────────────────────────────────────────────

function AddLearnerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors: c } = useTheme();
  const { addStudent } = useParticipants();
  const [name, setName] = useState('');
  const [dob,  setDob]  = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addStudent(name.trim(), dob.trim() || undefined);
    setName(''); setDob('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent style={{ maxWidth: 380, backgroundColor: c.surface, border: `1px solid ${c.border}`, zIndex: 200 }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 15, color: c.t0 }}>Add Learner</DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: c.t3 }}>
            Create a new learner profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0 16px' }}>
            <div>
              <Label style={{ fontSize: 12, color: c.t2, marginBottom: 6, display: 'block' }}>
                Name <span style={{ color: '#E05252' }}>*</span>
              </Label>
              <Input
                autoFocus
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-8 focus-visible:ring-1"
                style={{ fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: c.t2, marginBottom: 6, display: 'block' }}>
                Date of Birth <span style={{ color: c.t3 }}>(optional)</span>
              </Label>
              <Input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="h-8 focus-visible:ring-1"
                style={{ fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} style={{ fontSize: 13 }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()} style={{ fontSize: 13 }}>
              Add Learner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({ learner, onClose }: { learner: Student | null; onClose: () => void }) {
  const { colors: c } = useTheme();
  const { deleteStudent } = useParticipants();

  const handleConfirm = () => {
    if (learner) deleteStudent(learner.id);
    onClose();
  };

  return (
    <Dialog open={!!learner} onOpenChange={o => !o && onClose()}>
      <DialogContent style={{ maxWidth: 360, backgroundColor: c.surface, border: `1px solid ${c.border}`, zIndex: 200 }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 15, color: c.t0 }}>Delete Learner</DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: c.t2 }}>
            Remove <strong>{learner?.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter style={{ gap: 8, paddingTop: 4 }}>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontSize: 13 }}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} style={{ fontSize: 13 }}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LearnersPage() {
  const { colors, isDark } = useTheme();
  const { students, loading } = useParticipants();

  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [detailId,  setDetailId]  = useState<string | null>(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const c = colors;

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const allSelected  = filtered.length > 0 && filtered.every(s => selected.has(s.id));
  const someSelected = filtered.some(s => selected.has(s.id));

  const toggleAll = () =>
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach(s => next.delete(s.id));
      else             filtered.forEach(s => next.add(s.id));
      return next;
    });

  const toggleRow = (id: string) =>
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // Show detail view
  const detailLearner = students.find(s => s.id === detailId);
  if (detailLearner) {
    const allRows = students.map(studentToRow);
    return (
      <LearnerDetailView
        learner={studentToRow(detailLearner)}
        allLearners={allRows}
        onBack={() => setDetailId(null)}
        onSelectLearner={setDetailId}
      />
    );
  }

  // ── Style tokens ────────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'inherit',
    color: c.t2, height: 30, paddingTop: 0, paddingBottom: 0, whiteSpace: 'nowrap',
    userSelect: 'none', backgroundColor: isDark ? c.surface : 'var(--secondary)',
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 'var(--text-base)', fontFamily: 'inherit', color: c.t2, height: 42,
    paddingTop: 0, paddingBottom: 0,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: c.appBg }}>

      {/* Header */}
      <div style={{ height: 40, display: 'flex', alignItems: 'center', paddingLeft: 20, paddingRight: 20, flexShrink: 0, borderBottom: `1px solid ${c.border}`, backgroundColor: c.appBg }}>
        <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'inherit', color: c.t0, letterSpacing: '-0.01em' }}>
          Learners
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ padding: 20 }}>

          {/* Toolbar */}
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 240, flexShrink: 0 }}>
              <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: c.t3, pointerEvents: 'none', zIndex: 1 }} />
              <Input
                placeholder="Search learners…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ring/60"
                style={{ paddingLeft: 30, fontSize: 'var(--text-base)', fontFamily: 'inherit', borderRadius: 'var(--radius-button)', height: 32 }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-md" style={{ color: c.t2 }} title="Filter">
              <ListFilter style={{ width: 14, height: 14 }} />
            </Button>
            <Button variant="secondary" size="sm" className="h-8 gap-1.5 rounded-md"
              style={{ fontSize: 'var(--text-base)', fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)', paddingLeft: 12, paddingRight: 12, color: c.t1 }}
              onClick={() => setAddOpen(true)}
            >
              <Plus style={{ width: 13, height: 13 }} />
              Add Learner
            </Button>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: isDark ? c.surface : 'var(--background)', border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b" style={{ borderColor: c.border }}>
                  <TableHead style={{ ...thStyle, width: 44, paddingLeft: 16, paddingRight: 8 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      style={{ width: 14, height: 14, accentColor: c.t0, cursor: 'pointer' }}
                    />
                  </TableHead>
                  <TableHead style={{ ...thStyle, paddingLeft: 6, minWidth: 160 }}>Learner Name</TableHead>
                  <TableHead style={{ ...thStyle, width: 140 }}>Date of Birth</TableHead>
                  <TableHead style={{ ...thStyle, width: 56, textAlign: 'center' }}>Menu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={4} style={{ textAlign: 'center', padding: '48px 16px', color: c.t3, fontSize: 'var(--text-base)', fontFamily: 'inherit' }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={4} style={{ textAlign: 'center', padding: '56px 16px', fontFamily: 'inherit' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: c.t3 }}>
                        <UserRound size={28} style={{ opacity: 0.35 }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: c.t2 }}>No learners yet</span>
                        <span style={{ fontSize: 12 }}>Click "Add Learner" to get started</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((learner, idx) => {
                  const isChecked = selected.has(learner.id);
                  const isLast    = idx === filtered.length - 1;
                  return (
                    <TableRow
                      key={learner.id}
                      className="border-b transition-colors"
                      style={{ borderColor: isLast ? 'transparent' : c.border, backgroundColor: isChecked ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.022)') : 'transparent', cursor: 'pointer' }}
                      onClick={e => {
                        const t = e.target as HTMLElement;
                        if (t.closest('[type="checkbox"]') || t.closest('button') || t.closest('[role="menu"]')) return;
                        setDetailId(learner.id);
                      }}
                      onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.016)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isChecked ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.022)') : 'transparent'; }}
                    >
                      <TableCell style={{ ...tdStyle, width: 44, paddingLeft: 16, paddingRight: 8 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleRow(learner.id)} style={{ width: 14, height: 14, accentColor: c.t0, cursor: 'pointer' }} />
                      </TableCell>
                      <TableCell style={{ ...tdStyle, paddingLeft: 6 }}>
                        <span style={{ fontWeight: 'var(--font-weight-medium)', color: c.t0, fontFamily: 'inherit', fontSize: 'var(--text-base)' }}>
                          {learner.name}
                        </span>
                      </TableCell>
                      <TableCell style={tdStyle}>
                        {learner.dob ? new Date(learner.dob).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell style={{ ...tdStyle, width: 56, textAlign: 'center', paddingLeft: 0, paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-button)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', outline: 'none' }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                              >
                                <MoreVertical style={{ width: 16, height: 16 }} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4}>
                              <DropdownMenuItem onClick={() => setDetailId(learner.id)}>
                                <Eye style={{ width: 13, height: 13 }} /> View profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(learner)}>
                                <Trash2 style={{ width: 13, height: 13 }} /> Delete learner
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AddLearnerDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <DeleteDialog learner={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
