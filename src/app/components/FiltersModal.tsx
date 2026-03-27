import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FiltersState {
  students: string[];
}

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (filters: FiltersState) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_CATEGORIES = [
  'Students',
  'School',
  'Teacher',
  'Grade',
  'Custom Events',
  'Room Number',
  'Case Manager',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function FiltersModal({ isOpen, onClose, onApply }: FiltersModalProps) {
  const { colors: c, isDark } = useTheme();
  const { students } = useParticipants();

  const [activeCategory, setActiveCategory] = useState('Students');
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showFilteredOnly, setShowFilteredOnly] = useState(false);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every(s => selectedStudents.includes(s.name));

  const someSelected =
    filteredStudents.some(s => selectedStudents.includes(s.name)) && !allSelected;

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedStudents(prev => [
        ...new Set([...prev, ...filteredStudents.map(s => s.name)]),
      ]);
    } else {
      const filtered = new Set(filteredStudents.map(s => s.name));
      setSelectedStudents(prev => prev.filter(n => !filtered.has(n)));
    }
  };

  const handleToggleStudent = (name: string) =>
    setSelectedStudents(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );

  const handleClear = () => {
    setSelectedStudents([]);
    setSearchQuery('');
    setShowFilteredOnly(false);
  };

  const handleApply = () => {
    onApply?.({ students: selectedStudents });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="p-0 overflow-hidden gap-0"
        style={{
          maxWidth: 660,
          width: '100%',
          height: 520,
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          boxShadow: isDark
            ? '0 8px 40px rgba(0,0,0,0.50)'
            : '0 8px 40px rgba(0,0,0,0.16)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription>Filter calendar sessions by category</DialogDescription>
        </DialogHeader>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px 12px',
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: c.t0 }}>Filters</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 rounded-md"
            style={{ color: c.t3 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </Button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left sidebar */}
          <div style={{
            width: 200, flexShrink: 0,
            borderRight: `1px solid ${c.border}`,
            padding: '8px 0',
            overflowY: 'auto',
          }}>
            {FILTER_CATEGORIES.map(cat => {
              const isActive    = activeCategory === cat;
              const hasFilters  = cat === 'Students' && selectedStudents.length > 0;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: isActive ? 500 : 400,
                    textAlign: 'left',
                    color: isActive ? c.t0 : c.t2,
                    backgroundColor: isActive
                      ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(59,130,246,0.07)')
                      : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover;
                  }}
                  onMouseLeave={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <span>{cat}</span>
                  {hasFilters && (
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      backgroundColor: '#3B82F6', flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeCategory === 'Students' ? (
              <>
                {/* Search input */}
                <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{
                      position: 'absolute', left: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      width: 14, height: 14, color: c.t3, pointerEvents: 'none',
                    }} />
                    <Input
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        paddingLeft: 30, height: 34, fontSize: 13,
                        backgroundColor: c.inputBg,
                        borderColor: c.inputBorder,
                        color: c.t0,
                      }}
                    />
                  </div>
                </div>

                {/* Count + Select all */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '2px 14px 8px',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 13, color: c.t3 }}>
                    {filteredStudents.length} Total
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: c.t2 }}>Select all</span>
                    <Checkbox
                      checked={someSelected ? 'indeterminate' : allSelected}
                      onCheckedChange={handleSelectAll}
                      className="h-[18px] w-[18px] rounded"
                      style={{
                        borderColor: allSelected || someSelected ? '#3B82F6' : c.border,
                        backgroundColor: allSelected || someSelected ? '#3B82F6' : 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* Student list */}
                <ScrollArea className="flex-1" style={{ borderTop: `1px solid ${c.divider}` }}>
                  <div style={{ padding: '6px 6px 0' }}>
                    {filteredStudents.map(student => {
                      const isChecked = selectedStudents.includes(student.name);
                      return (
                        <div
                          key={student.id}
                          onClick={() => handleToggleStudent(student.name)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '8px 10px', borderRadius: 8,
                            cursor: 'pointer',
                            backgroundColor: isChecked
                              ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)')
                              : 'transparent',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={e => {
                            if (!isChecked)
                              (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = isChecked
                              ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)')
                              : 'transparent';
                          }}
                        >
                          {/* Colored square avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                            backgroundColor: student.avatarColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
                              {student.initials}
                            </span>
                          </div>

                          {/* Name */}
                          <span style={{ flex: 1, fontSize: 14, color: c.t0 }}>
                            {student.name}
                          </span>

                          {/* Checkbox */}
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleStudent(student.name)}
                            onClick={e => e.stopPropagation()}
                            className="h-[18px] w-[18px] rounded"
                            style={{
                              borderColor: isChecked ? '#3B82F6' : c.border,
                              backgroundColor: isChecked ? '#3B82F6' : 'transparent',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Show filtered only toggle */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px 14px',
                    borderTop: `1px solid ${c.divider}`, marginTop: 6,
                  }}>
                    <Switch
                      checked={showFilteredOnly}
                      onCheckedChange={setShowFilteredOnly}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 13, color: c.t2 }}>Show filtered students only</span>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8,
              }}>
                <span style={{ fontSize: 13, color: c.t3 }}>
                  No filters available for {activeCategory}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: `1px solid ${c.border}`,
          flexShrink: 0,
        }}>
          <Button
            variant="outline"
            onClick={handleClear}
            style={{
              fontSize: 13, fontWeight: 500,
              color: c.t1, borderColor: c.border,
              backgroundColor: 'transparent',
            }}
          >
            Clear all
          </Button>
          <Button
            onClick={handleApply}
            style={{
              fontSize: 13, fontWeight: 500,
              backgroundColor: '#3B82F6', color: '#fff',
              border: 'none', borderRadius: 8,
              paddingLeft: 20, paddingRight: 20, height: 36,
            }}
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
