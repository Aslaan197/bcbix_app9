import React, { useState } from 'react';
import { Check, ArrowRight, Users, Calendar, Briefcase } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinked: () => void;
}

const FEATURES = [
  { icon: <Users  style={{ width: 13, height: 13 }} />, text: 'Import students and providers automatically' },
  { icon: <Briefcase style={{ width: 13, height: 13 }} />, text: 'Sync service types and session history' },
  { icon: <Calendar  style={{ width: 13, height: 13 }} />, text: 'Keep your calendar up-to-date in real time' },
];

export function OnboardingModal({ isOpen, onClose, onLinked }: OnboardingModalProps) {
  const { colors: c, isDark } = useTheme();
  const [status, setStatus] = useState<'idle' | 'linking' | 'linked'>('idle');

  const handleLink = () => {
    setStatus('linking');
    setTimeout(() => {
      setStatus('linked');
      setTimeout(() => { onLinked(); onClose(); setStatus('idle'); }, 900);
    }, 1400);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="p-0 gap-0 border-0 rounded-[14px] max-w-[420px] overflow-hidden"
        style={{
          backgroundColor: c.surface,
          boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.50)' : '0 20px 60px rgba(0,0,0,0.18)',
          border: `1px solid ${c.border}`,
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Connect Your AbleSpace Account</DialogTitle>
          <DialogDescription>Link AbleSpace to sync your calendar data</DialogDescription>
        </DialogHeader>

        {/* Header band */}
        <div style={{
          padding: '28px 28px 24px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(91,126,245,0.10) 0%, rgba(124,82,208,0.10) 100%)'
            : 'linear-gradient(135deg, #f8f6ff 0%, #f0f7ff 100%)',
          borderBottom: `1px solid ${c.border}`,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: 'linear-gradient(135deg, #5b7ef5, #7c52d0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 4px 12px rgba(91,126,245,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7L12 3z" fill="white" opacity="0.9"/>
              <path d="M9 12l2 2 4-4" stroke="rgba(91,126,245,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: c.t0, marginBottom: 6, lineHeight: 1.3 }}>
            Connect Your AbleSpace Account
          </div>
          <div style={{ fontSize: 13, color: c.t2, lineHeight: 1.6 }}>
            Link AbleSpace to automatically sync your students, providers, services, and sessions into this calendar.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  backgroundColor: isDark ? 'rgba(91,126,245,0.15)' : 'rgba(91,126,245,0.08)',
                  border: `1px solid ${isDark ? 'rgba(91,126,245,0.25)' : 'rgba(91,126,245,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#5b7ef5', flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 13, color: c.t1, lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Primary action */}
          <Button
            onClick={handleLink}
            disabled={status !== 'idle'}
            className="w-full h-10 rounded-[9px] text-sm font-semibold gap-[7px]"
            style={{
              backgroundColor: status === 'linked' ? '#2E9E63' : status === 'linking' ? '#7c52d0' : '#5b7ef5',
              color: '#fff', border: 'none', marginBottom: 10, transition: 'background-color 0.2s',
            }}
          >
            {status === 'idle' && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7L12 3z" stroke="white" strokeWidth="1.8" fill="none"/>
                </svg>
                Link AbleSpace Account
                <ArrowRight style={{ width: 13, height: 13 }} />
              </>
            )}
            {status === 'linking' && (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                Connecting...
              </>
            )}
            {status === 'linked' && (
              <>
                <Check style={{ width: 14, height: 14 }} />
                AbleSpace Connected!
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-[34px] text-xs"
            style={{ color: c.t3 }}
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Dialog>
  );
}