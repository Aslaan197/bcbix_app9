import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, AlertCircle, CheckCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { generatePhaseConfig } from '../lib/aiPhaseConfig';
import type { AIPhaseConfig, ValidationError } from '../lib/aiPhaseConfig';

// ─── Internal types ───────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  config?: AIPhaseConfig;
  errors?: ValidationError[];
  isError?: boolean;
}

interface Props {
  /** Called when the user clicks "Insert Configuration" on a valid AI response. */
  onInsert: (config: AIPhaseConfig) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfigRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex justify-between text-[11px] ${highlight ? 'text-destructive' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function AssistantBubble({
  msg,
  onInsert,
}: {
  msg: ChatMessage;
  onInsert: (c: AIPhaseConfig) => void;
}) {
  // Plain error (network / parse failure)
  if (msg.isError) {
    return (
      <div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive max-w-[92%]">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{msg.text}</span>
      </div>
    );
  }

  const cfg = msg.config;
  const hasErrors = (msg.errors?.length ?? 0) > 0;

  const fieldHasError = (field: string) =>
    msg.errors?.some(e => e.field === field) ?? false;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 text-[11px] max-w-[96%] shadow-sm">
      {cfg && (
        <>
          <span className="text-xs font-semibold">Parsed Configuration</span>

          {/* Config preview grid */}
          <div className="flex flex-col gap-1 rounded-md bg-muted px-2.5 py-2">
            <ConfigRow
              label="Accuracy"
              value={`${Math.round(cfg.threshold * 100)}%`}
              highlight={fieldHasError('threshold')}
            />
            <ConfigRow
              label="Sessions"
              value={`${cfg.sessions_required}${cfg.consecutive ? ' (consecutive)' : ''}`}
              highlight={fieldHasError('sessions_required')}
            />
            <ConfigRow
              label="Min Trials"
              value={String(cfg.min_trials)}
              highlight={fieldHasError('min_trials')}
            />
            <ConfigRow
              label="Allow Failures"
              value={cfg.allow_failures > 0 ? `${cfg.allow_failures}` : 'None'}
              highlight={fieldHasError('allow_failures')}
            />

            {cfg.regression && (
              <>
                <div className="my-0.5 border-t" />
                <ConfigRow
                  label="Regression below"
                  value={`${Math.round(cfg.regression.threshold * 100)}%`}
                  highlight={fieldHasError('regression.threshold')}
                />
                <ConfigRow
                  label="Regression sessions"
                  value={String(cfg.regression.sessions_required)}
                  highlight={fieldHasError('regression.sessions_required')}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Validation errors */}
      {hasErrors && (
        <div className="flex flex-col gap-0.5 text-destructive">
          <div className="flex items-center gap-1 font-medium">
            <AlertCircle className="h-3 w-3" />
            AI response could not be fully parsed. Please review.
          </div>
          {msg.errors!.map(e => (
            <span key={e.field} className="pl-4 text-[10px] opacity-80">
              • {e.message}
            </span>
          ))}
        </div>
      )}

      {cfg && (
        <Button
          size="sm"
          className="h-6 gap-1 self-start text-[11px]"
          disabled={hasErrors}
          onClick={() => onInsert(cfg)}
        >
          <CheckCheck className="h-3 w-3" />
          Insert Configuration
        </Button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PhaseAIAssist({ onInsert }: Props) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus textarea when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await generatePhaseConfig(text);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: result.raw,
          config: result.config,
          errors: result.errors,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 px-2.5">
          <Sparkles className="h-3.5 w-3.5" />
          AI Assist
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] p-0 z-[200]"
        align="end"
        side="bottom"
        sideOffset={6}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-none">AI Phase Config</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Describe your rules in plain language
            </p>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex h-64 flex-col gap-2 overflow-y-auto p-3">
          {messages.length === 0 && !loading && (
            <p className="m-auto text-center text-[11px] text-muted-foreground leading-relaxed px-4">
              Try:{' '}
              <span className="italic">
                "80% accuracy for 3 consecutive sessions, min 5 trials. Allow 1 failure.
                Regression if below 60% for 2 sessions."
              </span>
            </p>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[82%] rounded-lg bg-primary px-3 py-2 text-[11px] text-primary-foreground">
                  {msg.text}
                </div>
              ) : (
                <AssistantBubble msg={msg} onInsert={onInsert} />
              )}
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

        {/* Input row */}
        <div className="flex items-end gap-2 border-t p-3">
          <Textarea
            ref={textareaRef}
            className="min-h-0 flex-1 resize-none text-xs py-1.5 px-2 h-[56px]"
            placeholder="Describe your phase progression rules… (Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
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
