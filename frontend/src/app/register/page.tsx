'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Ticket, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const passwordStrength = password.length === 0
    ? null
    : password.length < 6
    ? 'weak'
    : password.length < 10
    ? 'fair'
    : 'strong';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is disabled in Supabase, session is returned immediately
    if (data.session) {
      router.push('/events');
      router.refresh();
    } else {
      // Email confirmation required
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm your email</h2>
          <p className="text-gray-500 text-sm mb-6">
            We sent a confirmation link to <strong className="text-gray-900">{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1.5">Create account</h1>
            <p className="text-gray-500 text-sm">Start booking tickets in seconds</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
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

              {/* Password strength indicator */}
              {passwordStrength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {['weak', 'fair', 'strong'].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength === 'weak' && i === 0
                            ? 'bg-red-400'
                            : passwordStrength === 'fair' && i <= 1
                            ? 'bg-amber-400'
                            : passwordStrength === 'strong'
                            ? 'bg-emerald-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium capitalize ${
                    passwordStrength === 'weak' ? 'text-red-500'
                    : passwordStrength === 'fair' ? 'text-amber-500'
                    : 'text-emerald-500'
                  }`}>
                    {passwordStrength}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !name || !email || !password}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm shadow-purple-200 mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
