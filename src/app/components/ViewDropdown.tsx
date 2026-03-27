import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

interface ViewDropdownProps {
  viewMode: 'day' | 'week' | 'month';
  onChange: (mode: 'day' | 'week' | 'month') => void;
}

const VIEW_LABELS: Record<'day' | 'week' | 'month', string> = {
  day: 'Day', week: 'Week', month: 'Month',
};

const VIEWS: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];

export function ViewDropdown({ viewMode, onChange }: ViewDropdownProps) {
  const { colors: c } = useTheme();
  const [hover, setHover] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-[28px] px-[9px] gap-1 font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{
            fontSize: 13, color: c.t1, borderColor: c.border,
            backgroundColor: hover ? c.navHover : 'transparent',
            transition: 'background-color 0.12s',
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {VIEW_LABELS[viewMode]}
          <ChevronDown style={{ width: 12, height: 12, color: c.t3 }} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[100px] p-1 rounded-lg"
        style={{
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
        }}
      >
        {VIEWS.map(v => (
          <DropdownMenuItem
            key={v}
            onSelect={() => onChange(v)}
            className="flex items-center justify-between rounded-md px-3 py-1.5 cursor-pointer"
            style={{
              fontSize: 13,
              fontWeight: v === viewMode ? 500 : 400,
              color: v === viewMode ? c.t0 : c.t1,
              backgroundColor: v === viewMode ? c.navActive : 'transparent',
            }}
          >
            {VIEW_LABELS[v]}
            {v === viewMode && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c.t0, flexShrink: 0, display: 'inline-block' }} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}