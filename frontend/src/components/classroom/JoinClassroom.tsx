import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showError, showSuccess } from '@/components/ui/Toast';
import { classroomsAPI } from '@/lib/api';
import { useAuthStore } from '@/store';

export function JoinClassroom() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4) {
      showError('Please enter a valid classroom code.');
      return;
    }

    if (!isAuthenticated) {
      showError('Please sign in or register as a student first.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await classroomsAPI.join(cleaned);
      showSuccess('Joined classroom!');
      navigate(`/classroom/${res.classroom.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid classroom code.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            R
          </div>
          <h1 className="text-lg font-bold text-slate-900">Join a Live Classroom</h1>
          <p className="mt-1 text-xs text-slate-500">
            Enter the 6-character classroom code provided by your teacher.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Classroom Code"
            placeholder="A1B2C3"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="h-12 text-center font-mono text-xl font-bold tracking-[0.35em] uppercase"
            required
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={loading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Join Classroom
          </Button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

