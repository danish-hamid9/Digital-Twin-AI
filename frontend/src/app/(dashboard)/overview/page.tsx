'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { DashboardOverviewResponse, OverviewPredictionResponse } from '@/lib/types';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import CashFlowChart from '@/components/charts/CashFlowChart';
import ExpenseCategoryDonut from '@/components/charts/ExpenseCategoryDonut';
import StudyTrendChart from '@/components/charts/StudyTrendChart';
import HabitStreakAndMoodChart from '@/components/charts/HabitStreakAndMoodChart';
import FinanceForecastFanChart from '@/components/charts/FinanceForecastFanChart';
import StudyScorePredictionCard from '@/components/charts/StudyScorePredictionCard';
import HabitBurnoutRiskGauge from '@/components/charts/HabitBurnoutRiskGauge';
import RecommendationsSection from '@/components/recommendations/RecommendationsSection';
import {
  Wallet,
  GraduationCap,
  Activity,
  Sliders,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Plus,
  Loader2,
  Calendar,
  Flame,
  Award,
  Clock,
  Moon,
  Smile,
  PieChart as PieIcon,
  Sparkles,
  BarChart3,
  Compass,
  Cpu,
  BrainCircuit,
  HeartPulse,
} from 'lucide-react';

export default function OverviewPage() {
  const { profile, user } = useAuth();
  const currency = profile?.currency || 'USD';

  // Date Range filter state
  const [preset, setPreset] = useState<string>('30d');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Overview data state
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Prediction state
  const [predictions, setPredictions] = useState<OverviewPredictionResponse | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [activeMLTab, setActiveMLTab] = useState<'finance' | 'study' | 'habits'>('finance');

  const fetchPredictions = useCallback(async () => {
    setLoadingPredictions(true);
    try {
      const data = await api.getOverviewPredictions(6);
      setPredictions(data);
    } catch (err) {
      console.error('Failed to load overview predictions:', err);
    } finally {
      setLoadingPredictions(false);
    }
  }, []);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardOverview({
        preset,
        start_date: startDate,
        end_date: endDate,
      });
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load dashboard overview:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate]);

  useEffect(() => {
    fetchOverview();
    fetchPredictions();
  }, [fetchOverview, fetchPredictions]);

  const handleDateRangeChange = (newPreset: string, start?: string, end?: string) => {
    setPreset(newPreset);
    setStartDate(start);
    setEndDate(end);
  };

  const fin = overview?.finance;
  const stu = overview?.study;
  const hab = overview?.habits;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner & Date Range Filter Toolbar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital Twin Intelligence Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {profile?.full_name || 'Explorer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time multi-domain dashboard aggregating your financial runway, academic performance, and recovery metrics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <DateRangePicker
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
            isLoading={loading}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchOverview}
            className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 rounded-lg text-white font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3 Domain Cards Grid (Emerald, Indigo, Amber/Rose) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Finance Domain Card (Emerald Accent) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 group flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-emerald-400 font-semibold">
                {currency}
              </span>
            </div>

            <h2 className="text-base font-bold text-white tracking-tight">Personal Finance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Cash flow, savings rate, and burn rate</p>

            {/* Key Metrics */}
            <div className="mt-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Net Savings</span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      (fin?.net_savings || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      `${(fin?.net_savings || 0) >= 0 ? '+' : ''}${currency} ${Number(fin?.net_savings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Rate</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {loading ? '—' : `${fin?.savings_rate || 0}%`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Total Inflow</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    {loading ? '—' : `${currency} ${Number(fin?.total_income || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Total Outflow</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    {loading ? '—' : `${currency} ${Number(fin?.total_expenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  </span>
                </div>
              </div>

              {fin?.runway_months !== null && fin?.runway_months !== undefined && (
                <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                  <span>Estimated Runway:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {fin.runway_months} months
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/finance"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform"
            >
              <span>Manage Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/finance"
              className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition"
              title="Add Transaction"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Study Domain Card (Indigo Accent) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 group flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-indigo-300 font-semibold">
                {profile?.target_study_hours_week || 15}h Target/Wk
              </span>
            </div>

            <h2 className="text-base font-bold text-white tracking-tight">Study & Academics</h2>
            <p className="text-xs text-slate-400 mt-0.5">Focus sessions, subject distribution, and exam trends</p>

            {/* Key Metrics */}
            <div className="mt-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Focus Time Logged</span>
                  <span className="text-lg font-bold font-mono text-indigo-400">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      `${stu?.total_study_hours || 0} hrs`
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Avg Score</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    {loading ? '—' : stu?.avg_score ? `${stu.avg_score}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Weekly Pace Progress Bar */}
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">7-Day Target Pace</span>
                  <span className="font-mono text-indigo-300 font-bold text-[11px]">
                    {stu?.weekly_progress_pct || 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stu?.weekly_progress_pct || 0)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                <span>Top Subject:</span>
                <span className="font-medium text-slate-200 truncate max-w-[130px]">
                  {stu?.top_subject || 'None recorded'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/study"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform"
            >
              <span>View Sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/study"
              className="p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition"
              title="Add Session"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Habits & Wellbeing Domain Card (Amber/Rose Accent) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 group flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-400 font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{hab?.current_streak || 0}d Streak</span>
              </span>
            </div>

            <h2 className="text-base font-bold text-white tracking-tight">Habits & Recovery</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sleep duration, subjective vitality, and consistency</p>

            {/* Key Metrics */}
            <div className="mt-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Avg Sleep</span>
                  <span className="text-lg font-bold font-mono text-amber-400">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      `${hab?.avg_sleep_hours || 0} hrs`
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Vitality Mood</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    {loading ? '—' : `★ ${hab?.avg_mood || 0} / 5`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Completion</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    {loading ? '—' : `${hab?.habit_completion_rate || 0}%`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Avg Exercise</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    {loading ? '—' : `${hab?.avg_exercise_minutes || 0}m/d`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                <span>Sleep Target vs Actual:</span>
                <span className={`font-mono font-semibold ${(hab?.sleep_variance || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(hab?.sleep_variance || 0) >= 0 ? `+${hab?.sleep_variance}h` : `${hab?.sleep_variance}h`}
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/habits"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform"
            >
              <span>View Wellbeing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/habits"
              className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition"
              title="Add Habit Log"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Phase 4: Machine Learning Forecast & Prediction Suite */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>AI Predictive Twin & ML Forecasts</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  Phase 4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ridge, RandomForest & Calibrated Logistic models with dynamic cold-start blending
              </p>
            </div>
          </div>

          {/* Domain ML Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveMLTab('finance')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeMLTab === 'finance'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Finance Forecast
            </button>
            <button
              onClick={() => setActiveMLTab('study')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeMLTab === 'study'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Academic Score Drivers
            </button>
            <button
              onClick={() => setActiveMLTab('habits')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeMLTab === 'habits'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Streak & Burnout
            </button>
          </div>
        </div>

        {/* Prediction Visual Card */}
        {loadingPredictions && !predictions ? (
          <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Computing machine learning predictions across personal & global benchmarks...</span>
          </div>
        ) : predictions ? (
          <div>
            {activeMLTab === 'finance' && (
              <FinanceForecastFanChart
                prediction={predictions.finance}
                currency={currency}
              />
            )}
            {activeMLTab === 'study' && (
              <StudyScorePredictionCard
                prediction={predictions.study}
              />
            )}
            {activeMLTab === 'habits' && (
              <HabitBurnoutRiskGauge
                prediction={predictions.habits}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* Phase 6: Actionable Recommendations Engine */}
      <RecommendationsSection />

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Cash Flow & Savings Rate */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cash Flow & Savings Trajectory</h3>
                <p className="text-[11px] text-slate-400">Income vs. Expenses with Net Savings Overlay</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {currency}
            </span>
          </div>

          <CashFlowChart
            data={fin?.cash_flow_trend || []}
            currency={currency}
            savingsRate={fin?.savings_rate}
          />
        </div>

        {/* Chart 2: Expense Category Distribution Donut */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Expense Distribution</h3>
                <p className="text-[11px] text-slate-400">Breakdown across living categories</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {fin?.category_distribution?.length || 0} Categories
            </span>
          </div>

          <ExpenseCategoryDonut
            data={fin?.category_distribution || []}
            currency={currency}
            totalExpenses={fin?.total_expenses}
          />
        </div>

        {/* Chart 3: Study Hours vs. Assessment Performance Dual-Axis */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Study Focus vs. Score Trajectory</h3>
                <p className="text-[11px] text-slate-400">Dual-axis correlation of focus hours & exam scores</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-indigo-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {stu?.sessions_count || 0} Sessions
            </span>
          </div>

          <StudyTrendChart
            data={stu?.study_trend || []}
            avgScore={stu?.avg_score || undefined}
          />
        </div>

        {/* Chart 4: Habits Recovery & Sleep vs Mood Correlation */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recovery & Vitality Correlation</h3>
                <p className="text-[11px] text-slate-400">Daily sleep duration vs subjective mood rating</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {hab?.logs_count || 0} Daily Logs
            </span>
          </div>

          <HabitStreakAndMoodChart
            trendData={hab?.habits_trend || []}
            sleepBuckets={hab?.sleep_buckets || []}
            targetSleep={hab?.target_sleep_hours}
          />
        </div>
      </div>

      {/* Footer Navigation: Simulator & Chat Shortcuts */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-white block">Phase 3 Complete: Dashboard & Analytics Live</span>
            <span className="text-xs text-slate-400">
              Ready for Phase 4: Machine Learning Forecasts &amp; Confidence Uncertainty Bands.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/simulator"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulator Assumptions</span>
          </Link>
          <Link
            href="/chat"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Digital Twin</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
