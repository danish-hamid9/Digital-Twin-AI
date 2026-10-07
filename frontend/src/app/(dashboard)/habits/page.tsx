'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { HabitAnalytics, HabitPredictionResponse } from '@/lib/types';
import HabitStreakAndMoodChart from '@/components/charts/HabitStreakAndMoodChart';
import HabitBurnoutRiskGauge from '@/components/charts/HabitBurnoutRiskGauge';
import Toast from '@/components/ui/Toast';
import CollapsibleEntryPanel from '@/components/ui/CollapsibleEntryPanel';
import { useAuth } from '@/lib/authContext';
import {
  Activity,
  Plus,
  Moon,
  Dumbbell,
  Loader2,
  AlertCircle,
  Flame,
  BarChart3,
  ArrowRight,
  Check,
} from 'lucide-react';

const COMMON_HABITS = [
  'Daily Fitness & Sleep',
  'Morning Meditation',
  'Cardio / Running',
  'Strength Training',
  'Deep Reading',
  'Digital Detox (Evening)',
  'Hydration Routine'
];

const MOOD_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Exhausted', color: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20' },
  2: { text: 'Low Energy', color: 'text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/20' },
  3: { text: 'Neutral', color: 'text-stone-700 dark:text-stone-300 bg-stone-500/10 border-stone-500/20' },
  4: { text: 'Good Focus', color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  5: { text: 'Peak Vitality', color: 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/20' },
};

export default function HabitsPage() {
  const { profile } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Form state
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newHabit, setNewHabit] = useState(COMMON_HABITS[0]);
  const [newDone, setNewDone] = useState(true);
  const [newSleep, setNewSleep] = useState(String(profile?.target_sleep_hours || 7.5));
  const [newExercise, setNewExercise] = useState('30');
  const [newMood, setNewMood] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Analytics & Prediction state
  const [analytics, setAnalytics] = useState<HabitAnalytics | null>(null);
  const [showCharts, setShowCharts] = useState(true);
  const [prediction, setPrediction] = useState<HabitPredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  const fetchPrediction = useCallback(async (horizonDays = 7) => {
    setLoadingPrediction(true);
    try {
      const data = await api.getHabitPredictions(horizonDays);
      setPrediction(data);
    } catch (err) {
      console.error('Failed to load habit predictions:', err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.getHabitsAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load habits analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchPrediction();
  }, [fetchAnalytics, fetchPrediction]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const slp = parseFloat(newSleep);
    const exr = parseInt(newExercise, 10);

    if (isNaN(slp) || slp < 0 || slp > 24) {
      setFormError('Sleep hours must be between 0 and 24.');
      setToastMessage('Sleep hours must be between 0 and 24.');
      setToastType('error');
      return;
    }
    if (isNaN(exr) || exr < 0 || exr > 1440) {
      setFormError('Exercise minutes must be between 0 and 1440.');
      setToastMessage('Exercise minutes must be between 0 and 1440.');
      setToastType('error');
      return;
    }

    setSubmitting(true);
    try {
      await api.createHabitLog({
        date: newDate,
        habit: newHabit,
        done: newDone,
        sleep_hours: slp,
        exercise_minutes: exr,
        mood: newMood,
      });

      // Toast notification
      setToastMessage('Habit log recorded successfully!');
      setToastType('success');

      // Collapse entry panel
      setIsAddOpen(false);

      // Refresh KPIs and charts
      await fetchAnalytics();
      fetchPrediction();

      // Reset form
      setNewHabit(COMMON_HABITS[0]);
      setNewDone(true);
      setNewExercise('30');
      setNewMood(4);

      // Focus first field
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 50);
    } catch (err: any) {
      const msg = err.message || 'Failed to record habit log.';
      setFormError(msg);
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            Wellbeing &amp; Habit Architecture
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Habit Logs &amp; Recovery</h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Track daily sleep duration, fitness consistency, and mental resilience scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3.5 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showCharts ? 'Hide Visuals' : 'Show Visuals'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add habit log</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Collapsible Entry Form Panel (Hidden by default, expands)    */}
      {/* ------------------------------------------------------------ */}
      <CollapsibleEntryPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Quick-Add Daily Wellbeing Entry"
        badge="One-line daily check-in"
        colorScheme="amber"
      >
        {formError && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateLog} className="space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3">
            {/* Date */}
            <div className="w-full lg:w-36 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Date
              </label>
              <input
                ref={firstFieldRef}
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Habit name */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Routine / Habit
              </label>
              <input
                type="text"
                list="quick-habits-list"
                required
                placeholder="e.g. Daily Fitness & Sleep"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <datalist id="quick-habits-list">
                {COMMON_HABITS.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>

            {/* Sleep hours */}
            <div className="w-full lg:w-28 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Sleep (hrs)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  required
                  value={newSleep}
                  onChange={(e) => setNewSleep(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
                <Moon className="w-3 h-3 text-indigo-500 absolute left-2 top-2.5" />
              </div>
            </div>

            {/* Exercise minutes */}
            <div className="w-full lg:w-28 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Exercise (min)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="1440"
                  required
                  value={newExercise}
                  onChange={(e) => setNewExercise(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
                <Dumbbell className="w-3 h-3 text-teal-600 dark:text-teal-400 absolute left-2 top-2.5" />
              </div>
            </div>

            {/* Mood select */}
            <div className="w-full lg:w-36 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Mood ({newMood}/5)
              </label>
              <select
                value={newMood}
                onChange={(e) => setNewMood(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level} - {MOOD_LABELS[level]?.text}
                  </option>
                ))}
              </select>
            </div>

            {/* Completed Checkbox */}
            <div className="w-full lg:w-auto flex items-center self-center lg:self-end pb-1.5 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newDone}
                  onChange={(e) => setNewDone(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-white dark:bg-[#181614] border-[#E6DFD3] dark:border-[#2D2721]"
                />
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap">
                  Done
                </span>
              </label>
            </div>

            {/* Submit button */}
            <div className="w-full lg:w-auto flex-shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="w-full lg:w-auto px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 h-[34px]"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span className="whitespace-nowrap">Save Habit</span>
              </button>
            </div>
          </div>
        </form>
      </CollapsibleEntryPanel>

      {/* Habits Analytics & KPI Cards */}
      {analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bento-card bento-habits p-4">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-medium">Average Sleep</span>
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">
                {analytics.avg_sleep_hours} hrs
              </span>
            </div>
            <div className="bento-card bento-habits p-4">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-medium">Vitality Mood</span>
              <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1 block">
                ★ {analytics.avg_mood} / 5
              </span>
            </div>
            <div className="bento-card bento-habits p-4">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-medium">Current Streak</span>
              <span className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>{analytics.current_streak} days</span>
              </span>
            </div>
            <div className="bento-card bento-habits p-4">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-medium">Habit Completion</span>
              <span className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-1 block">
                {analytics.habit_completion_rate}%
              </span>
            </div>
          </div>

          {showCharts && (
            <div className="bento-card bento-habits p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Recovery &amp; Vitality Trajectory</h3>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">Sleep duration vs subjective mood correlation</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-[#FAF7F0] dark:bg-[#181614] px-2.5 py-1 rounded-lg border border-[#E6DFD3] dark:border-[#2D2721]">
                  {analytics.logs_count} logs
                </span>
              </div>
              <HabitStreakAndMoodChart
                trendData={analytics.habits_trend}
                sleepBuckets={analytics.sleep_buckets}
                targetSleep={analytics.target_sleep_hours}
              />
            </div>
          )}

          {/* Machine Learning Streak & Burnout Risk Forecast */}
          {prediction && (
            <div className="bento-card bento-habits p-6">
              <HabitBurnoutRiskGauge prediction={prediction} />
            </div>
          )}
        </div>
      )}

      {/* History Redirect Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-stone-600 dark:text-stone-400 text-center sm:text-left">
          Need to review or manage previous habit logs? All historical logs, streak statistics, and inline edits are in the History hub.
        </div>
        <Link
          href="/history?tab=habits"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 whitespace-nowrap"
        >
          <span>View full history</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
