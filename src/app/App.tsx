import React, { useState, useEffect } from 'react';
import { AppSidebar } from './components/AppSidebar';
import type { ModuleId } from './components/AppSidebar';
import { TopRibbon } from './components/TopRibbon';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import { LearnersPage } from './components/LearnersPage';
import { ProgramTemplatesPage } from './components/ProgramTemplatesPage';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { SessionDetailsPanel } from './components/SessionDetailsPanel';
import { SessionCreateSheet } from './components/SessionCreateSheet';
import { AutoScheduleSheet } from './components/AutoScheduleSheet';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { FiltersModal } from './components/FiltersModal';
import { DataCollectionSheet } from './components/DataCollectionSheet';
import { SessionSummaryScreen } from './components/SessionSummaryScreen';
import { Session } from './components/SessionCard';
import type { FinalizedSessionData } from './lib/sessionTypes';
import { supabase } from './lib/supabase';
import { initApp } from './lib/initApp';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ParticipantsProvider } from './context/ParticipantsContext';
import { ProgramTemplatesProvider } from './context/ProgramTemplatesContext';
import { LearnerProgramsProvider, useLearnerPrograms } from './context/LearnerProgramsContext';
import { saveSessionMappings } from './lib/sessionMappings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dbSessionToApp(
  row: {
    id: string; session_name: string; students: string[]; providers: string[];
    service_type: string | null; start_time: string; end_time: string;
    color: string; notes: string | null;
  },
  sessionPrograms?: Array<{ session_id: string; program_id: string }>,
): Session {
  // Group program IDs under each student so SessionCreateSheet edit mode
  // can pre-check them. Without learner_name in the new schema we distribute
  // programs across all students in the session.
  const selectedPrograms: Record<string, string[]> = {};
  if (sessionPrograms) {
    const programIds = sessionPrograms
      .filter(sp => sp.session_id === row.id)
      .map(sp => sp.program_id);
    if (programIds.length > 0) {
      const students = row.students.length > 0 ? row.students : ['learner'];
      for (const student of students) {
        selectedPrograms[student] = programIds;
      }
    }
  }
  return {
    id:               row.id,
    sessionName:      row.session_name,
    students:         row.students,
    providers:        row.providers,
    serviceType:      (row.service_type ?? '') as Session['serviceType'],
    startTime:        new Date(row.start_time),
    endTime:          new Date(row.end_time),
    color:            row.color,
    notes:            row.notes ?? undefined,
    selectedPrograms: Object.keys(selectedPrograms).length > 0 ? selectedPrograms : undefined,
  };
}

// ─── Calendar skeleton loader ─────────────────────────────────────────────────

