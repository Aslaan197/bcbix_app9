import React, { useState } from 'react';
import { Plus, LayoutTemplate, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import type { ProgramTemplate } from './ProgramTemplatesPage';
import { useTheme } from '../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templates: ProgramTemplate[];
  onCreateScratch: () => void;
  onSelectTemplate: (template: ProgramTemplate) => void;
}

type Step = 'choose' | 'templates';

// ─── Component ────────────────────────────────────────────────────────────────

export function AddProgramModal({
  isOpen, onClose, templates, onCreateScratch, onSelectTemplate,
}: Props) {
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState<Step>('choose');
  const [search, setSearch] = useState('');

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  function handleClose() {
    setStep('choose');
    setSearch('');
    onClose();
  }

  const optionStyle = (borderColor: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${borderColor}`,
    background: isDark ? colors.surface : 'var(--background)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'border-color 0.15s',
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent
        className="gap-0 p-0 overflow-hidden"
        style={{ maxWidth: 400 }}
      >
        {step === 'choose' ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-0">
              <DialogTitle
                style={{
                  fontSize: 'var(--text-base)',
                  fontFamily: 'inherit',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: colors.t0,
                }}
              >
                Add Program
              </DialogTitle>
            </DialogHeader>

            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Create from Scratch */}
              <Button
                variant="ghost"
                className="h-auto p-0 w-full text-left block"
                style={optionStyle(colors.border)}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#4F83CC')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = colors.border)}
                onClick={() => { handleClose(); onCreateScratch(); }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: '#EEF2FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Plus style={{ width: 18, height: 18, color: '#4F83CC' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: colors.t0,
                    fontFamily: 'inherit',
                    marginBottom: 2,
                  }}>
                    Create from Scratch
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                    Build a custom program with new targets
                  </div>
                </div>
                <ChevronRight style={{ width: 15, height: 15, color: colors.t3, flexShrink: 0 }} />
              </Button>

              {/* Use Program Template */}
              <Button
                variant="ghost"
                className="h-auto p-0 w-full text-left block"
                style={optionStyle(colors.border)}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#7C52D0')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = colors.border)}
                onClick={() => setStep('templates')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: '#F3E8FD',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <LayoutTemplate style={{ width: 18, height: 18, color: '#7C52D0' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: colors.t0,
                    fontFamily: 'inherit',
                    marginBottom: 2,
                  }}>
                    Use Program Template
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit' }}>
                    Start from a template — {templates.length} available
                  </div>
                </div>
                <ChevronRight style={{ width: 15, height: 15, color: colors.t3, flexShrink: 0 }} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-5 pt-5 pb-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setSearch(''); setStep('choose'); }}
                  className="h-[26px] w-[26px] flex-shrink-0"
                  style={{ color: colors.t3 }}
                >
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                </Button>
                <DialogTitle
                  style={{
                    fontSize: 'var(--text-base)',
                    fontFamily: 'inherit',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: colors.t0,
                  }}
                >
                  Choose a Template
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* Search */}
            <div style={{ padding: '0 20px 10px', position: 'relative' }}>
              <Search style={{
                position: 'absolute', left: 29, top: '50%', transform: 'translateY(-50%)',
                width: 13, height: 13, color: colors.t3, pointerEvents: 'none',
              }} />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{
                  paddingLeft: 30,
                  fontSize: 'var(--text-base)',
                  fontFamily: 'inherit',
                  borderRadius: 'var(--radius-button)',
                }}
                autoFocus
              />
            </div>

            {/* Template list */}
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '24px 0',
                  fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit',
                }}>
                  No templates found
                </div>
              ) : (
                filtered.map(tpl => (
                  <Button
                    key={tpl.id}
                    variant="ghost"
                    className="h-auto p-0 w-full text-left block"
                    onClick={() => { handleClose(); onSelectTemplate(tpl); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 'var(--radius)',
                      border: `1px solid ${colors.border}`,
                      background: isDark ? colors.surface : 'var(--background)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = tpl.color)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = colors.border)}
                  >
                    {/* Color dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: tpl.color, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: colors.t0, fontFamily: 'inherit',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {tpl.title}
                      </div>
                      {tpl.description && (
                        <div style={{
                          fontSize: 'var(--text-xs)', color: colors.t3, fontFamily: 'inherit',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {tpl.description}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 'var(--text-xs)', color: colors.t3,
                      fontFamily: 'inherit', flexShrink: 0,
                    }}>
                      {tpl.targets.length} target{tpl.targets.length !== 1 ? 's' : ''}
                    </span>
                  </Button>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
