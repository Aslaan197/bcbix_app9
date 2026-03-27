import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useParticipants } from '../context/ParticipantsContext';
import { useTheme } from '../context/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

// ─── Inline edit row ──────────────────────────────────────────────────────────

function EditRow({
  value,
  onSave,
  onCancel,
  c,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  c: ReturnType<typeof useTheme>['colors'];
}) {
  const [text, setText] = useState(value);
  const submit = () => { if (text.trim()) onSave(text.trim()); };
  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        className="h-8 flex-1 rounded-lg text-sm focus-visible:ring-1"
        style={{ color: c.t0, backgroundColor: c.inputBg, borderColor: c.inputBorder }}
      />
      <Button type="button" size="icon" onClick={submit} disabled={!text.trim()}
        className="h-8 w-8 rounded-lg flex-shrink-0"
        style={{ backgroundColor: c.btnPrimBg, color: c.btnPrimText, border: 'none' }}
      >
        <Check style={{ width: 13, height: 13 }} />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onCancel}
        className="h-8 w-8 rounded-lg flex-shrink-0" style={{ color: c.t3 }}
      >
        <X style={{ width: 13, height: 13 }} />
      </Button>
    </div>
  );
}

// ─── Add Staff dialog ─────────────────────────────────────────────────────────

function AddStaffDialog({ open, onClose, c }: {
  open: boolean;
  onClose: () => void;
  c: ReturnType<typeof useTheme>['colors'];
}) {
  const { addProvider } = useParticipants();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProvider(name.trim());
    setName(''); setRole('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent style={{ maxWidth: 360, backgroundColor: c.surface, border: `1px solid ${c.border}`, zIndex: 300 }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 14, color: c.t0 }}>Add Staff</DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: c.t3 }}>Add a new staff member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: c.t2, marginBottom: 5 }}>
                Name <span style={{ color: '#E05252' }}>*</span>
              </label>
              <Input autoFocus placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
                className="h-8 focus-visible:ring-1"
                style={{ fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: c.t2, marginBottom: 5 }}>
                Role <span style={{ color: c.t3 }}>(optional)</span>
              </label>
              <Input placeholder="e.g. BCBA, RBT, OT" value={role} onChange={e => setRole(e.target.value)}
                className="h-8 focus-visible:ring-1"
                style={{ fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} style={{ fontSize: 13 }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!name.trim()} style={{ fontSize: 13 }}>Add Staff</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Staff list ───────────────────────────────────────────────────────────────

function StaffList() {
  const { colors: c } = useTheme();
  const { providers, updateProvider, deleteProvider } = useParticipants();
  const [editId,   setEditId]   = useState<string | null>(null);
  const [addOpen,  setAddOpen]  = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
        {providers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: c.t3, fontSize: 13, fontFamily: 'inherit' }}>
            No staff yet
          </div>
        )}
        {providers.map(p => (
          <div key={p.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 8, transition: 'background-color 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            {editId === p.id ? (
              <EditRow value={p.name} onSave={v => { updateProvider(p.id, v); setEditId(null); }} onCancel={() => setEditId(null)} c={c} />
            ) : (
              <>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, backgroundColor: p.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {p.initials}
                </div>
                <span style={{ flex: 1, fontSize: 13, color: c.t0 }}>{p.name}</span>
                <button onClick={() => setEditId(p.id)}
                  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.t3, flexShrink: 0 }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = c.navActive; el.style.color = c.t1; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = 'transparent'; el.style.color = c.t3; }}
                >
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>
                <button onClick={() => deleteProvider(p.id)}
                  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.t3, flexShrink: 0 }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = c.dangerHover; el.style.color = c.danger; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = 'transparent'; el.style.color = c.t3; }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 8, width: '100%', border: `1px dashed ${c.border}`, backgroundColor: 'transparent', color: c.t3, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.14s, color 0.14s' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.t2; el.style.color = c.t1; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.border; el.style.color = c.t3; }}
      >
        <Plus style={{ width: 13, height: 13 }} />
        Add Staff
      </button>

      <AddStaffDialog open={addOpen} onClose={() => setAddOpen(false)} c={c} />
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

interface ManageParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'students' | 'providers';
}

export function ManageParticipantsModal({ isOpen, onClose }: ManageParticipantsModalProps) {
  const { colors: c, isDark } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: 460, width: '100%',
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 12px 40px rgba(0,0,0,0.14)',
          zIndex: 200,
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Manage Staff</DialogTitle>
          <DialogDescription>Add, edit, or remove staff members</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: c.t0 }}>Manage Staff</span>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-md" style={{ color: c.t3 }}>
            <X style={{ width: 14, height: 14 }} />
          </Button>
        </div>

        <Separator style={{ backgroundColor: c.divider, margin: '14px 0 0' }} />

        {/* Content */}
        <div style={{ padding: '14px 20px 20px', maxHeight: 420, overflowY: 'auto' }}>
          <StaffList />
        </div>
      </DialogContent>
    </Dialog>
  );
}
