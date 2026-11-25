import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { JoinClassroom } from '@/components/classroom/JoinClassroom';

const TeacherDashboard = lazy(() =>
  import('@/components/dashboard/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const StudentDashboard = lazy(() =>
  import('@/components/dashboard/StudentDashboard').then((m) => ({ default: m.StudentDashboard }))
);
const WhiteboardEditor = lazy(() =>
  import('@/components/whiteboard/WhiteboardEditor').then((m) => ({ default: m.WhiteboardEditor }))
);
const ClassroomView = lazy(() =>
  import('@/components/classroom/ClassroomView').then((m) => ({ default: m.ClassroomView }))
);
const LiveSession = lazy(() =>
  import('@/components/classroom/LiveSession').then((m) => ({ default: m.LiveSession }))
);
const StudentView = lazy(() =>
  import('@/components/classroom/StudentView').then((m) => ({ default: m.StudentView }))
);

function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
        <span className="text-sm font-medium text-slate-600">Loading Rekha...</span>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join" element={<JoinClassroom />} />

        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <TeacherDashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/student"
          element={
            <AuthGuard>
              <StudentDashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/whiteboard/:id"
          element={
            <AuthGuard>
              <WhiteboardEditor />
            </AuthGuard>
          }
        />
        <Route
          path="/classroom/:id"
          element={
            <AuthGuard>
              <ClassroomView />
            </AuthGuard>
          }
        />
        <Route
          path="/session/:sessionId"
          element={
            <AuthGuard>
              <LiveSession />
            </AuthGuard>
          }
        />
        <Route
          path="/session/:sessionId/student"
          element={
            <AuthGuard>
              <StudentView />
            </AuthGuard>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