function CalendarSkeleton() {
  const COLS = 7;
  const ROWS = 5;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      backgroundColor: 'var(--background)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Time-gutter + column headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ width: 52, flexShrink: 0 }} />
        {Array.from({ length: COLS }).map((_, i) => (
          <div key={i} style={{ flex: 1, padding: '10px 8px' }}>
            <div style={{ height: 10, borderRadius: 4, background: 'var(--muted)', opacity: 0.5, marginBottom: 4, width: '40%' }} />
            <div style={{ height: 14, borderRadius: 4, background: 'var(--muted)', opacity: 0.35, width: '60%' }} />
          </div>
        ))}
      </div>
      {/* Grid rows */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
          {Array.from({ length: ROWS }).map((_, i) => (
            <div key={i} style={{ height: 80, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '6px 8px 0 0' }}>
              <div style={{ width: 28, height: 8, borderRadius: 3, background: 'var(--muted)', opacity: 0.4 }} />
            </div>
          ))}
        </div>
        {Array.from({ length: COLS }).map((_, col) => (
          <div key={col} style={{ flex: 1, borderRight: '1px solid var(--border)' }}>
            {Array.from({ length: ROWS }).map((_, row) => (
              <div key={row} style={{ height: 80, borderBottom: '1px solid var(--border)', padding: 4 }}>
                {/* Show a skeleton event in ~30% of cells (deterministic to avoid flicker) */}
                {(col * ROWS + row) % 3 === 0 && (
                  <div style={{
                    height: (col + row) % 2 === 0 ? 48 : 32,
                    borderRadius: 3,
                    background: 'var(--muted)', opacity: 0.3,
                  }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inner app (needs theme context) ─────────────────────────────────────────

// CalendarLayer type for internal session filtering
interface CalendarLayer {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
}

function AppInner() {
  const { colors } = useTheme();
  const { programs } = useLearnerPrograms();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [sessions, setSessions]             = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // ── Init: seed defaults + load sessions from Supabase ────────────────────
  useEffect(() => {
    initApp().catch(err => console.error('[initApp]', err));

    Promise.all([
      supabase.from('sessions').select('*').order('start_time'),
      supabase.from('session_programs').select('session_id, program_id'),
    ]).then(([{ data: sessData, error: sessErr }, { data: spData, error: spErr }]) => {
      if (sessErr) { console.error('[Supabase] loadSessions:', sessErr.message); }
      else if (spErr) console.error('[Supabase] loadSessionPrograms:', spErr.message);
      if (sessData) setSessions(sessData.map(row => dbSessionToApp(row, spData ?? [])));
      setSessionsLoading(false);
    });
  }, []);

  // Visible date range — drives mini-calendar highlight
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>(() => {
    const today = new Date();
    const ws = new Date(today);
    ws.setDate(today.getDate() - today.getDay());
    ws.setHours(0, 0, 0, 0);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    we.setHours(23, 59, 59, 999);
    return { start: ws, end: we };
  });

  const handleVisibleRangeChange = (start: Date, end: Date) => {
    setVisibleRange(prev => {
      if (prev.start.getTime() === start.getTime() && prev.end.getTime() === end.getTime()) {
        return prev;
      }
      return { start, end };
    });
  };

  // Details panel
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDataCollectionOpen, setIsDataCollectionOpen] = useState(false);

  // Finalized sessions & summary screen
  const [finalizedSessions, setFinalizedSessions] = useState<Record<string, FinalizedSessionData>>({});
  const [summaryData, setSummaryData] = useState<FinalizedSessionData | null>(null);

  // Create / edit sheet
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [sheetInitialDate, setSheetInitialDate] = useState<Date | undefined>(undefined);
  const [sheetInitialTime, setSheetInitialTime] = useState<string | undefined>(undefined);

  // Auto-schedule sheet
  const [isAutoSheetOpen, setIsAutoSheetOpen] = useState(false);

  // Active module
  const [activeModule, setActiveModule] = useState<ModuleId>('calendar');

  // Mobile sidebar drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Onboarding — shown once until dismissed or completed
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('therapy_cal_onboarded');
  });

  // AbleSpace linked state
  const [ablespaceLinked, setAblespaceLinked] = useState<boolean>(() => {
    return !!localStorage.getItem('therapy_cal_ablespace_linked');
  });

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filters modal
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [calendarLayers, setCalendarLayers] = useState<CalendarLayer[]>([
    { id: 'ABA Therapy', label: 'ABA Therapy', color: '#4F83CC', enabled: true },
    { id: 'Speech Therapy', label: 'Speech Therapy', color: '#2E9E63', enabled: true },
    { id: 'Occupational Therapy', label: 'Occupational Therapy', color: '#7C52D0', enabled: true },
  ]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handlePrevious = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  // ── Create sheet ─────────────────────────────────────────────────────────────

  const openCreateSheet = (date?: Date, time?: string) => {
    setEditSession(null);
    setSheetInitialDate(date);
    setSheetInitialTime(time);
    setIsSheetOpen(true);
  };

  const openEditSheet = (session: Session) => {
    setSelectedSession(null);
    setEditSession(session);
    setSheetInitialDate(undefined);
    setSheetInitialTime(undefined);
    setIsSheetOpen(true);
  };

  // Build the flat program + target lists needed by saveSessionMappings
  const buildMappingLists = (selectedPrograms: Record<string, string[]> | undefined) => {
    if (!selectedPrograms || Object.keys(selectedPrograms).length === 0) {
      return { programList: [], targetList: [] };
    }
    const allProgramIds = Object.values(selectedPrograms).flat();
    const programList = allProgramIds.map(id => ({ id }));
    const targetList = allProgramIds.flatMap(programId => {
      const prog = programs.find(p => p.id === programId);
      if (!prog) {
        console.warn('[buildMappingLists] program not found in context:', programId);
        return [];
      }
      return prog.targets.map(t => ({ id: t.id, program_id: programId }));
    });
    return { programList, targetList };
  };

  const handleSheetSave = (data: Omit<Session, 'id'>, editId?: string) => {
    // Validate: session tab requires at least one program
    if (
      data.students.length > 0 &&
      (!data.selectedPrograms || Object.keys(data.selectedPrograms).length === 0)
    ) {
      toast.error('Please select at least one program for this session.');
      return;
    }

    console.log('[handleSheetSave] saving session — selectedPrograms:', data.selectedPrograms);

    const payload = {
      session_name: data.sessionName,
      students:     data.students,
      providers:    data.providers,
      service_type: data.serviceType || null,
      start_time:   data.startTime.toISOString(),
      end_time:     data.endTime.toISOString(),
      color:        data.color,
      notes:        data.notes || null,
      status:       'scheduled' as const,
    };
    if (editId) {
      setSessions(prev => prev.map(s => s.id === editId ? { ...data, id: editId } : s));
      toast.success('Session updated!');
      supabase.from('sessions').update(payload).eq('id', editId)
        .then(({ error }) => {
          if (error) { console.error('[Supabase] updateSession:', error.message); return; }
          const { programList, targetList } = buildMappingLists(data.selectedPrograms);
          saveSessionMappings(editId, programList, targetList)
            .catch(err => console.error('[handleSheetSave] saveSessionMappings edit error:', err));
        });
    } else {
      const id = crypto.randomUUID();
      setSessions(prev => [...prev, { ...data, id }]);
      toast.success('Session created!');
      supabase.from('sessions').insert({ ...payload, id })
        .then(({ error }) => {
          if (error) { console.error('[Supabase] createSession:', error.message); return; }
          const { programList, targetList } = buildMappingLists(data.selectedPrograms);
          saveSessionMappings(id, programList, targetList)
            .catch(err => console.error('[handleSheetSave] saveSessionMappings create error:', err));
        });
    }
  };

  // ── Session interactions ────────────────────────────────────────────────────

  const handleSessionClick = (session: Session) => setSelectedSession(session);

  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    openCreateSheet(date, `${h}:${m}`);
  };

  const handleSessionUpdate = (updated: Session) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    toast.success('Session moved!');
    supabase.from('sessions').update({
      start_time: updated.startTime.toISOString(),
      end_time:   updated.endTime.toISOString(),
    }).eq('id', updated.id)
      .then(({ error }) => { if (error) console.error('[Supabase] moveSession:', error.message); });
  };

  const handleDelete = async (session: Session) => {
    setSessions(prev => prev.filter(s => s.id !== session.id));
    setSelectedSession(null);
    toast.success('Session deleted!');
    // Unlink phase_history audit rows first.
    // Handles deployments where the ON DELETE SET NULL migration has not yet been applied.
    await supabase.from('phase_history').update({ session_id: null }).eq('session_id', session.id);
    const { error } = await supabase.from('sessions').delete().eq('id', session.id);
    if (error) console.error('[Supabase] deleteSession:', error.message);
  };

  const handleFinalize = (data: FinalizedSessionData) => {
    setFinalizedSessions(prev => ({ ...prev, [data.session.id]: data }));
    setIsDataCollectionOpen(false);
    setSummaryData(data);
    toast.success('Session finalized successfully');

    // Persist finalized status to Supabase
    // (Session data and phase history are written by DataCollectionSheet's phase engine)
    supabase.from('sessions').update({
      status: 'finalized',
    }).eq('id', data.session.id)
      .then(({ error }) => { if (error) console.error('[Supabase] finalizeSession:', error.message); });
  };

  const handleViewSummary = () => {
    if (!selectedSession) return;
    const data = finalizedSessions[selectedSession.id];
    if (!data) {
      toast.info('Finalize the session first to view the summary');
      return;
    }
    setSummaryData(data);
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  const handleLayerToggle = (id: string) =>
    setCalendarLayers(layers =>
      layers.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l)
    );

  // ── Auto-schedule ───────────────────────────────────────────────────────────

  const handleInsertGeneratedSessions = (newSessions: Session[]) => {
    setSessions(prev => [...prev, ...newSessions]);
    toast.success(`${newSessions.length} session${newSessions.length !== 1 ? 's' : ''} inserted into calendar!`);
  };

  // ── Onboarding + AbleSpace ──────────────────────────────────────────────────

  const handleOnboardingClose = () => {
    localStorage.setItem('therapy_cal_onboarded', 'true');
    setShowOnboarding(false);
  };

  const handleAblespaceLinked = () => {
    localStorage.setItem('therapy_cal_ablespace_linked', 'true');
    localStorage.setItem('therapy_cal_onboarded', 'true');
    setAblespaceLinked(true);
    setShowOnboarding(false);
    toast.success('AbleSpace connected! Students, providers and sessions synced.');
  };

  const handleUnlinkAblespace = () => {
    localStorage.removeItem('therapy_cal_ablespace_linked');
    setAblespaceLinked(false);
    toast.success('AbleSpace disconnected.');
  };

  // Clicking "Link Account" in sidebar opens onboarding modal (or settings if already linked)
  const handleLinkAccountFromSidebar = () => {
    if (ablespaceLinked) {
      setSettingsOpen(true);
    } else {
      setShowOnboarding(true);
    }
  };

  const enabledLayerIds = calendarLayers.filter(l => l.enabled).map(l => l.id);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.appBg, transition: 'background-color 0.2s' }}>
      <Toaster />

      {/* ── Full-width top ribbon ────────────────────────────────────────── */}
      <TopRibbon
        sidebarCollapsed={false}
        onToggleCollapse={() => {}}
        onOpenSettings={() => setSettingsOpen(true)}
        sessions={sessions}
        onMenuOpen={() => setMobileSidebarOpen(true)}
      />

      {/* ── Below ribbon: unified left sidebar + main content ────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: unified navigation + calendar tools ────────────────── */}
        <AppSidebar
          activeModule={activeModule}
          onModuleChange={(id) => { setActiveModule(id); setMobileSidebarOpen(false); }}
          currentDate={currentDate}
          onDateSelect={(date) => { setCurrentDate(date); setMobileSidebarOpen(false); }}
          visibleRange={visibleRange}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* ── Main content — fills remaining space ─────────────────────── */}
        <div className="flex-1 flex overflow-hidden min-w-0 mobile-content-safe">
          {activeModule === 'calendar' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden relative">
                {sessionsLoading && <CalendarSkeleton />}
                {viewMode === 'week' && (
                  <WeekView
                    currentDate={currentDate}
                    sessions={sessions}
                    onSessionClick={handleSessionClick}
                    onSlotClick={handleSlotClick}
                    onSessionUpdate={handleSessionUpdate}
                    enabledLayers={enabledLayerIds}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                    onCreateSession={() => openCreateSheet()}
                    onAutoSchedule={() => setIsAutoSheetOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onVisibleRangeChange={handleVisibleRangeChange}
                    onFilterOpen={() => setFiltersOpen(true)}
                  />
                )}
                {viewMode === 'day' && (
                  <DayView
                    currentDate={currentDate}
                    sessions={sessions}
                    onSessionClick={handleSessionClick}
                    onSlotClick={handleSlotClick}
                    onSessionUpdate={handleSessionUpdate}
                    enabledLayers={enabledLayerIds}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                    onCreateSession={() => openCreateSheet()}
                    onAutoSchedule={() => setIsAutoSheetOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onVisibleRangeChange={handleVisibleRangeChange}
                    onFilterOpen={() => setFiltersOpen(true)}
                  />
                )}
                {viewMode === 'month' && (
                  <MonthView
                    currentDate={currentDate}
                    sessions={sessions}
                    onSessionClick={handleSessionClick}
                    onDateClick={handleDateClick}
                    enabledLayers={enabledLayerIds}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                    onCreateSession={() => openCreateSheet()}
                    onAutoSchedule={() => setIsAutoSheetOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onFilterOpen={() => setFiltersOpen(true)}
                  />
                )}

                {/* Details panel backdrop */}
                {selectedSession && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}
                      onClick={() => setSelectedSession(null)}
                    />
                    <SessionDetailsPanel
                      session={selectedSession}
                      onClose={() => setSelectedSession(null)}
                      onEdit={openEditSheet}
                      onDelete={handleDelete}
                      onTakeData={() => setIsDataCollectionOpen(true)}
                      onViewSummary={handleViewSummary}
                    />
                  </>
                )}
              </div>
            </div>
          ) : activeModule === 'learners' ? (
            <LearnersPage />
          ) : activeModule === 'program-templates' ? (
            <ProgramTemplatesPage />
          ) : (
            <ModulePlaceholder module={activeModule} />
          )}
        </div>
      </div>

      {/* Data Collection Sheet */}
      {isDataCollectionOpen && selectedSession && (
        <DataCollectionSheet
          session={selectedSession}
          onClose={() => setIsDataCollectionOpen(false)}
          onFinalize={handleFinalize}
        />
      )}

      {/* Session Summary Screen */}
      {summaryData && (
        <SessionSummaryScreen
          data={summaryData}
          onClose={() => setSummaryData(null)}
        />
      )}

      {/* Filters modal */}
      <FiltersModal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />

      {/* Create / Edit sheet */}
      <SessionCreateSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSave={handleSheetSave}
        initialDate={sheetInitialDate}
        initialStartTime={sheetInitialTime}
        editSession={editSession}
        sessions={sessions}
      />

      {/* Auto-Schedule sheet */}
      <AutoScheduleSheet
        isOpen={isAutoSheetOpen}
        onClose={() => setIsAutoSheetOpen(false)}
        onInsert={handleInsertGeneratedSessions}
      />

      {/* First-time onboarding modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onLinked={handleAblespaceLinked}
      />

      {/* Settings modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        ablespaceLinked={ablespaceLinked}
        onUnlinkAblespace={handleUnlinkAblespace}
        onLinkAblespace={() => {
          setSettingsOpen(false);
          setShowOnboarding(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ParticipantsProvider>
        <ProgramTemplatesProvider>
          <LearnerProgramsProvider>
            <AppInner />
          </LearnerProgramsProvider>
        </ProgramTemplatesProvider>
      </ParticipantsProvider>
    </ThemeProvider>
  );
}