'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Link from 'next/link';
import { Sparkles, ArrowRight, Activity, TrendingUp, Brain, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/overview');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[500px] bg-gradient-to-b from-indigo-500/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-xl text-white">Digital Twin AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/25 transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          Phase 1 Foundation Live
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Predict Your Future.<br />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
            Simulate Every Life Decision.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Create a holistic digital twin from your personal finance, study consistency, and wellbeing data.
          Run Monte Carlo what-if scenarios and review AI-grounded plans.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition group"
          >
            <span>Initialize Your Twin</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl transition"
          >
            Existing Member Sign In
          </Link>
        </div>

        {/* Value Prop Badges */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left w-full max-w-3xl">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <TrendingUp className="w-5 h-5 text-emerald-400 mb-2.5" />
            <h2 className="font-semibold text-white text-sm">Finance & Savings</h2>
            <p className="text-xs text-slate-400 mt-1">Multi-month expense forecasting with confidence bands.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <Brain className="w-5 h-5 text-indigo-400 mb-2.5" />
            <h2 className="font-semibold text-white text-sm">Study & Cognitive Output</h2>
            <p className="text-xs text-slate-400 mt-1">Exam score modeling factoring sleep debt and habits.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <Activity className="w-5 h-5 text-amber-400 mb-2.5" />
            <h2 className="font-semibold text-white text-sm">Habits & Burnout</h2>
            <p className="text-xs text-slate-400 mt-1">Streak resilience and Monte Carlo risk simulations.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© 2026 Digital Twin AI. All modeling estimates are probabilistic.</span>
        <div className="flex items-center gap-2 text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Per-user data isolation & GDPR export/delete enabled</span>
        </div>
      </footer>
    </div>
  );
}
