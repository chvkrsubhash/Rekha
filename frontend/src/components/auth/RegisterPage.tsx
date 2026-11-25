import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showError, showSuccess } from '@/components/ui/Toast';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';

export function RegisterPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student' | 'tutor'>('teacher');
  const [institutionName, setInstitutionName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the terms of service to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authAPI.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
        institution_name: institutionName.trim() || undefined,
      });

      const user = {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.full_name,
        role: data.user.role,
        locale: 'en',
        createdAt: data.user.created_at || new Date().toISOString(),
        updatedAt: data.user.updated_at || new Date().toISOString(),
      };
      loginStore(user, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: 1800,
      });
      showSuccess('Account created successfully!');
      navigate(role === 'student' ? '/student' : '/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 px-4 py-8 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-sm">
            R
          </div>
          <h1 className="text-xl font-bold text-slate-900">Create your Rekha account</h1>
          <p className="mt-1 text-xs text-slate-500">Teach Better. Learn Visually.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              placeholder="Dr. Ananya Rao"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftElement={<User className="h-4 w-4" />}
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="ananya@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftElement={<Mail className="h-4 w-4" />}
              required
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {(['teacher', 'tutor', 'student'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                      role === r
                        ? 'border-primary bg-teal-50 text-primary-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {r === 'tutor' ? 'Indep. Tutor' : r}
                  </button>
                ))}
              </div>
            </div>

            {role !== 'student' && (
              <Input
                label="School / Institution (optional)"
                placeholder="e.g. Kendriya Vidyalaya or Independent"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                leftElement={<Building2 className="h-4 w-4" />}
              />
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftElement={<Lock className="h-4 w-4" />}
                required
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftElement={<Lock className="h-4 w-4" />}
                required
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>
                I agree to the Rekha educational platform terms of service and student privacy policy.
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-500">
        Rekha — A product of <span className="font-semibold text-slate-700">AkashaVyom Labs</span>
      </footer>
    </div>
  );
}

