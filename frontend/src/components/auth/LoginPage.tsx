import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showError, showSuccess } from '@/components/ui/Toast';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';

export function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authAPI.login({ email: email.trim(), password });
      const user = {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.full_name,
        role: data.user.role,
        avatarUrl: data.user.avatar_url,
        locale: 'en',
        institutionId: data.user.institution_id,
        createdAt: data.user.created_at || new Date().toISOString(),
        updatedAt: data.user.updated_at || new Date().toISOString(),
      };
      loginStore(user, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: 1800,
      });
      showSuccess(`Welcome back, ${user.displayName}`);
      navigate(user.role === 'student' ? '/student' : '/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Sign in failed. Please check your credentials.';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white shadow-sm">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rekha</h1>
          <p className="mt-1 text-sm font-medium text-primary-800">Teach Better. Learn Visually.</p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Sign in to your classroom</h2>
          <p className="mt-1 text-xs text-slate-500">
            Access your whiteboards, lessons, and classrooms.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftElement={<Mail className="h-4 w-4" />}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftElement={<Lock className="h-4 w-4" />}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                Remember me
              </label>
              <Link to="/join" className="font-medium text-primary hover:text-primary-700">
                Join with classroom code
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            New to Rekha?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-700">
              Create an account
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

