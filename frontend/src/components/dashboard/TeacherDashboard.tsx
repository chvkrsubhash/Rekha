import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  BookOpen,
  Users,
  FileUp,
  Search,
  PenTool,
  LayoutTemplate,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import type { NavSection } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showError, showSuccess } from '@/components/ui/Toast';
import { WhiteboardCard, type WhiteboardSummary } from './WhiteboardCard';
import { ClassroomCard, type ClassroomSummary } from './ClassroomCard';
import { CreateClassroomModal } from '@/components/classroom/CreateClassroomModal';
import { useAuthStore } from '@/store';
import { whiteboardsAPI, classroomsAPI } from '@/lib/api';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function TeacherDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [whiteboards, setWhiteboards] = useState<WhiteboardSummary[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createClassroomOpen, setCreateClassroomOpen] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [wbs, cls] = await Promise.all([
        whiteboardsAPI.list().catch(() => []),
        classroomsAPI.list().catch(() => []),
      ]);
      setWhiteboards(wbs);
      setClassrooms(cls);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleNewWhiteboard = async () => {
    setCreatingBoard(true);
    try {
      const created = await whiteboardsAPI.create({ title: 'Untitled Lesson Board' });
      navigate(`/whiteboard/${created.id}`);
    } catch {
      // Allow offline whiteboard creation fallback
      const offlineId = `offline-${Date.now()}`;
      showSuccess('Opened local offline whiteboard');
      navigate(`/whiteboard/${offlineId}`);
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleDuplicateBoard = async (id: string) => {
    try {
      await whiteboardsAPI.duplicate(id);
      showSuccess('Whiteboard duplicated');
      loadDashboardData();
    } catch {
      showError('Failed to duplicate whiteboard');
    }
  };

  const handleDeleteBoard = async (id: string) => {
    try {
      await whiteboardsAPI.delete(id);
      setWhiteboards((prev) => prev.filter((w) => w.id !== id));
      showSuccess('Whiteboard moved to trash');
    } catch {
      showError('Failed to delete whiteboard');
    }
  };

  const handleStartSession = async (classroomId: string) => {
    try {
      const session = await classroomsAPI.startSession(classroomId, {});
      navigate(`/session/${session.id}`);
    } catch {
      showError('Unable to start live session');
    }
  };

  const handleShareCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showSuccess(`Classroom code ${code} copied to clipboard`);
  };

  const filteredBoards = whiteboards.filter((wb) =>
    wb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (wb.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      title={activeSection === 'home' ? 'Dashboard' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
      headerActions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:block w-60">
            <Input
              placeholder="Search boards or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftElement={<Search className="h-3.5 w-3.5" />}
            />
          </div>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleNewWhiteboard}
            isLoading={creatingBoard}
          >
            New Whiteboard
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Welcome Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {getGreeting()}, {user?.displayName || 'Teacher'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Prepare lessons, launch interactive whiteboards, and conduct live classes.
          </p>
        </div>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={handleNewWhiteboard}
            className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50/70 p-3.5 text-left transition-colors hover:bg-teal-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <PenTool className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">New Whiteboard</div>
              <div className="text-[11px] text-slate-500">Blank teaching canvas</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCreateClassroomOpen(true)}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">New Classroom</div>
              <div className="text-[11px] text-slate-500">Generate student code</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleNewWhiteboard}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary">
              <FileUp className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Import PDF</div>
              <div className="text-[11px] text-slate-500">Annotate worksheets</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('templates')}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Lesson Templates</div>
              <div className="text-[11px] text-slate-500">Math, Science, Exams</div>
            </div>
          </button>
        </section>

        {/* Recent Whiteboards */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Whiteboards</h3>
            {whiteboards.length > 0 && (
              <span className="text-xs text-slate-500">{filteredBoards.length} boards</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
              <BookOpen className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">No whiteboards yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Create your first interactive whiteboard to start teaching.
              </p>
              <Button className="mt-4" size="sm" onClick={handleNewWhiteboard}>
                Create Whiteboard
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredBoards.map((wb) => (
                <WhiteboardCard
                  key={wb.id}
                  whiteboard={wb}
                  onOpen={(id) => navigate(`/whiteboard/${id}`)}
                  onDuplicate={handleDuplicateBoard}
                  onDelete={handleDeleteBoard}
                />
              ))}
            </div>
          )}
        </section>

        {/* Classrooms */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">My Classrooms</h3>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateClassroomOpen(true)}
            >
              Create Classroom
            </Button>
          </div>

          {classrooms.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <Users className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">No classrooms created</p>
              <p className="mt-1 text-xs text-slate-500">
                Create a classroom to invite students with a join code and run live sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classrooms.map((cls) => (
                <ClassroomCard
                  key={cls.id}
                  classroom={cls}
                  onOpen={(id) => navigate(`/classroom/${id}`)}
                  onStartSession={handleStartSession}
                  onShareCode={handleShareCode}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreateClassroomModal
        open={createClassroomOpen}
        onOpenChange={setCreateClassroomOpen}
        onCreated={() => {
          setCreateClassroomOpen(false);
          loadDashboardData();
        }}
      />
    </AppShell>
  );
}

