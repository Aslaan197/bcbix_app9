import React from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CreateDropdownProps {
  onScheduleSession: () => void;
  // kept for interface compatibility but not used
  onAutoSchedule?: () => void;
}

export function CreateDropdown({ onScheduleSession }: CreateDropdownProps) {
  const { colors: c } = useTheme();

  return (
    <button
      type="button"
      onClick={onScheduleSession}
      className="flex items-center gap-[5px] rounded-lg border-none cursor-pointer transition-colors"
      style={{
        height: 28,
        padding: '0 12px',
        backgroundColor: c.btnPrimBg,
        color: c.btnPrimText,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'inherit',
        flexShrink: 0,
        outline: 'none',
        userSelect: 'none',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
    >
      <Plus style={{ width: 13, height: 13, flexShrink: 0 }} />
      New
    </button>
  );
}
