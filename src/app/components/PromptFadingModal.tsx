import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Check, AlertCircle, CheckCheck, GripVertical, X, Plus } from 'lucide-react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from './ui/popover';
import { Textarea } from './ui/textarea';
import { useTheme } from '../context/ThemeContext';
import type { AppColors } from '../context/ThemeContext';
import type { PromptDefinition } from './ProgramTemplatesPage';
import type { PromptFadingConfig } from '../lib/promptFading';
import { DEFAULT_PROMPT_FADING_CONFIG } from '../lib/promptFading';
import { generateFadingConfig } from '../lib/aiPromptFading';
import type { AIFadingConfig } from '../lib/aiPromptFading';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PromptFadingModalProps {
  open:          boolean;
  onClose:       () => void;
  prompts:       PromptDefinition[];
  config:        PromptFadingConfig;
  startingLevel: string;
  onSave:        (config: PromptFadingConfig, startingLevel: string, orderedActivePrompts: PromptDefinition[]) => void;
  targetName?:   string;
}

// ─── Prompt name helpers ───────────────────────────────────────────────────────

const PROMPT_FULL_NAMES: Record<string, string> = {
  FP: 'Full Physical', PP: 'Partial Physical',
  M: 'Model', G: 'Gestural', V: 'Verbal', I: 'Independent',
};
function promptFullName(code: string): string { return PROMPT_FULL_NAMES[code] ?? code; }

// ─── Chat types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:      string;
  role:    'user' | 'assistant';
  text:    string;
  config?: AIFadingConfig;
  isError?: boolean;
}

// ─── AI Assist UI components ──────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map(i => (
        <span key={i}
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function AssistantBubble({
  msg,
  onApply,
  allPrompts,
}: {
  msg:        ChatMessage;
  onApply:    (c: AIFadingConfig) => void;
  allPrompts: PromptDefinition[];
}) {
  const getLabel = (code: string) =>
    allPrompts.find(p => p.code === code)?.name ?? promptFullName(code);
  const [applied, setApplied] = useState(false);

  if (msg.isError) {
    return (
      <div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive max-w-[92%]">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{msg.text}</span>
      </div>
    );
  }

  const cfg = msg.config;
  if (!cfg) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 text-[11px] max-w-[96%] shadow-sm">
        <span>{msg.text}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 text-[11px] max-w-[96%] shadow-sm">
      <span className="text-xs font-semibold">Suggested Configuration</span>

      {/* Flow order */}
      <div className="flex flex-col gap-0.5 rounded-md bg-muted px-2.5 py-2">
        <span className="text-muted-foreground">Prompt Flow</span>
        <span className="font-medium leading-relaxed">
          {cfg.prompt_flow.map(code => `${code} — ${getLabel(code)}`).join(' → ')}
        </span>
      </div>

      {/* Removed prompts */}
      {cfg.removed_prompts.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-md bg-muted px-2.5 py-2">
          <span className="text-muted-foreground">Removed from Flow</span>
          <span className="font-medium">{cfg.removed_prompts.map(code => `${code} — ${getLabel(code)}`).join(', ')}</span>
        </div>
      )}

      {/* Thresholds */}
      <div className="flex flex-col gap-1 rounded-md bg-muted px-2.5 py-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Move Forward at</span>
          <span className="font-medium">
            {cfg.move_forward.accuracy}% / {cfg.move_forward.trials} trials
            {cfg.move_forward.sessions > 1 ? ` / ${cfg.move_forward.sessions} sessions` : ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Move Backward at</span>
          <span className="font-medium">
            &lt;{cfg.move_backward.accuracy}% / {cfg.move_backward.trials} trials
            {cfg.move_backward.sessions > 1 ? ` / ${cfg.move_backward.sessions} sessions` : ''}
          </span>
        </div>
      </div>

      <Button
        size="sm"
        className="h-6 gap-1 self-start text-[11px]"
        style={{ backgroundColor: applied ? '#2E9E63' : undefined }}
        onClick={() => { onApply(cfg); setApplied(true); }}
      >
        {applied
          ? <><Check className="h-3 w-3" /> Applied!</>
          : <><CheckCheck className="h-3 w-3" /> Apply Settings</>
        }
      </Button>
    </div>
  );
}

