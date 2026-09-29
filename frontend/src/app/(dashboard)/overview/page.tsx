'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import {
  Wallet,
  GraduationCap,
  Activity,
  Sliders,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function OverviewPage() {
  const { profile } = useAuth();
  const currency = profile?.currency || 'USD';

  const [loading, setLoading] = useState(true);
  const [financeCount, setFinanceCount] = useState(0);
  const [studyCount, setStudyCount] = useState(0);
  const [habitCount, setHabitCount] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const [f, s, h] = await Promise.all([
          api.getFinanceEntries({ page: 1, page_size: 1 }),
          api.getStudySessions({ page: 1, page_size: 1 }),
          api.getHabitLogs({ page: 1, page_size: 1 }),
        ]);
        setFinanceCount(f.total);
        setStudyCount(s.total);
        setHabitCount(h.total);
      } catch (err) {
        console.error('Failed to load summary stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Phase 2: Ingestion & Live CRUD Active
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Hello, {profile?.full_name || 'Twin Explorer'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Your personal digital twin is synthesizing real-time data across personal finance, study consistency, and lifestyle habits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition"
          >
            Preferences & GDPR
          </Link>
          <Link
            href="/simulator"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-medium text-white shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulator Assumptions</span>
          </Link>
        </div>
      </div>

      {/* Domain Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Finance Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 transition group flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-emerald-400">
                {currency}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">Personal Finance</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Track income, categorized expenses, and savings runway.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Recorded Entries</span>
              <span className="text-white font-mono font-bold text-sm">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${financeCount} entries`}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/finance"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform"
            >
              <span>Manage Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/finance"
              className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition"
              title="Add Transaction"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Study Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 transition group flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-indigo-300">
                {profile?.target_study_hours_week || 15}h Target
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">Study & Academic</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Log focus hours, subject topics, and exam scores.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Recorded Sessions</span>
              <span className="text-white font-mono font-bold text-sm">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${studyCount} sessions`}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/study"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:translate-x-0.5 transition-transform"
            >
              <span>View Sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/study"
              className="p-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition"
              title="Add Session"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Habits Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 transition group flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-amber-400">
                {profile?.target_sleep_hours || 7.5}h Sleep Goal
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">Habits & Recovery</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Track daily sleep duration, exercise, and subjective vitality.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Daily Logs</span>
              <span className="text-white font-mono font-bold text-sm">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${habitCount} logs`}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/habits"
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 group-hover:translate-x-0.5 transition-transform"
            >
              <span>View Wellbeing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/habits"
              className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition"
              title="Add Habit Log"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation / Next Phase Roadmap */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white block">Phase 2 Completed</span>
            <span className="text-xs text-slate-400">
              Data Entry, Kaggle Ingestion &amp; 90-day Synthetic Generator are ready. Next: Phase 3 Analytics &amp; Trend Charts.
            </span>
          </div>
        </div>

        <Link
          href="/simulator"
          className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
        >
          <span>View Assumptions</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
