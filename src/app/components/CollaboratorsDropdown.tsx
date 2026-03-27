import React, { useState, useRef, useEffect } from 'react';
import { Check, Users, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useParticipants } from '../context/ParticipantsContext';
import type { AppColors } from '../context/ThemeContext';

// ─── Mini avatar ─────────────────────────────────────────────────────────────

function MiniAvatar({
  initials, color, size = 22, ring,
}: { initials: string; color: string; size?: number; ring?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: `${color}1a`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: color,
      flexShrink: 0, userSelect: 'none',
      ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}),
    }}>
      {initials}
    </div>
  );
}

// ─── CollaboratorsDropdown ────────────────────────────────────────────────────

interface CollaboratorsDropdownProps {
  /** Provider names that are currently "active". Empty = show all. */
  selected: string[];
  onChange: (v: string[]) => void;
}

export function CollaboratorsDropdown({ selected, onChange }: CollaboratorsDropdownProps) {
  const { colors: c, isDark } = useTheme();
  const { providers } = useParticipants();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Current user = first provider
  const currentUser = providers[0]?.name ?? '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter(x => x !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Visible avatars in trigger (max 3)
  const visibleSelected = selected.slice(0, 3);
  const overflow = selected.length - 3;
  const isAllSelected = selected.length === 0;

  // Build trigger display
  const triggerAvatars = isAllSelected ? providers.slice(0, 3) : visibleSelected.map(name => {
    const p = providers.find(pr => pr.name === name);
    return p ? { name: p.name, initials: p.initials, avatarColor: p.avatarColor } : null;
  }).filter(Boolean) as typeof providers;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(''); }}
        title="View collaborators"
        style={{
          height: 28, display: 'flex', alignItems: 'center', gap: 5,
          padding: '0 9px',
          border: `1px solid ${open ? c.inputFocus : c.inputBorder}`,
          borderRadius: 8,
          backgroundColor: open ? c.navActive : 'transparent',
          cursor: 'pointer', outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.14s, background-color 0.14s',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.backgroundColor = c.navHover; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        {/* Stacked avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {triggerAvatars.length === 0 ? (
            <Users style={{ width: 13, height: 13, color: c.t3 }} />
          ) : (
            triggerAvatars.map((p, i) => (
              <div
                key={p.name}
                style={{ marginLeft: i > 0 ? -6 : 0, zIndex: triggerAvatars.length - i }}
              >
                <MiniAvatar
                  initials={p.initials}
                  color={p.avatarColor}
                  size={20}
                  ring={c.navBg}
                />
              </div>
            ))
          )}
          {overflow > 0 && (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: c.navActive,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: c.t2,
              marginLeft: -6, zIndex: 0,
              boxShadow: `0 0 0 2px ${c.navBg}`,
            }}>
              +{overflow}
            </div>
          )}
        </div>

        {/* Label */}
        <span style={{ fontSize: 12, color: c.t2, fontWeight: 500 }}>
          {isAllSelected
            ? 'All'
            : selected.length === 1
              ? selected[0].split(' ')[1] || selected[0].split(' ')[0]
              : `${selected.length} people`
          }
        </span>

        <ChevronDown style={{
          width: 12, height: 12, color: c.t3, flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s',
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 240, zIndex: 300,
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          boxShadow: isDark
            ? '0 4px 6px -1px rgba(0,0,0,0.4), 0 10px 24px -4px rgba(0,0,0,0.5)'
            : '0 4px 6px -1px rgba(0,0,0,0.06), 0 10px 24px -4px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: `1px solid ${c.divider}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
              Collaborators
            </div>
            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…"
              style={{
                width: '100%', height: 28, borderRadius: 6,
                border: `1px solid ${c.inputBorder}`,
                backgroundColor: c.inputBg,
                color: c.t0, fontSize: 12,
                padding: '0 8px', outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>

          {/* Provider list */}
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
            {/* "All" option */}
            <div
              onClick={() => onChange([])}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', cursor: 'pointer',
                backgroundColor: isAllSelected ? c.navActive : 'transparent',
                transition: 'background-color 0.08s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = isAllSelected ? c.navActive : c.navHover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = isAllSelected ? c.navActive : 'transparent'}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                backgroundColor: c.navHover, border: `1px dashed ${c.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users style={{ width: 11, height: 11, color: c.t3 }} />
              </div>
              <span style={{ flex: 1, fontSize: 13, color: c.t0 }}>All staff</span>
              {isAllSelected && <Check style={{ width: 12, height: 12, color: c.accent }} />}
            </div>

            <div style={{ height: 1, backgroundColor: c.divider, margin: '3px 12px' }} />

            {filtered.map(p => {
              const isSel = selected.includes(p.name);
              const isYou = p.name === currentUser;
              return (
                <div
                  key={p.id}
                  onClick={() => toggle(p.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '6px 12px', cursor: 'pointer',
                    backgroundColor: isSel ? c.navActive : 'transparent',
                    transition: 'background-color 0.08s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : c.navHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = isSel ? c.navActive : 'transparent'}
                >
                  <MiniAvatar initials={p.initials} color={p.avatarColor} size={22} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: c.t0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      {isYou && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, color: c.accent,
                          backgroundColor: c.accentMuted,
                          padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  {isSel && <Check style={{ width: 12, height: 12, color: c.accent, flexShrink: 0 }} />}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: c.t3 }}>
                No results
              </div>
            )}
          </div>

          {/* Footer hint */}
          {selected.length > 0 && (
            <div style={{
              borderTop: `1px solid ${c.divider}`,
              padding: '7px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: c.t3 }}>
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  fontSize: 11, color: c.t3, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                  fontFamily: 'inherit',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = c.t1}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = c.t3}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}