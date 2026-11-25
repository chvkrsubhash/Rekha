import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { showError, showSuccess } from '@/components/ui/Toast';
import { classroomsAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import type { ClassroomSummary } from './ClassroomCard';

export function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadClassrooms = async () => {
    try {
      const list = await classroomsAPI.list();
      setClassrooms(list);
    } catch {
      setClassrooms([]);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await classroomsAPI.join(joinCode.trim().toUpperCase());
      showSuccess('Joined classroom!');
      setJoinCode('');
      loadClassrooms();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not join classroom. Check the code.';
      showError(msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
            R
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">Rekha</span>
            <span className="ml-2 text-xs text-slate-500">Student Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-700">{user?.displayName}</span>
          <Button size="sm" variant="ghost" onClick={logout} leftIcon={<LogOut className="h-3.5 w-3.5" />}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Join a Classroom</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Enter the 6-character code shared by your teacher.
          </p>
          <form onSubmit={handleJoin} className="mt-3 flex gap-2 max-w-sm">
            <Input
              placeholder="e.g. A1B2C3"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono uppercase tracking-widest"
            />
            <Button type="submit" isLoading={joining} leftIcon={<LogIn className="h-4 w-4" />}>
              Join
            </Button>
          </form>
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">My Enrolled Classrooms</h3>
          {classrooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">No classrooms yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Use a classroom code above to join your teacher's class.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {classrooms.map((cls) => (
                <div key={cls.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{cls.name}</h4>
                      <p className="text-xs text-slate-500">
                        {[cls.grade, cls.section].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {cls.subject && <Badge variant="info">{cls.subject}</Badge>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      leftIcon={<Users className="h-3.5 w-3.5" />}
                      onClick={() => navigate(`/classroom/${cls.id}`)}
                    >
                      Open Classroom
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

