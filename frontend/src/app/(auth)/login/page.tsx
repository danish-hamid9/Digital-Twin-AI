'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getAuthStatus()
      .then((status) => {
        if (isMounted) setDemoEnabled(status.demo_login_enabled);
      })
      .catch(() => {
        if (isMounted) setDemoEnabled(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/overview');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);

    try {
      await demoLogin();
      router.push('/overview');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Digital Twin AI
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to simulate your trajectory and review decisions
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  data-testid="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  data-testid="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <button
              id="login-submit"
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {demoEnabled && (
              <div className="pt-2">
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative bg-slate-900/90 px-3 text-xs uppercase tracking-wider text-slate-500">
                    or
                  </span>
                </div>
                <button
                  id="demo-login-btn"
                  data-testid="demo-login-btn"
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading || demoLoading}
                  className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-indigo-300 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition text-sm disabled:opacity-50 group shadow-sm"
                >
                  {demoLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Entering demo account...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>Try the demo account</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-sm text-slate-400">
              Don&apos;t have a digital twin yet?{' '}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
