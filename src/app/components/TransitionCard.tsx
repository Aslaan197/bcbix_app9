import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { PhaseTransitionRule, DataType } from './ProgramTemplatesPage';
import { getThresholdLabel, getMetricTypeLabel, isEvaluable } from '../lib/evaluatePhaseProgression';

interface Props {
  rule:     PhaseTransitionRule;
  onChange: (updated: PhaseTransitionRule) => void;
  dataType: DataType;
}

export function TransitionCard({ rule, onChange, dataType }: Props) {
  const set = <K extends keyof PhaseTransitionRule>(key: K, val: PhaseTransitionRule[K]) =>
    onChange({ ...rule, [key]: val });

  const evaluable      = isEvaluable(dataType);
  const thresholdLabel = getThresholdLabel(dataType);
  const metricLabel    = getMetricTypeLabel(dataType);
  const isPercent      = !['Frequency', 'Duration', 'Rate'].includes(dataType);

  return (
    <Card className="border shadow-none">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{rule.fromPhase} → {rule.toPhase}</span>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`en-${rule.fromPhase}`}
              checked={rule.enabled}
              disabled={!evaluable}
              onCheckedChange={v => set('enabled', !!v)}
            />
            <Label htmlFor={`en-${rule.fromPhase}`} className="text-xs text-muted-foreground cursor-pointer">
              {evaluable ? 'Active' : 'N/A'}
            </Label>
          </div>
        </div>
        {!evaluable && (
          <p className="text-xs text-muted-foreground mt-1">
            Text Anecdotal is not used for phase evaluation
          </p>
        )}
      </CardHeader>

      {rule.enabled && evaluable && (
        <CardContent className="px-4 pb-3 pt-0">
          {/* Auto-assigned metric badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs text-muted-foreground">Metric:</span>
            <span className="text-xs font-medium bg-muted text-foreground px-2 py-0.5 rounded">
              {metricLabel}
            </span>
          </div>

          {/* ── Mastery Criteria — always visible ── */}
          <div className="flex flex-col gap-1.5 mb-1">
            <span className="text-xs font-medium">Mastery Criteria</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{thresholdLabel}</Label>
                <Input
                  type="number" min={0} max={isPercent ? 100 : undefined}
                  className="h-7 text-xs"
                  value={rule.accuracyThreshold}
                  onChange={e => set('accuracyThreshold', Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Consec. Sessions</Label>
                <Input type="number" min={1} className="h-7 text-xs"
                  value={rule.consecutiveSessions}
                  onChange={e => set('consecutiveSessions', Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Min Trials</Label>
                <Input type="number" min={1} className="h-7 text-xs"
                  value={rule.minTrialsPerSession}
                  onChange={e => set('minTrialsPerSession', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* ── Advanced Options — collapsed ── */}
          <Accordion type="single" collapsible>
            <AccordionItem value="adv" className="border-0">
              <AccordionTrigger className="text-xs py-2 text-muted-foreground hover:no-underline">
                Advanced Options
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Min Providers</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} className="h-7 text-xs w-16"
                        value={rule.minProviders}
                        onChange={e => set('minProviders', Number(e.target.value))} />
                      <span className="text-xs text-muted-foreground">unique providers required</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">On Failure</Label>
                    <RadioGroup value={rule.onFailure}
                      onValueChange={v => set('onFailure', v as PhaseTransitionRule['onFailure'])}
                      className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="reset" id={`fr-${rule.fromPhase}`} />
                        <Label htmlFor={`fr-${rule.fromPhase}`} className="text-xs cursor-pointer">Reset progress on failure</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="allow_one" id={`fa-${rule.fromPhase}`} />
                        <Label htmlFor={`fa-${rule.fromPhase}`} className="text-xs cursor-pointer">Allow 1 failure before resetting</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Transition Behavior</Label>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Checkbox id={`am-${rule.fromPhase}`} checked={rule.autoMove}
                          onCheckedChange={v => set('autoMove', !!v)} />
                        <Label htmlFor={`am-${rule.fromPhase}`} className="text-xs cursor-pointer">Auto-move to next phase</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`rc-${rule.fromPhase}`} checked={rule.requireConfirmation}
                          onCheckedChange={v => set('requireConfirmation', !!v)} />
                        <Label htmlFor={`rc-${rule.fromPhase}`} className="text-xs cursor-pointer">Require confirmation</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Delay</Label>
                    <div className="flex items-center gap-2">
                      <Select value={rule.delay}
                        onValueChange={v => set('delay', v as PhaseTransitionRule['delay'])}>
                        <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediately">Immediately</SelectItem>
                          <SelectItem value="after_sessions">After X sessions</SelectItem>
                        </SelectContent>
                      </Select>
                      {rule.delay === 'after_sessions' && (
                        <Input type="number" min={1} className="h-7 text-xs w-16"
                          placeholder="sessions"
                          value={rule.delaySessionCount ?? ''}
                          onChange={e => set('delaySessionCount', Number(e.target.value))} />
                      )}
                    </div>
                  </div>

                  {/* Regression */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t">
                    <Label className="text-xs text-muted-foreground">Regression (revert to {rule.fromPhase})</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox id={`re-${rule.fromPhase}`} checked={!!rule.regressionEnabled}
                        onCheckedChange={v => set('regressionEnabled', !!v)} />
                      <Label htmlFor={`re-${rule.fromPhase}`} className="text-xs cursor-pointer">Enable automatic regression</Label>
                    </div>
                    {rule.regressionEnabled && (
                      <div className="flex items-center gap-3 pl-6">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-muted-foreground">Sessions below</Label>
                          <Input type="number" min={1} max={100} className="h-7 text-xs w-16"
                            value={rule.regressionThreshold ?? Math.max((rule.accuracyThreshold ?? 80) - 20, 0)}
                            onChange={e => set('regressionThreshold', Number(e.target.value))} />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-muted-foreground">for</Label>
                          <Input type="number" min={1} max={10} className="h-7 text-xs w-14"
                            value={rule.regressionSessions ?? 2}
                            onChange={e => set('regressionSessions', Number(e.target.value))} />
                          <Label className="text-xs text-muted-foreground">sessions</Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}