function AIAssistPopover({
  onApply,
  activePrompts,
  removedPrompts,
  allPrompts,
  fadeAt, fadeTrials, fadeSessions,
  regAt, regTrials, regSessions,
}: {
  onApply:       (c: AIFadingConfig) => void;
  activePrompts: PromptDefinition[];
  removedPrompts:PromptDefinition[];
  allPrompts:    PromptDefinition[];
  fadeAt:        number;
  fadeTrials:    number;
  fadeSessions:  number;
  regAt:         number;
  regTrials:     number;
  regSessions:   number;
}) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => textareaRef.current?.focus(), 80); }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      // Build available prompts list for the AI
      const availablePrompts = allPrompts.map(p => ({ name: p.name, code: p.code }));

      // Build current config from live UI state
      const currentConfig = {
        prompt_flow:     activePrompts.map(p => p.code),
        removed_prompts: removedPrompts.map(p => p.code),
        move_forward:    { accuracy: fadeAt,  trials: fadeTrials,  sessions: fadeSessions },
        move_backward:   { accuracy: regAt,   trials: regTrials,   sessions: regSessions  },
      };

      const result = await generateFadingConfig(text, availablePrompts, currentConfig);

      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: '', config: result.config },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate configuration. Please try again.';
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: message, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 px-2.5">
          <Sparkles className="h-3.5 w-3.5" /> AI Assist
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[390px] p-0 z-[200]" align="end" side="bottom" sideOffset={6}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-none">AI Prompt Fading</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Describe flow changes or fading rules in plain language
            </p>
          </div>
        </div>

        <div className="flex h-64 flex-col gap-2 overflow-y-auto p-3">
          {messages.length === 0 && !loading && (
            <div className="m-auto text-center text-[11px] text-muted-foreground leading-relaxed px-2 flex flex-col gap-1.5">
              <p className="font-medium text-foreground">Try asking:</p>
              <p className="italic">"Remove no response from flow"</p>
              <p className="italic">"Start from full physical, fade to independent"</p>
              <p className="italic">"Use 80% accuracy with 3 trials"</p>
              <p className="italic">"Reorder prompts to most-to-least"</p>
              <p className="italic">"Make regression trigger below 50%"</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user'
                ? (
                  <div className="max-w-[82%] rounded-lg bg-primary px-3 py-2 text-[11px] text-primary-foreground">
                    {msg.text}
                  </div>
                )
                : <AssistantBubble msg={msg} onApply={onApply} allPrompts={allPrompts} />
              }
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg border bg-card px-3">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2 border-t p-3">
          <Textarea
            ref={textareaRef}
            className="min-h-0 flex-1 resize-none text-xs py-1.5 px-2 h-[56px]"
            placeholder="Describe flow changes or fading rules… (Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={loading}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── NumberInput ───────────────────────────────────────────────────────────────

function NumberInput({ value, onChange, min, max, suffix, hasError, c, isDark }: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; suffix?: string; hasError?: boolean;
  c: AppColors; isDark: boolean;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => { setRaw(String(value)); }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const str = e.target.value.replace(/[^0-9]/g, '');
    setRaw(str);
    if (str === '') return;
    const n = parseInt(str, 10);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  }

  function handleBlur() {
    const n = parseInt(raw, 10);
    if (isNaN(n) || raw === '') { setRaw(String(value)); }
    else { const c2 = Math.min(max, Math.max(min, n)); onChange(c2); setRaw(String(c2)); }
  }

  const borderCol = hasError
    ? (isDark ? 'rgba(220,38,38,0.55)' : 'rgba(220,38,38,0.45)')
    : c.inputBorder;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="text" inputMode="numeric" value={raw}
        onChange={handleChange} onBlur={handleBlur}
        style={{
          width: '100%', height: 36,
          padding: suffix ? '0 26px 0 10px' : '0 10px',
          borderRadius: 8, border: `1px solid ${borderCol}`,
          backgroundColor: c.inputBg, color: c.t0,
          fontSize: 13, fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#4F83CC'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = borderCol; }}
      />
      {suffix && (
        <span style={{
          position: 'absolute', right: 9, fontSize: 12,
          color: c.t3, fontFamily: 'inherit', pointerEvents: 'none', userSelect: 'none',
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

// ─── ThreeColInputs ────────────────────────────────────────────────────────────

function ThreeColInputs({
  accuracyValue, onAccuracy, trialsValue, onTrials, sessionsValue, onSessions,
  accuracyMax, accuracyErr, trialsErr, c, isDark,
}: {
  accuracyValue: number; onAccuracy: (v: number) => void;
  trialsValue:   number; onTrials:   (v: number) => void;
  sessionsValue: number; onSessions: (v: number) => void;
  accuracyMax: number; accuracyErr?: string; trialsErr?: string;
  c: AppColors; isDark: boolean;
}) {
  const colLabel = (t: string) => (
    <div style={{ fontSize: 11, color: c.t2, fontFamily: 'inherit', marginBottom: 5 }}>{t}</div>
  );
  const err = (msg: string) => (
    <p style={{ margin: '3px 0 0', fontSize: 10, color: isDark ? '#f87171' : '#c0392b', fontFamily: 'inherit' }}>
      {msg}
    </p>
  );
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ flex: 1 }}>
        {colLabel('Accuracy %')}
        <NumberInput value={accuracyValue} onChange={onAccuracy} min={1} max={accuracyMax} suffix="%" hasError={!!accuracyErr} c={c} isDark={isDark} />
        {accuracyErr && err(accuracyErr)}
      </div>
      <div style={{ flex: 1 }}>
        {colLabel('Trials')}
        <NumberInput value={trialsValue} onChange={onTrials} min={1} max={20} hasError={!!trialsErr} c={c} isDark={isDark} />
        {trialsErr && err(trialsErr)}
      </div>
      <div style={{ flex: 1 }}>
        {colLabel('Sessions')}
        <NumberInput value={sessionsValue} onChange={onSessions} min={1} max={20} c={c} isDark={isDark} />
      </div>
    </div>
  );
}

// ─── Drag-and-drop prompt row ──────────────────────────────────────────────────

const DND_TYPE = 'PROMPT_FLOW_ITEM';
interface DragItem { index: number; id: string; }

function PromptRow({
  prompt, index, onMove, onRemove, isLast, c, isDark,
}: {
  prompt:   PromptDefinition;
  index:    number;
  onMove:   (from: number, to: number) => void;
  onRemove: (id: string) => void;
  isLast:   boolean;
  c: AppColors; isDark: boolean;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const isPass = prompt.passFail === 'pass';

  const [{ isDragging }, drag, dragPreview] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: DND_TYPE,
    item: { index, id: prompt.id },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<DragItem, unknown, { isOver: boolean }>({
    accept: DND_TYPE,
    collect: monitor => ({ isOver: monitor.isOver() }),
    hover(item) {
      if (!ref.current || item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  });

  drag(drop(ref));

  const passColor = isPass ? '#2E9E63' : (isDark ? '#f87171' : '#c0392b');

  return (
    <>
      {isOver && <div style={{ height: 2, borderRadius: 1, backgroundColor: '#4F83CC', margin: '0 4px' }} />}
      <div
        ref={dragPreview as unknown as React.Ref<HTMLDivElement>}
        title={isPass ? `${prompt.name} is marked as Pass` : prompt.name}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 8,
          border: `1px solid ${isDragging ? '#4F83CC' : c.border}`,
          backgroundColor: isDragging
            ? (isDark ? 'rgba(79,131,204,0.12)' : 'rgba(79,131,204,0.07)')
            : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'),
          opacity: isDragging ? 0.5 : 1,
          cursor: 'grabbing', transition: 'all 0.1s', userSelect: 'none',
        }}
      >
        <div ref={ref as unknown as React.Ref<HTMLDivElement>}
          style={{ cursor: 'grab', color: c.t3, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <GripVertical size={14} />
        </div>

        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: c.t3, fontFamily: 'inherit',
        }}>
          {index + 1}
        </div>

        <span style={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: passColor,
          padding: '2px 7px', borderRadius: 4,
          backgroundColor: isPass
            ? (isDark ? 'rgba(46,158,99,0.15)' : 'rgba(46,158,99,0.09)')
            : (isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.07)'),
          flexShrink: 0,
        }}>
          {prompt.code}
        </span>

        <span style={{ flex: 1, fontSize: 12, color: c.t1, fontFamily: 'inherit', minWidth: 0 }}>
          {prompt.name || promptFullName(prompt.code)}
        </span>

        {isPass && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#2E9E63',
            backgroundColor: isDark ? 'rgba(46,158,99,0.15)' : 'rgba(46,158,99,0.09)',
            padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          }}>
            Pass
          </span>
        )}

        {!isLast && (
          <span style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', flexShrink: 0 }}>↓</span>
        )}

        <button
          type="button"
          onClick={() => !isPass && onRemove(prompt.id)}
          title={isPass ? 'Pass prompts cannot be removed from the flow' : 'Remove from flow'}
          disabled={isPass}
          style={{
            width: 20, height: 20, borderRadius: 4, border: 'none',
            backgroundColor: 'transparent', color: c.t3,
            cursor: isPass ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0, opacity: isPass ? 0.3 : 1, transition: 'color 0.1s',
          }}
          onMouseEnter={e => { if (!isPass) (e.currentTarget as HTMLElement).style.color = isDark ? '#f87171' : '#c0392b'; }}
          onMouseLeave={e => { if (!isPass) (e.currentTarget as HTMLElement).style.color = c.t3; }}
        >
          <X size={12} />
        </button>
      </div>
    </>
  );
}

// ─── Prompt flow list ──────────────────────────────────────────────────────────

function PromptFlowList({
  activePrompts, removedPrompts,
  onMove, onRemove, onAddBack,
  c, isDark,
}: {
  activePrompts:  PromptDefinition[];
  removedPrompts: PromptDefinition[];
  onMove:    (from: number, to: number) => void;
  onRemove:  (id: string) => void;
  onAddBack: (id: string) => void;
  c: AppColors; isDark: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {activePrompts.map((p, i) => (
          <PromptRow
            key={p.id} prompt={p} index={i}
            onMove={onMove} onRemove={onRemove}
            isLast={i === activePrompts.length - 1}
            c={c} isDark={isDark}
          />
        ))}
        {activePrompts.length === 0 && (
          <div style={{
            padding: '12px', borderRadius: 8, textAlign: 'center',
            border: `1px dashed ${c.border}`,
            fontSize: 12, color: c.t3, fontFamily: 'inherit',
          }}>
            All prompts removed. Add them back below.
          </div>
        )}
      </div>

      {activePrompts.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: c.t3, fontFamily: 'inherit', lineHeight: 1.6 }}>
          {activePrompts.map(p => `${p.code} — ${p.name}`).join(' → ')}
        </div>
      )}

      {removedPrompts.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: c.t3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: 'inherit', marginBottom: 6,
          }}>
            Removed from Flow
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {removedPrompts.map(p => (
              <button key={p.id} type="button" onClick={() => onAddBack(p.id)}
                title={`Add ${p.name} back to flow`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px', borderRadius: 6,
                  border: `1px solid ${c.border}`,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: c.t2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4F83CC'; (e.currentTarget as HTMLElement).style.color = '#4F83CC'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.t2; }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.code}</span>
                <span>{p.name || promptFullName(p.code)}</span>
                <Plus size={10} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PromptFadingModal({
  open, onClose, prompts, config: initialConfig,
  startingLevel: initialStartingLevel, onSave, targetName,
}: PromptFadingModalProps) {
  const { colors: c, isDark } = useTheme();

  const [activePrompts,  setActivePrompts]  = useState<PromptDefinition[]>([]);
  const [removedPrompts, setRemovedPrompts] = useState<PromptDefinition[]>([]);

  const [fadeAt,       setFadeAt]       = useState(Math.round((initialConfig.accuracyThreshold ?? 0.80) * 100));
  const [fadeTrials,   setFadeTrials]   = useState(Math.max(1, initialConfig.minTrials ?? 3));
  const [fadeSessions, setFadeSessions] = useState(Math.max(1, initialConfig.minSessions ?? 1));
  const [regAt,        setRegAt]        = useState(Math.round((initialConfig.regressionThreshold ?? 0.50) * 100));
  const [regTrials,    setRegTrials]    = useState(Math.max(1, initialConfig.regressionWindowSize ?? 3));
  const [regSessions,  setRegSessions]  = useState(Math.max(1, initialConfig.minSessions ?? 1));

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const cfg     = { ...DEFAULT_PROMPT_FADING_CONFIG, ...initialConfig };
    const excluded = cfg.excludedPromptCodes ?? [];
    setActivePrompts(prompts.filter(p => !excluded.includes(p.code)));
    setRemovedPrompts(prompts.filter(p =>  excluded.includes(p.code)));
    setFadeAt(Math.round(cfg.accuracyThreshold * 100));
    setFadeTrials(Math.max(1, cfg.minTrials));
    setFadeSessions(Math.max(1, cfg.minSessions));
    setRegAt(Math.round((cfg.regressionThreshold ?? 0.50) * 100));
    setRegTrials(Math.max(1, cfg.regressionWindowSize));
    setRegSessions(Math.max(1, cfg.minSessions));
  }, [open]); // eslint-disable-line

  // ── Prompt flow handlers ──────────────────────────────────────────────────
  const handleMove = useCallback((from: number, to: number) => {
    setActivePrompts(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setActivePrompts(prev => {
      const target = prev.find(p => p.id === id);
      if (target?.passFail === 'pass') return prev;
      if (target) setRemovedPrompts(r => [...r, target]);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  const handleAddBack = useCallback((id: string) => {
    setRemovedPrompts(prev => {
      const item = prev.find(p => p.id === id);
      if (item) setActivePrompts(a => [...a, item]);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  // ── AI Apply — maps AIFadingConfig → UI state ─────────────────────────────
  function handleAIApply(cfg: AIFadingConfig) {
    // Numeric rules
    setFadeAt(Math.min(100, Math.max(1, cfg.move_forward.accuracy)));
    setFadeTrials(Math.min(20, Math.max(1, cfg.move_forward.trials)));
    setFadeSessions(Math.min(20, Math.max(1, cfg.move_forward.sessions)));
    setRegAt(Math.max(0, Math.min(cfg.move_forward.accuracy - 1, cfg.move_backward.accuracy)));
    setRegTrials(Math.min(20, Math.max(1, cfg.move_backward.trials)));
    setRegSessions(Math.min(20, Math.max(1, cfg.move_backward.sessions)));

    // Flow reorder — map codes from AI response back to PromptDefinition objects
    if (cfg.prompt_flow.length > 0) {
      setActivePrompts(_prev => {
        const ordered: PromptDefinition[] = [];
        for (const code of cfg.prompt_flow) {
          const found = prompts.find(p => p.code === code);
          if (found) ordered.push(found);
        }
        // Append any prompt not mentioned by AI that is currently active
        const orderedIds = new Set(ordered.map(p => p.id));
        const extras = prompts.filter(
          p => !orderedIds.has(p.id) && !cfg.removed_prompts.includes(p.code),
        );
        return [...ordered, ...extras];
      });
    }

    // Removed prompts — move from active to removed (guard pass prompts)
    if (cfg.removed_prompts.length > 0) {
      setActivePrompts(prev => {
        const toRemove = prev.filter(
          p => cfg.removed_prompts.includes(p.code) && p.passFail !== 'pass',
        );
        setRemovedPrompts(r => {
          const existingIds = new Set(r.map(p => p.id));
          return [...r, ...toRemove.filter(p => !existingIds.has(p.id))];
        });
        return prev.filter(p => !cfg.removed_prompts.includes(p.code) || p.passFail === 'pass');
      });
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const passPrompts  = activePrompts.filter(p => p.passFail === 'pass');
  const fadeAccErr   = fadeAt < 1 || fadeAt > 100 ? 'Must be 1–100' : '';
  const regAccErr    = regAt < 0 || regAt >= fadeAt ? `Must be < ${fadeAt}%` : '';
  const fadeTriErr   = fadeTrials < 1 ? 'Min 1' : '';
  const regTriErr    = regTrials  < 1 ? 'Min 1' : '';
  const emptyFlowErr = activePrompts.length === 0 ? 'Flow must have at least one prompt' : '';
  const noPassErr    = activePrompts.length > 0 && passPrompts.length === 0
    ? 'At least one Pass prompt must remain in the flow'
    : '';
  const canSave = activePrompts.length > 0 && passPrompts.length > 0
    && !fadeAccErr && !regAccErr && !fadeTriErr && !regTriErr;

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    const usesSessions = fadeSessions > 1 || regSessions > 1;
    const cfg: PromptFadingConfig = {
      ...DEFAULT_PROMPT_FADING_CONFIG,
      ...initialConfig,
      enabled:              true,
      template:             'manual',
      fadeRule:             'accuracy',
      evaluationType:       usesSessions ? 'sessions' : 'trials',
      minTrials:            fadeTrials,
      windowSize:           fadeTrials,
      accuracyThreshold:    fadeAt / 100,
      allowOneFailure:      false,
      minSessions:          Math.max(fadeSessions, regSessions),
      regressionEnabled:    true,
      regressionWindowSize: regTrials,
      regressionThreshold:  regAt / 100,
      excludedPromptCodes:  removedPrompts.map(p => p.code),
    };
    const startLevel = activePrompts[0]?.code
      ?? initialStartingLevel
      ?? prompts[0]?.code ?? '';
    onSave(cfg, startLevel, activePrompts);
    onClose();
  }

  const fieldLabel = (text: string) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: c.t0, fontFamily: 'inherit', marginBottom: 8 }}>
      {text}
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent
          className="overflow-hidden"
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 'var(--radius)',
            padding: 0, gap: 0,
            maxWidth: 460,
            boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
            maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* ── Header ── */}
          <DialogHeader style={{
            padding: '13px 18px 11px',
            borderBottom: `1px solid ${c.divider}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <DialogTitle style={{
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                color: c.t0, flex: 1, margin: 0,
              }}>
                Prompt Fading Setup
              </DialogTitle>
              <AIAssistPopover
                onApply={handleAIApply}
                activePrompts={activePrompts}
                removedPrompts={removedPrompts}
                allPrompts={prompts}
                fadeAt={fadeAt}
                fadeTrials={fadeTrials}
                fadeSessions={fadeSessions}
                regAt={regAt}
                regTrials={regTrials}
                regSessions={regSessions}
              />
            </div>
            <DialogDescription style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', marginTop: 2 }}>
              {targetName ? `Target: ${targetName}` : 'Configure automatic prompt level progression'}
            </DialogDescription>
          </DialogHeader>

          {/* ── Scrollable body ── */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '20px 20px',
            display: 'flex', flexDirection: 'column', gap: 22,
          }}>

            {/* 1. Prompt Flow */}
            <div>
              {fieldLabel('Prompt Flow')}
              <p style={{ fontSize: 11, color: c.t3, fontFamily: 'inherit', margin: '0 0 10px', lineHeight: 1.5 }}>
                Drag to reorder. Top item is where the learner starts; bottom is the goal.
              </p>
              {prompts.length === 0 ? (
                <p style={{ fontSize: 12, color: c.t3, fontFamily: 'inherit', margin: 0 }}>
                  No prompts defined. Add prompts in target settings first.
                </p>
              ) : (
                <PromptFlowList
                  activePrompts={activePrompts}
                  removedPrompts={removedPrompts}
                  onMove={handleMove}
                  onRemove={handleRemove}
                  onAddBack={handleAddBack}
                  c={c} isDark={isDark}
                />
              )}
              {(emptyFlowErr || noPassErr) && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: isDark ? '#f87171' : '#c0392b', fontFamily: 'inherit' }}>
                  {emptyFlowErr || noPassErr}
                </p>
              )}
            </div>

            {/* 2. Move Forward */}
            <div>
              {fieldLabel('Move Forward')}
              <ThreeColInputs
                accuracyValue={fadeAt}
                onAccuracy={v => setFadeAt(Math.min(100, Math.max(1, v)))}
                trialsValue={fadeTrials} onTrials={setFadeTrials}
                sessionsValue={fadeSessions} onSessions={setFadeSessions}
                accuracyMax={100} accuracyErr={fadeAccErr} trialsErr={fadeTriErr}
                c={c} isDark={isDark}
              />
            </div>

            {/* 3. Move Backwards */}
            <div>
              {fieldLabel('Move Backwards')}
              <ThreeColInputs
                accuracyValue={regAt}
                onAccuracy={v => setRegAt(Math.min(Math.max(fadeAt - 1, 0), Math.max(0, v)))}
                trialsValue={regTrials} onTrials={setRegTrials}
                sessionsValue={regSessions} onSessions={setRegSessions}
                accuracyMax={Math.max(1, fadeAt - 1)} accuracyErr={regAccErr} trialsErr={regTriErr}
                c={c} isDark={isDark}
              />
            </div>

          </div>

          {/* ── Footer ── */}
          <DialogFooter style={{
            padding: '11px 18px 13px',
            borderTop: `1px solid ${c.divider}`,
            flexShrink: 0,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <Button variant="outline" onClick={onClose} style={{
              fontFamily: 'inherit', fontSize: 13, height: 34,
              borderColor: c.border, color: c.t1,
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave} style={{
              fontFamily: 'inherit', fontSize: 13, height: 34,
            }}>
              Save &amp; Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}

export { DEFAULT_PROMPT_FADING_CONFIG };
