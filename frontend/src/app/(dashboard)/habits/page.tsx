'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { HabitLog, HabitAnalytics, HabitPredictionResponse } from '@/lib/types';
import HabitStreakAndMoodChart from '@/components/charts/HabitStreakAndMoodChart';
import HabitBurnoutRiskGauge from '@/components/charts/HabitBurnoutRiskGauge';
import {
  Activity,
  Plus,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Dumbbell,
  Smile,
  Loader2,
  AlertCircle,
  Flame,
  BarChart3,
  HeartPulse,
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
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [habitFilter, setHabitFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newHabit, setNewHabit] = useState(COMMON_HABITS[0]);
  const [newDone, setNewDone] = useState(true);
  const [newSleep, setNewSleep] = useState('7.5');
  const [newExercise, setNewExercise] = useState('30');
  const [newMood, setNewMood] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editHabit, setEditHabit] = useState('');
  const [editDone, setEditDone] = useState(true);
  const [editSleep, setEditSleep] = useState('');
  const [editExercise, setEditExercise] = useState('');
  const [editMood, setEditMood] = useState(3);
  const [savingEdit, setSavingEdit] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<HabitAnalytics | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  // Prediction state
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
      const data = await api.getHabitsAnalytics({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load habits analytics:', err);
    }
  }, [startDate, endDate]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getHabitLogs({
        page,
        page_size: pageSize,
        habit: habitFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      console.error('Failed to load habit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, habitFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
    fetchAnalytics();
    fetchPrediction();
  }, [fetchLogs, fetchAnalytics, fetchPrediction]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const slp = parseFloat(newSleep);
    const exr = parseInt(newExercise, 10);

    if (isNaN(slp) || slp < 0 || slp > 24) {
      setFormError('Sleep hours must be between 0 and 24.');
      return;
    }
    if (isNaN(exr) || exr < 0 || exr > 1440) {
      setFormError('Exercise minutes must be between 0 and 1440.');
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
      setShowForm(false);
      setPage(1);
      await fetchLogs();
      await fetchAnalytics();
      fetchPrediction();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record habit log.');
    } finally {
      setSubmitting(false);
    }
  };

  const startInlineEdit = (log: HabitLog) => {
    setEditingId(log.id);
    setEditDate(log.date);
    setEditHabit(log.habit);
    setEditDone(log.done);
    setEditSleep(log.sleep_hours.toString());
    setEditExercise(log.exercise_minutes.toString());
    setEditMood(log.mood);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  const saveInlineEdit = async (id: string) => {
    const slp = parseFloat(editSleep);
    const exr = parseInt(editExercise, 10);

    if (isNaN(slp) || slp < 0 || slp > 24) {
      alert('Sleep hours must be between 0 and 24.');
      return;
    }
    if (isNaN(exr) || exr < 0 || exr > 1440) {
      alert('Exercise minutes must be between 0 and 1440.');
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateHabitLog(id, {
        date: editDate,
        habit: editHabit,
        done: editDone,
        sleep_hours: slp,
        exercise_minutes: exr,
        mood: editMood,
      });
      setEditingId(null);
      await fetchLogs();
      await fetchAnalytics();
      fetchPrediction();
    } catch (err: any) {
      alert(err.message || 'Failed to update habit log');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this habit log?')) return;
    try {
      await api.deleteHabitLog(id);
      await fetchLogs();
      await fetchAnalytics();
      fetchPrediction();
    } catch (err: any) {
      alert(err.message || 'Failed to delete habit log');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bento-card bento-habits p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            Wellbeing & Habit Architecture
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Habit Logs & Recovery</h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Track daily sleep duration, fitness consistency, and mental resilience scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3.5 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showCharts ? 'Hide Visuals' : 'Show Visuals'}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'Cancel' : 'Log Habit & Wellbeing'}</span>
          </button>
        </div>
      </div>

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
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Recovery & Vitality Trajectory</h3>
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
            <div className="mt-6 bento-card bento-habits p-6">
              <HabitBurnoutRiskGauge prediction={prediction} />
            </div>
          )}
        </div>
      )}

      {/* Entry Form */}
      {showForm && (
        <form onSubmit={handleCreateLog} className="bento-card bento-habits p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Record Daily Wellbeing Check-in</h2>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">Burnout Resilience Input</span>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Habit / Routine</label>
              <input
                type="text"
                list="habits-list"
                required
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <datalist id="habits-list">
                {COMMON_HABITS.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Sleep Hours (Night)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  required
                  value={newSleep}
                  onChange={(e) => setNewSleep(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
                <Moon className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Physical Activity (Minutes)</label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="1440"
                  required
                  value={newExercise}
                  onChange={(e) => setNewExercise(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
                <Dumbbell className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">Subjective Mood & Vitality (1-5)</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setNewMood(level)}
                    className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${
                      newMood === level
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-sm'
                        : 'bg-[#FAF7F0] dark:bg-[#181614] border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300 hover:border-amber-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                Selected: <strong className="text-stone-900 dark:text-stone-100">{MOOD_LABELS[newMood]?.text}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newDone}
                  onChange={(e) => setNewDone(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-[#FAF7F0] dark:bg-[#181614] border-[#E6DFD3] dark:border-[#2D2721]"
                />
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Mark routine completed successfully today
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Log</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="bento-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Filter:</span>
          </div>

          <input
            type="text"
            placeholder="Search habit name..."
            value={habitFilter}
            onChange={(e) => {
              setHabitFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none"
          />

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 outline-none"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>
        </div>

        <div className="text-stone-500 dark:text-stone-400 font-mono">
          Total: <span className="text-stone-900 dark:text-stone-100 font-semibold">{total}</span> logs
        </div>
      </div>

      {/* Data Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4EFE6] dark:bg-[#151311] text-stone-600 dark:text-stone-400 border-b border-[#E6DFD3] dark:border-[#2D2721] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Habit / Routine</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Sleep</th>
                <th className="py-3 px-4 text-center">Exercise</th>
                <th className="py-3 px-4 text-center">Mood</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD3] dark:divide-[#2D2721]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                      <span>Loading habit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <p className="text-sm">No habit logs found.</p>
                    <p className="text-xs mt-1 text-stone-400">Click &ldquo;Log Habit &amp; Wellbeing&rdquo; above to record your first routine entry.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isEditing = editingId === log.id;

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-[#FAF7F0] dark:hover:bg-[#201D1A] transition ${
                        isEditing ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-stone-700 dark:text-stone-300">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-amber-500 rounded text-xs text-stone-900 dark:text-stone-100"
                          />
                        ) : (
                          log.date
                        )}
                      </td>

                      {/* Habit Name */}
                      <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editHabit}
                            onChange={(e) => setEditHabit(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-amber-500 rounded text-xs text-stone-900 dark:text-stone-100 w-40"
                          />
                        ) : (
                          log.habit
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editDone}
                            onChange={(e) => setEditDone(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              log.done
                                ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30'
                                : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-[#E6DFD3] dark:border-[#2D2721]'
                            }`}
                          >
                            {log.done ? 'Done' : 'Skipped'}
                          </span>
                        )}
                      </td>

                      {/* Sleep */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editSleep}
                            onChange={(e) => setEditSleep(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-amber-500 rounded text-xs text-stone-900 dark:text-stone-100 w-16 text-center"
                          />
                        ) : (
                          <span className={log.sleep_hours < 6.5 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-stone-700 dark:text-stone-300'}>
                            {log.sleep_hours}h
                          </span>
                        )}
                      </td>

                      {/* Exercise */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="5"
                            value={editExercise}
                            onChange={(e) => setEditExercise(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-amber-500 rounded text-xs text-stone-900 dark:text-stone-100 w-16 text-center"
                          />
                        ) : (
                          <span className={log.exercise_minutes >= 30 ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-stone-600 dark:text-stone-400'}>
                            {log.exercise_minutes}m
                          </span>
                        )}
                      </td>

                      {/* Mood */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editMood}
                            onChange={(e) => setEditMood(Number(e.target.value))}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-amber-500 rounded text-xs text-stone-900 dark:text-stone-100"
                          >
                            {[1, 2, 3, 4, 5].map((m) => (
                              <option key={m} value={m}>
                                {m} - {MOOD_LABELS[m]?.text}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              MOOD_LABELS[log.mood]?.color || ''
                            }`}
                          >
                            {MOOD_LABELS[log.mood]?.text || `Mood ${log.mood}`}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveInlineEdit(log.id)}
                              disabled={savingEdit}
                              title="Save Changes"
                              className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              title="Cancel"
                              className="p-1 rounded bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startInlineEdit(log)}
                              title="Edit Row"
                              className="text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              title="Delete Row"
                              className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[#F4EFE6] dark:bg-[#151311] border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
          <div>
            Page <span className="font-semibold text-stone-900 dark:text-stone-100">{page}</span> of{' '}
            <span className="font-semibold text-stone-900 dark:text-stone-100">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
