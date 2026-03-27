import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: AutoScheduleParams) => void;
}

export interface AutoScheduleParams {
  students: string[];
  serviceType: 'ABA Therapy' | 'Speech Therapy' | 'Occupational Therapy';
  sessionDuration: number;
  frequencyPerWeek: number;
  startDate: string;
  endDate: string;
  workingHoursStart: string;
  workingHoursEnd: string;
}

const students = [
  'Emma Wilson',
  'Liam Johnson',
  'Olivia Brown',
  'Noah Davis',
  'Ava Martinez',
  'Ethan Garcia',
  'Sophia Rodriguez',
  'Mason Anderson'
];

export function AutoScheduleModal({ isOpen, onClose, onGenerate }: AutoScheduleModalProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [formData, setFormData] = useState<Omit<AutoScheduleParams, 'students'>>({
    serviceType: 'ABA Therapy',
    sessionDuration: 60,
    frequencyPerWeek: 2,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
  });

  if (!isOpen) return null;

  const toggleStudent = (student: string) => {
    setSelectedStudents(prev =>
      prev.includes(student)
        ? prev.filter(s => s !== student)
        : [...prev, student]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ ...formData, students: selectedStudents });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background rounded-lg shadow-2xl z-50 border border-border">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Auto Schedule Sessions</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Students */}
            <div className="space-y-2">
              <Label>Students</Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                {students.map((student) => (
                  <label
                    key={student}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student)}
                      onChange={() => toggleStudent(student)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">{student}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Service Type & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value as any })}
                >
                  <SelectTrigger id="serviceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABA Therapy">ABA Therapy</SelectItem>
                    <SelectItem value="Speech Therapy">Speech Therapy</SelectItem>
                    <SelectItem value="Occupational Therapy">Occupational Therapy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Session Duration (minutes)</Label>
                <Select
                  value={formData.sessionDuration.toString()}
                  onValueChange={(value) => setFormData({ ...formData, sessionDuration: parseInt(value) })}
                >
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency per Week</Label>
              <Select
                value={formData.frequencyPerWeek.toString()}
                onValueChange={(value) => setFormData({ ...formData, frequencyPerWeek: parseInt(value) })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 session per week</SelectItem>
                  <SelectItem value="2">2 sessions per week</SelectItem>
                  <SelectItem value="3">3 sessions per week</SelectItem>
                  <SelectItem value="4">4 sessions per week</SelectItem>
                  <SelectItem value="5">5 sessions per week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workStart">Working Hours Start</Label>
                <Input
                  id="workStart"
                  type="time"
                  value={formData.workingHoursStart}
                  onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workEnd">Working Hours End</Label>
                <Input
                  id="workEnd"
                  type="time"
                  value={formData.workingHoursEnd}
                  onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedStudents.length === 0}
              className="bg-primary text-primary-foreground"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Schedule
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}