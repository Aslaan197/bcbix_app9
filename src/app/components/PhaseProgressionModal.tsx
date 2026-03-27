import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { TransitionCard } from './TransitionCard';
import { getAutoMetricType } from '../lib/evaluatePhaseProgression';
import type { PhaseProgressionConfig, PhaseTransitionRule, DataType } from './ProgramTemplatesPage';

interface Props {
  open:       boolean;
  onClose:    () => void;
  phases:     string[];
  config:     PhaseProgressionConfig;
  onChange:   (config: PhaseProgressionConfig) => void;
  targetName: string;
  dataType:   DataType;
}

function buildDefaultRules(phases: string[], dataType: DataType): PhaseTransitionRule[] {
  return phases.slice(0, -1).map((fromPhase, i) => ({
    fromPhase, toPhase: phases[i + 1],
    enabled: false, accuracyThreshold: 80, consecutiveSessions: 3,
    minTrialsPerSession: 5, metricType: getAutoMetricType(dataType),
    minProviders: 1, onFailure: 'reset', autoMove: true,
    requireConfirmation: false, delay: 'immediately',
  }));
}

export function PhaseProgressionModal({
  open, onClose, phases, config, onChange, targetName, dataType,
}: Props) {
  const [draft, setDraft] = useState<PhaseProgressionConfig>(config);

  useEffect(() => {
    if (!open) return;
    const existingKeys = new Set(config.rules.map(r => `${r.fromPhase}->${r.toPhase}`));
    const missing = buildDefaultRules(phases, dataType).filter(
      r => !existingKeys.has(`${r.fromPhase}->${r.toPhase}`)
    );
    // Auto-assign metricType on existing rules too
    const updatedRules = config.rules.map(r => ({ ...r, metricType: getAutoMetricType(dataType) }));
    setDraft({ ...config, rules: [...updatedRules, ...missing] });
  }, [open]); // eslint-disable-line

  const updateRule = (index: number, updated: PhaseTransitionRule) =>
    setDraft(prev => ({ ...prev, rules: prev.rules.map((r, i) => (i === index ? updated : r)) }));

  const setGlobal = <K extends keyof PhaseProgressionConfig>(key: K, value: PhaseProgressionConfig[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const setMastered = <K extends keyof PhaseProgressionConfig['masteredBehavior']>(key: K, value: boolean) =>
    setDraft(prev => ({ ...prev, masteredBehavior: { ...prev.masteredBehavior, [key]: value } }));

  function handleSave() {
    onChange(draft);
    toast.success('Phase progression saved');
    onClose();
  }

  function handleCancel() {
    setDraft(config);
    onClose();
  }

  const orderedIndices = phases
    .slice(0, -1)
    .map((from, i) => draft.rules.findIndex(r => r.fromPhase === from && r.toPhase === phases[i + 1]))
    .filter(i => i !== -1);

  return (
    <Dialog open={open} onOpenChange={v => !v && handleCancel()}>
      <DialogContent className="max-w-lg p-0 gap-0 flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Fixed header */}
        <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="text-base font-semibold">Automatic Phase Progression</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{targetName}</p>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* Scrollable body — plain div with overflow-y-auto for reliable scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {orderedIndices.map(i => (
            <TransitionCard
              key={`${draft.rules[i].fromPhase}-${draft.rules[i].toPhase}`}
              rule={draft.rules[i]}
              dataType={dataType}
              onChange={updated => updateRule(i, updated)}
            />
          ))}

          <Separator className="my-1" />

          {/* When Mastered */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold">When Mastered</span>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  ['hideFromActive', 'Hide from active targets list'],
                  ['moveToCompleted', 'Move to Completed'],
                  ['keepVisible', 'Keep visible with Mastered badge'],
                ] as [keyof PhaseProgressionConfig['masteredBehavior'], string][]
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox id={`m-${key}`} checked={draft.masteredBehavior[key]}
                    onCheckedChange={v => setMastered(key, !!v)} />
                  <Label htmlFor={`m-${key}`} className="text-xs cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-1" />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Checkbox id="startReview" checked={draft.startReviewAfterMastery}
                onCheckedChange={v => setGlobal('startReviewAfterMastery', !!v)} />
              <Label htmlFor="startReview" className="text-xs cursor-pointer">
                Start maintenance review after mastery
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="manualOverride" checked={draft.allowManualOverride}
                onCheckedChange={v => setGlobal('allowManualOverride', !!v)} />
              <Label htmlFor="manualOverride" className="text-xs cursor-pointer">
                Allow manual phase override by providers
              </Label>
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <Separator className="flex-shrink-0" />
        <DialogFooter className="px-5 py-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
