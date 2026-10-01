'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { DashboardOverviewResponse, OverviewPredictionResponse, RecommendationItem } from '@/lib/types';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import FinanceForecastFanChart from '@/components/charts/FinanceForecastFanChart';
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
  Sparkles,
  BarChart3,
  Compass,
  Cpu,
  BrainCircuit,
  HeartPulse,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* SVG Circular Score Ring Component                                   */
/* ------------------------------------------------------------------ */
function ScoreRing({
  score,
  label,
  color,
  sublabel,
  glowClass,
}: {
  score: number;
  label: string;
  color: string;
  sublabel: string;
  glowClass?: string;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#1E1B18] border border-[#ECE5D8] dark:border-[#2D2721] transition-all hover:border-[#D6CEC1] dark:hover:border-[#3D3730]">
      <div className={`relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center ${glowClass || ''}`}>
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-[#E6DFD3] dark:stroke-[#2B2621]"
            strokeWidth="7"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tracking-tight">
            {score}
          </span>
          <span className="text-[9px] sm:text-[10px] text-stone-500 dark:text-stone-400 font-semibold uppercase">score</span>
        </div>
      </div>
      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-2">{label}</span>
      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate max-w-[100px]">{sublabel}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton Loaders                                                   */
/* ------------------------------------------------------------------ */
function BentoSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner Skeleton */}
      <div className="h-28 rounded-3xl skeleton" />

      {/* Bento Grid Top Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 h-96 rounded-3xl skeleton" />
        <div className="lg:col-span-6 h-96 rounded-3xl skeleton" />
      </div>

      {/* Bento Grid Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 h-40 rounded-3xl skeleton" />
        <div className="lg:col-span-3 h-40 rounded-3xl skeleton" />
        <div className="lg:col-span-3 h-40 rounded-3xl skeleton" />
        <div className="lg:col-span-3 h-40 rounded-3xl skeleton" />
      </div>

      {/* Bento Grid Lower Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 h-80 rounded-3xl skeleton" />
        <div className="lg:col-span-4 h-80 rounded-3xl skeleton" />
        <div className="lg:col-span-3 h-80 rounded-3xl skeleton" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Overview Page Component                                       */
/* ------------------------------------------------------------------ */
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

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  // Quick Simulator Local State
  const [simSalaryChange, setSimSalaryChange] = useState<number>(10);
  const [simSleepDelta, setSimSleepDelta] = useState<number>(0.5);

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

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const res = await api.getRecommendations();
      if (res && res.recommendations) {
        setRecommendations(res.recommendations.slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
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
    fetchRecommendations();
  }, [fetchOverview, fetchPredictions, fetchRecommendations]);

  const handleDateRangeChange = (newPreset: string, start?: string, end?: string) => {
    setPreset(newPreset);
    setStartDate(start);
    setEndDate(end);
  };

  const fin = overview?.finance;
  const stu = overview?.study;
  const hab = overview?.habits;

  // Domain Scores Computation for Rings
  const financeScore = useMemo(() => {
    if (!fin) return 82;
    const rateScore = Math.min(100, Math.max(0, (fin.savings_rate || 0) * 1.8));
    const runwayScore = Math.min(100, (fin.runway_months || 1) * 30);
    return Math.round(rateScore * 0.6 + runwayScore * 0.4) || 82;
  }, [fin]);

  const studyScore = useMemo(() => {
    if (!stu) return 81;
    const avg = stu.avg_score || 80;
    const pace = Math.min(100, stu.weekly_progress_pct || 80);
    return Math.round(avg * 0.7 + pace * 0.3) || 81;
  }, [stu]);

  const habitScore = useMemo(() => {
    if (!hab) return 74;
    const sleepRatio = Math.min(1.0, (hab.avg_sleep_hours || 6.5) / 8.0) * 100;
    const streakBonus = Math.min(100, (hab.current_streak || 1) * 20);
    return Math.round(sleepRatio * 0.65 + streakBonus * 0.35) || 74;
  }, [hab]);

  const compositeIndex = useMemo(() => {
    return Math.round((financeScore + studyScore + habitScore) / 3);
  }, [financeScore, studyScore, habitScore]);

  // Quick Simulation dynamic computation
  const estimatedSavingsDelta = useMemo(() => {
    const baseMonthlyIncome = fin?.total_income || 2650;
    return (baseMonthlyIncome * (simSalaryChange / 100.0) * 6);
  }, [fin, simSalaryChange]);

  const estimatedScoreDelta = useMemo(() => {
    return simSleepDelta < 0 ? simSleepDelta * 3.8 : simSleepDelta * 2.2;
  }, [simSleepDelta]);

  if (loading && !overview) {
    return <BentoSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ------------------------------------------------------------ */}
      {/* Top Banner Toolbar with Glassmorphic Capsule                  */}
      {/* ------------------------------------------------------------ */}
      <div className="glass-panel p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Digital Twin Synthesis Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Twin Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Holistic cross-domain equilibrium tracking personal finance runway, study mastery, and physical recovery.
          </p>
        </div>

        <div className="relative z-10 w-full lg:w-auto">
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
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchOverview}
            className="px-3.5 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Bento Grid: Tier 1 (Hero 6 cols x 2 rows + Forecast 6 cols)   */}
      {/* ------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Twin Overview Hero (6 cols x 2 rows on desktop) */}
        <div className="lg:col-span-6 bento-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Life Path Equilibrium</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tri-domain composite synthesis index</p>
                </div>
              </div>

              <div className="inner-panel px-3 py-1.5 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">Index {compositeIndex}/100</span>
              </div>
            </div>

            {/* Three Domain Score Rings */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <ScoreRing
                score={financeScore}
                label="Finance"
                sublabel={`${fin?.savings_rate || 0}% Savings`}
                color="#0D9488"
              />
              <ScoreRing
                score={studyScore}
                label="Academics"
                sublabel={`${stu?.avg_score || 80}% Avg Score`}
                color="#4F46E5"
              />
              <ScoreRing
                score={habitScore}
                label="Recovery"
                sublabel={`${hab?.avg_sleep_hours || 6.8}h Sleep`}
                color="#D97706"
              />
            </div>

            {/* Telemetry Micro-Badges */}
            <div className="inner-panel p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400" />
                  Financial Runway
                </span>
                <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                  {fin?.runway_months ? `${fin.runway_months} months safety buffer` : 'Runway estimated at ~1.0 mo'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  Weekly Study Velocity
                </span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {stu?.weekly_progress_pct ? `${stu.weekly_progress_pct}% target achieved` : 'Active pace'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                  Consistency Streak
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                  {hab?.current_streak ? `${hab.current_streak} days active streak` : 'Streak logging'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-medium">Model: Ridge & Calibrated ML</span>
            <Link
              href="/simulator"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 group-hover:translate-x-0.5 transition-transform"
            >
              <span>Explore Scenarios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Finance Forecast Fan Chart (6 cols x 2 rows on desktop) */}
        <div className="lg:col-span-6 bento-card bento-finance p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="inner-panel p-4 flex-1 flex flex-col justify-between overflow-hidden">
            {loadingPredictions && !predictions ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span>Computing stochastic machine learning forecasts...</span>
              </div>
            ) : predictions?.finance ? (
              <FinanceForecastFanChart
                prediction={predictions.finance}
                currency={currency}
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                <BarChart3 className="w-8 h-8 text-slate-400" />
                <span>No forecast models loaded yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Bento Grid: Tier 2 (Four Stat Tiles, 3 cols each = 12 cols)  */}
      {/* ------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Stat Tile 1: Savings Runway (3 cols) */}
        <Link
          href="/finance"
          className="lg:col-span-3 bento-card bento-finance p-5 flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                Runway
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Estimated Runway</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
                {fin?.runway_months !== null && fin?.runway_months !== undefined ? `${fin.runway_months} mo` : '1.0 mo'}
              </span>
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                {fin?.savings_rate || 49.7}% saved
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>Threshold: 3.0 mo target</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-teal-700 dark:text-teal-400" />
          </div>
        </Link>

        {/* Stat Tile 2: Average Sleep (3 cols) */}
        <Link
          href="/habits"
          className="lg:col-span-3 bento-card bento-habit p-5 flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Moon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                Recovery
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Average Sleep</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
                {hab?.avg_sleep_hours || 6.8} hrs
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {hab?.sleep_variance ? `${hab.sleep_variance}h` : '-0.7h'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>Target: 7.5h daily</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-amber-700 dark:text-amber-400" />
          </div>
        </Link>

        {/* Stat Tile 3: Study Score Trend (3 cols) */}
        <Link
          href="/study"
          className="lg:col-span-3 bento-card bento-study p-5 flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Academics
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Study Score Trend</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
                {stu?.avg_score ? `${stu.avg_score}%` : '80.7%'}
              </span>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                {stu?.total_study_hours || 26}h logged
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>Pace: {stu?.weekly_progress_pct || 80}% on track</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-indigo-700 dark:text-indigo-400" />
          </div>
        </Link>

        {/* Stat Tile 4: Habit Streak (3 cols) */}
        <Link
          href="/habits"
          className="lg:col-span-3 bento-card bento-habit p-5 flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
                <Flame className="w-4 h-4 fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                Consistency
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Active Habit Streak</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
                {hab?.current_streak || 3} Days
              </span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {hab?.habit_completion_rate || 82}% rate
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>Vitality: ★ {hab?.avg_mood || 3.8}/5</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-rose-700 dark:text-rose-400" />
          </div>
        </Link>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Bento Grid: Tier 3 (Recommendations 5 + Sim 4 + Chat 3 = 12) */}
      {/* ------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 1. Recommendations Card (5 cols) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Active Interventions</h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">AI recommended actions</p>
                </div>
              </div>
              <Link
                href="/recommendations"
                className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {loadingRecs ? (
                <div className="p-8 text-center text-xs text-stone-500">Loading recommendations...</div>
              ) : recommendations.length > 0 ? (
                recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="inner-panel p-3.5 hover:border-indigo-400/40 transition-all flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        {rec.domain}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rec.priority === 'high'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{rec.title}</p>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {rec.explanation}
                    </p>
                  </div>
                ))
              ) : (
                <div className="inner-panel p-6 text-center text-xs text-stone-500">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 mx-auto mb-1.5" />
                  <span>All digital twin metrics within normal equilibrium bounds.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] text-right">
            <Link
              href="/plans"
              className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 flex items-center justify-end gap-1"
            >
              <span>Convert recommendations to Action Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Quick What-If Simulator Card (4 cols) */}
        <div className="lg:col-span-4 bento-card bento-study p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Quick What-If Simulator</h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">Tweak key life parameters</p>
              </div>
            </div>

            {/* Interactive Sliders */}
            <div className="space-y-4">
              <div className="inner-panel p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Salary Change</span>
                  <span className={`font-mono font-bold ${simSalaryChange >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600'}`}>
                    {simSalaryChange >= 0 ? `+${simSalaryChange}%` : `${simSalaryChange}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="60"
                  step="5"
                  value={simSalaryChange}
                  onChange={(e) => setSimSalaryChange(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                  <span>-30%</span>
                  <span>Baseline</span>
                  <span>+60%</span>
                </div>
              </div>

              <div className="inner-panel p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Sleep Target Delta</span>
                  <span className={`font-mono font-bold ${simSleepDelta >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-amber-600'}`}>
                    {simSleepDelta >= 0 ? `+${simSleepDelta}h` : `${simSleepDelta}h`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="1.5"
                  step="0.5"
                  value={simSleepDelta}
                  onChange={(e) => setSimSleepDelta(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                  <span>-2.0h</span>
                  <span>Current</span>
                  <span>+1.5h</span>
                </div>
              </div>

              {/* Live Preview Readout */}
              <div className="inner-panel p-3.5 bg-gradient-to-br from-indigo-500/5 via-transparent to-teal-500/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase block font-bold">Estimated 6M Savings Impact</span>
                  <span className={`text-base font-extrabold font-mono ${estimatedSavingsDelta >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600'}`}>
                    {estimatedSavingsDelta >= 0 ? '+' : ''}{currency} {estimatedSavingsDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-500 uppercase block font-bold">Score Shift</span>
                  <span className={`text-sm font-extrabold font-mono ${estimatedScoreDelta >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600'}`}>
                    {estimatedScoreDelta >= 0 ? `+${estimatedScoreDelta.toFixed(1)}%` : `${estimatedScoreDelta.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721]">
            <Link
              href="/simulator"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-bold shadow-sm transition"
            >
              <span>Launch Full Monte Carlo Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Ask Twin Bot Chat Teaser (3 cols) */}
        <div className="lg:col-span-3 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 shadow-md flex-shrink-0">
                <Sparkles className="w-5 h-5 text-teal-400 dark:text-teal-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Ask Twin Bot</h3>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 animate-pulse" />
                  <span>Online • Multi-model</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-4">
              Ask natural-language questions about your financial projections, exam performance, or habits.
            </p>

            {/* Quick Prompt Chips */}
            <div className="space-y-2">
              <Link
                href="/chat"
                className="block inner-panel p-2.5 text-xs text-stone-700 dark:text-stone-300 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-400/40 transition group"
              >
                <span className="text-[11px] block text-stone-400 font-mono">Prompt</span>
                <span className="font-semibold text-xs">"Predict my savings balance for next month."</span>
              </Link>

              <Link
                href="/chat"
                className="block inner-panel p-2.5 text-xs text-stone-700 dark:text-stone-300 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-400/40 transition group"
              >
                <span className="text-[11px] block text-stone-400 font-mono">Prompt</span>
                <span className="font-semibold text-xs">"What is my risk of burnout over the next month?"</span>
              </Link>

              <Link
                href="/chat"
                className="block inner-panel p-2.5 text-xs text-stone-700 dark:text-stone-300 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-400/40 transition group"
              >
                <span className="text-[11px] block text-stone-400 font-mono">Prompt</span>
                <span className="font-semibold text-xs">"Simulate spending $1200 on a laptop."</span>
              </Link>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721]">
            <Link
              href="/chat"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white text-xs font-bold shadow-sm transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start Conversation</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
