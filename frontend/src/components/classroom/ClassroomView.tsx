import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Copy, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { showError, showSuccess } from '@/components/ui/Toast';
import { classroomsAPI } from '@/lib/api';
import { useAuthStore } from '@/store';

interface ClassroomDetail {
  id: string;
  name: string;
  subject?: string;
  grade?: string;
  section?: string;
  description?: string;
  code: string;
  member_count?: number;
}

interface MemberItem {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  joined_at?: string;
}

export function ClassroomView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role !== 'student';

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      classroomsAPI.get(id),
      isTeacher ? classroomsAPI.getMembers(id).catch(() => []) : Promise.resolve([]),
    ])
      .then(([cls, mems]) => {
        setClassroom(cls);
        setMembers(mems);
      })
      .catch(() => showError('Could not load classroom details.'))
      .finally(() => setLoading(false));
  }, [id, isTeacher]);

  const handleStartLiveSession = async () => {
    if (!id) return;
    try {
      const session = await classroomsAPI.startSession(id, {});
      navigate(`/session/${session.id}`);
    } catch {
      showError('Failed to start live session.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      await classroomsAPI.removeMember(id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      showSuccess('Student removed from classroom.');
    } catch {
      showError('Failed to remove student.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading classroom...
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-sm text-slate-600">Classroom not found.</p>
        <Button onClick={() => navigate(isTeacher ? '/dashboard' : '/student')}>Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(isTeacher ? '/dashboard' : '/student')}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">{classroom.name}</h1>
                {classroom.subject && <Badge variant="info">{classroom.subject}</Badge>}
              </div>
              <p className="text-xs text-slate-500">
                {[classroom.grade, classroom.section].filter(Boolean).join(' · ') || 'Classroom'}
              </p>
            </div>
          </div>

          {isTeacher && (
            <Button leftIcon={<Play className="h-4 w-4" />} onClick={handleStartLiveSession}>
              Start Live Session
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <Tabs
          items={[
            {
              value: 'overview',
              label: 'Overview',
              content: (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Student Join Code
                    </h3>
                    <div className="classroom-code mt-3">{classroom.code}</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() => {
                        navigator.clipboard.writeText(classroom.code);
                        showSuccess('Join code copied');
                      }}
                    >
                      Copy Code
                    </Button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Classroom Details
                    </h3>
                    <p className="text-sm text-slate-700">
                      {classroom.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-600">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{classroom.member_count ?? members.length} enrolled students</span>
                    </div>
                  </div>
                </div>
              ),
            },
            ...(isTeacher
              ? [
                  {
                    value: 'members',
                    label: `Students (${members.length})`,
                    content: (
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        {members.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500">
                            No students have joined yet. Share the classroom code above.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                              <tr>
                                <th className="px-4 py-2.5 font-semibold">Name</th>
                                <th className="px-4 py-2.5 font-semibold">Email</th>
                                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {members.map((m) => (
                                <tr key={m.user_id}>
                                  <td className="px-4 py-2.5 font-medium text-slate-900">{m.full_name}</td>
                                  <td className="px-4 py-2.5 text-slate-500">{m.email}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(m.user_id)}
                                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                      title="Remove student"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </main>
    </div>
  );
}

