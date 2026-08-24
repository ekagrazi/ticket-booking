'use client';
import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSearchParams, useRouter } from 'next/navigation';
import { Ticket, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get('next') || '/events';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please try again.'
        : error.message);
    } else {
      router.push(next);
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Ticket className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1.5">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm shadow-purple-200 mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-purple-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
