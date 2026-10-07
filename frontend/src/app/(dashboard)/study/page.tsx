'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StudyAnalytics, StudyPredictionResponse } from '@/lib/types';
import StudyTrendChart from '@/components/charts/StudyTrendChart';
import SubjectBreakdownBar from '@/components/charts/SubjectBreakdownBar';
import StudyScorePredictionCard from '@/components/charts/StudyScorePredictionCard';
import Toast from '@/components/ui/Toast';
import CollapsibleEntryPanel from '@/components/ui/CollapsibleEntryPanel';
import {
  GraduationCap,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  BarChart3,
  Check,
  Award,
} from 'lucide-react';

const COMMON_SUBJECTS = [
  'Computer Science',
  'Mathematics',
  'Machine Learning',
  'System Architecture',
  'Data Structures & Algorithms',
  'Economics',
  'Neuroanatomy',
  'Physics',
  'General Reading',
];

export default function StudyPage() {
  // Quick-Add Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSubject, setNewSubject] = useState(COMMON_SUBJECTS[0]);
  const [newHours, setNewHours] = useState('2.0');
  const [newScore, setNewScore] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Analytics & Visuals State
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  // Prediction state
  const [prediction, setPrediction] = useState<StudyPredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  const fetchPrediction = useCallback(async () => {
    setLoadingPrediction(true);
    try {
      const data = await api.getStudyPredictions();
      setPrediction(data);
    } catch (err) {
      console.error('Failed to load study predictions:', err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.getStudyAnalytics({});
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load study analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchPrediction();
  }, [fetchAnalytics, fetchPrediction]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const h = parseFloat(newHours);
    if (isNaN(h) || h <= 0) {
      setFormError('Please enter valid study hours greater than 0.');
      return;
    }

    const sc = newScore ? parseFloat(newScore) : undefined;
    if (sc !== undefined && (isNaN(sc) || sc < 0 || sc > 100)) {
      setFormError('Assessment score must be between 0 and 100.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createStudySession({
        date: newDate,
        subject: newSubject,
        hours: h,
        score: sc,
        notes: newNotes,
      });

      setToastMessage('Study session recorded successfully!');
      setToastType('success');

      // Collapse entry panel
      setIsAddOpen(false);

      // Refresh KPIs and charts
      await fetchAnalytics();
      fetchPrediction();

      // Reset form
      setNewHours('2.0');
      setNewScore('');
      setNewNotes('');

      // Focus first field
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setFormError(err.message || 'Failed to record session.');
      setToastMessage(err.message || 'Failed to record session.');
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Academic Mastery & Focus
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Study Analytics & Retention</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Learning velocity tracking with Ridge ML score forecasting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
            <span>{showCharts ? 'Hide Visuals' : 'Show Visuals'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add study session</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Collapsible Entry Form Panel (Hidden by default, expands)    */}
      {/* ------------------------------------------------------------ */}
      <CollapsibleEntryPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Quick-Add Study Session"
        badge="1-click academic log"
        colorScheme="indigo"
      >
        <form onSubmit={handleCreateSession} className="space-y-2">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Desktop: One Row (grid-cols-6) | Mobile: Stacked */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-center">
            {/* 1. Date */}
            <div>
              <input
                ref={firstFieldRef}
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 2. Subject */}
            <div>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {COMMON_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Duration Hours */}
            <div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="2.0 hrs"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Score % */}
            <div>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Score % (optional)"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 5. Notes */}
            <div>
              <input
                type="text"
                placeholder="Topic / Notes (opt)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 6. Submit Button */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Log Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </CollapsibleEntryPanel>

      {/* Analytics Bento KPI Cards */}
      {analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bento-card bento-study p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Weekly Progress</span>
              <span className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-400 mt-1 block">
                {analytics.weekly_progress_pct}% Target
              </span>
            </div>
            <div className="bento-card bento-study p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Average Score</span>
              <span className="text-xl font-black font-mono text-stone-900 dark:text-stone-100 mt-1 block">
                {analytics.avg_score}%
              </span>
            </div>
            <div className="bento-card p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Total Hours Logged</span>
              <span className="text-xl font-black font-mono text-stone-900 dark:text-stone-100 mt-1 block">
                {analytics.total_study_hours} hrs
              </span>
            </div>
            <div className="bento-card p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Weekly Progress</span>
              <span className="text-xl font-black font-mono text-stone-900 dark:text-stone-100 mt-1 block">
                {Math.round(analytics.weekly_progress_pct)}%
              </span>
            </div>
          </div>

          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">Study Trend & Daily Volume</h3>
                  </div>
                </div>
                <StudyTrendChart data={analytics.study_trend} />
              </div>

              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">Subject Breakdown & Performance</h3>
                  </div>
                </div>
                <SubjectBreakdownBar data={analytics.subject_breakdown} />
              </div>
            </div>
          )}

          {/* Machine Learning Prediction Bento Card */}
          {prediction && (
            <div className="bento-card bento-study p-6">
              <StudyScorePredictionCard prediction={prediction} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
