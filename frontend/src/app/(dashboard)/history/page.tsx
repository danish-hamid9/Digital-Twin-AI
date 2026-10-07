'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import {
  FinanceEntry,
  StudySession,
  HabitLog,
  LoginEvent,
} from '@/lib/types';
import {
  History,
  Wallet,
  GraduationCap,
  Activity,
  ShieldCheck,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  Laptop,
  Globe,
  Lock,
  Sparkles,
} from 'lucide-react';

const COMMON_FINANCE_CATEGORIES = [
  'Housing/Rent',
  'Groceries',
  'Dining Out',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Salary',
  'Miscellaneous',
];

const COMMON_STUDY_SUBJECTS = [
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

const COMMON_HABITS = [
  'Daily Fitness & Sleep',
  'Morning Meditation',
  'Cardio / Running',
  'Strength Training',
  'Deep Reading',
  'Digital Detox (Evening)',
  'Hydration Routine',
];

const MOOD_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Exhausted', color: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20' },
  2: { text: 'Low Energy', color: 'text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/20' },
  3: { text: 'Neutral', color: 'text-stone-700 dark:text-stone-300 bg-stone-500/10 border-stone-500/20' },
  4: { text: 'Good Focus', color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  5: { text: 'Peak Vitality', color: 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/20' },
};

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const currency = profile?.currency || 'USD';

  // Read active tab from URL query param (defaults to 'finance')
  const activeTab = searchParams.get('tab') || 'finance';

  const handleTabChange = (newTab: string) => {
    router.push(`/history?tab=${newTab}`);
  };

  // -------------------------------------------------------------
  // Tab 1: Finance History State
  // -------------------------------------------------------------
  const [finEntries, setFinEntries] = useState<FinanceEntry[]>([]);
  const [finLoading, setFinLoading] = useState(false);
  const [finPage, setFinPage] = useState(1);
  const [finTotal, setFinTotal] = useState(0);
  const [finTotalPages, setFinTotalPages] = useState(1);
  const [finTypeFilter, setFinTypeFilter] = useState('');
  const [finCategoryFilter, setFinCategoryFilter] = useState('');
  const [finStartDate, setFinStartDate] = useState('');
  const [finEndDate, setFinEndDate] = useState('');
  // Inline edit
  const [finEditingId, setFinEditingId] = useState<string | null>(null);
  const [finEditDate, setFinEditDate] = useState('');
  const [finEditType, setFinEditType] = useState<'income' | 'expense'>('expense');
  const [finEditCategory, setFinEditCategory] = useState('');
  const [finEditAmount, setFinEditAmount] = useState('');
  const [finEditDescription, setFinEditDescription] = useState('');
  const [finSavingEdit, setFinSavingEdit] = useState(false);

  const fetchFinanceHistory = useCallback(async () => {
    setFinLoading(true);
    try {
      const res = await api.getFinanceEntries({
        page: finPage,
        page_size: 10,
        type: finTypeFilter || undefined,
        category: finCategoryFilter || undefined,
        start_date: finStartDate || undefined,
        end_date: finEndDate || undefined,
      });
      setFinEntries(res.items);
      setFinTotal(res.total);
      setFinTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load finance history:', err);
    } finally {
      setFinLoading(false);
    }
  }, [finPage, finTypeFilter, finCategoryFilter, finStartDate, finEndDate]);

  // -------------------------------------------------------------
  // Tab 2: Study History State
  // -------------------------------------------------------------
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyPage, setStudyPage] = useState(1);
  const [studyTotal, setStudyTotal] = useState(0);
  const [studyTotalPages, setStudyTotalPages] = useState(1);
  const [studySubjectFilter, setStudySubjectFilter] = useState('');
  const [studyStartDate, setStudyStartDate] = useState('');
  const [studyEndDate, setStudyEndDate] = useState('');
  // Inline edit
  const [studyEditingId, setStudyEditingId] = useState<string | null>(null);
  const [studyEditDate, setStudyEditDate] = useState('');
  const [studyEditSubject, setStudyEditSubject] = useState('');
  const [studyEditHours, setStudyEditHours] = useState('');
  const [studyEditScore, setStudyEditScore] = useState('');
  const [studyEditNotes, setStudyEditNotes] = useState('');
  const [studySavingEdit, setStudySavingEdit] = useState(false);

  const fetchStudyHistory = useCallback(async () => {
    setStudyLoading(true);
    try {
      const res = await api.getStudySessions({
        page: studyPage,
        page_size: 10,
        subject: studySubjectFilter || undefined,
        start_date: studyStartDate || undefined,
        end_date: studyEndDate || undefined,
      });
      setStudySessions(res.items);
      setStudyTotal(res.total);
      setStudyTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load study history:', err);
    } finally {
      setStudyLoading(false);
    }
  }, [studyPage, studySubjectFilter, studyStartDate, studyEndDate]);

  // -------------------------------------------------------------
  // Tab 3: Habits History State
  // -------------------------------------------------------------
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [habitLoading, setHabitLoading] = useState(false);
  const [habitPage, setHabitPage] = useState(1);
  const [habitTotal, setHabitTotal] = useState(0);
  const [habitTotalPages, setHabitTotalPages] = useState(1);
  const [habitFilter, setHabitFilter] = useState('');
  const [habitStartDate, setHabitStartDate] = useState('');
  const [habitEndDate, setHabitEndDate] = useState('');
  // Inline edit
  const [habitEditingId, setHabitEditingId] = useState<string | null>(null);
  const [habitEditDate, setHabitEditDate] = useState('');
  const [habitEditHabit, setHabitEditHabit] = useState('');
  const [habitEditDone, setHabitEditDone] = useState(true);
  const [habitEditSleep, setHabitEditSleep] = useState('');
  const [habitEditExercise, setHabitEditExercise] = useState('');
  const [habitEditMood, setHabitEditMood] = useState(3);
  const [habitSavingEdit, setHabitSavingEdit] = useState(false);

  const fetchHabitHistory = useCallback(async () => {
    setHabitLoading(true);
    try {
      const res = await api.getHabitLogs({
        page: habitPage,
        page_size: 10,
        habit: habitFilter || undefined,
        start_date: habitStartDate || undefined,
        end_date: habitEndDate || undefined,
      });
      setHabitLogs(res.items);
      setHabitTotal(res.total);
      setHabitTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load habits history:', err);
    } finally {
      setHabitLoading(false);
    }
  }, [habitPage, habitFilter, habitStartDate, habitEndDate]);

  // -------------------------------------------------------------
  // Tab 4: Login History State
  // -------------------------------------------------------------
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);

  const fetchLoginHistory = useCallback(async () => {
    setLoginLoading(true);
    try {
      const data = await api.getLoginHistory();
      setLoginEvents(data);
    } catch (err) {
      console.error('Failed to load login history:', err);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  // Fetch data on active tab mount / filter changes
  useEffect(() => {
    if (activeTab === 'finance') {
      fetchFinanceHistory();
    } else if (activeTab === 'study') {
      fetchStudyHistory();
    } else if (activeTab === 'habits') {
      fetchHabitHistory();
    } else if (activeTab === 'logins') {
      fetchLoginHistory();
    }
  }, [activeTab, fetchFinanceHistory, fetchStudyHistory, fetchHabitHistory, fetchLoginHistory]);

  // -------------------------------------------------------------
  // Action Handlers: Finance
  // -------------------------------------------------------------
  const handleSaveFinEdit = async (id: string) => {
    const amt = parseFloat(finEditAmount);
    if (isNaN(amt) || amt <= 0) return;
    setFinSavingEdit(true);
    try {
      await api.updateFinanceEntry(id, {
        date: finEditDate,
        type: finEditType,
        category: finEditCategory,
        amount: amt,
        description: finEditDescription,
      });
      setFinEditingId(null);
      await fetchFinanceHistory();
    } catch (err) {
      console.error('Failed to update finance entry:', err);
    } finally {
      setFinSavingEdit(false);
    }
  };

  const handleDeleteFinEntry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this financial record?')) return;
    try {
      await api.deleteFinanceEntry(id);
      await fetchFinanceHistory();
    } catch (err) {
      console.error('Failed to delete finance entry:', err);
    }
  };

  // -------------------------------------------------------------
  // Action Handlers: Study
  // -------------------------------------------------------------
  const handleSaveStudyEdit = async (id: string) => {
    const h = parseFloat(studyEditHours);
    if (isNaN(h) || h <= 0) return;
    const sc = studyEditScore !== '' ? parseFloat(studyEditScore) : undefined;
    setStudySavingEdit(true);
    try {
      await api.updateStudySession(id, {
        date: studyEditDate,
        subject: studyEditSubject,
        hours: h,
        score: sc,
        notes: studyEditNotes,
      });
      setStudyEditingId(null);
      await fetchStudyHistory();
    } catch (err) {
      console.error('Failed to update study session:', err);
    } finally {
      setStudySavingEdit(false);
    }
  };

  const handleDeleteStudySession = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study session?')) return;
    try {
      await api.deleteStudySession(id);
      await fetchStudyHistory();
    } catch (err) {
      console.error('Failed to delete study session:', err);
    }
  };

  // -------------------------------------------------------------
  // Action Handlers: Habits
  // -------------------------------------------------------------
  const handleSaveHabitEdit = async (id: string) => {
    const sleep = habitEditSleep !== '' ? parseFloat(habitEditSleep) : undefined;
    const ex = habitEditExercise !== '' ? parseInt(habitEditExercise, 10) : undefined;
    setHabitSavingEdit(true);
    try {
      await api.updateHabitLog(id, {
        date: habitEditDate,
        habit: habitEditHabit,
        done: habitEditDone,
        sleep_hours: sleep,
        exercise_minutes: ex,
        mood: habitEditMood,
      });
      setHabitEditingId(null);
      await fetchHabitHistory();
    } catch (err) {
      console.error('Failed to update habit log:', err);
    } finally {
      setHabitSavingEdit(false);
    }
  };

  const handleDeleteHabitLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this habit log?')) return;
    try {
      await api.deleteHabitLog(id);
      await fetchHabitHistory();
    } catch (err) {
      console.error('Failed to delete habit log:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ------------------------------------------------------------ */}
      {/* Page Header                                                  */}
      {/* ------------------------------------------------------------ */}
      <div className="glass-panel p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Audit & Activity Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            Historical Records
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl">
            Complete time-series data across finance, study, habits, and security logins with filtering and inline edits.
          </p>
        </div>

        {/* Tab Navigation Segmented Control */}
        <div className="flex bg-stone-100 dark:bg-stone-800/90 p-1 rounded-2xl border border-stone-200 dark:border-stone-700/80 text-xs self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => handleTabChange('finance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap ${
              activeTab === 'finance'
                ? 'bg-teal-600 text-white shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Finance</span>
          </button>
          <button
            onClick={() => handleTabChange('study')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap ${
              activeTab === 'study'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Study</span>
          </button>
          <button
            onClick={() => handleTabChange('habits')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap ${
              activeTab === 'habits'
                ? 'bg-amber-600 text-white shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Habits</span>
          </button>
          <button
            onClick={() => handleTabChange('logins')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap ${
              activeTab === 'logins'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Login history</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* TAB 1: FINANCE HISTORY                                       */}
      {/* ------------------------------------------------------------ */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <select
                value={finTypeFilter}
                onChange={(e) => {
                  setFinTypeFilter(e.target.value);
                  setFinPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <select
                value={finCategoryFilter}
                onChange={(e) => {
                  setFinCategoryFilter(e.target.value);
                  setFinPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">All Categories</option>
                {COMMON_FINANCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={finStartDate}
                  onChange={(e) => {
                    setFinStartDate(e.target.value);
                    setFinPage(1);
                  }}
                  className="px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-stone-400">to</span>
                <input
                  type="date"
                  value={finEndDate}
                  onChange={(e) => {
                    setFinEndDate(e.target.value);
                    setFinPage(1);
                  }}
                  className="px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>

              {(finTypeFilter || finCategoryFilter || finStartDate || finEndDate) && (
                <button
                  onClick={() => {
                    setFinTypeFilter('');
                    setFinCategoryFilter('');
                    setFinStartDate('');
                    setFinEndDate('');
                    setFinPage(1);
                  }}
                  className="px-2.5 py-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <span className="text-stone-500 font-medium">
              Showing {finEntries.length} of {finTotal} records
            </span>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-hidden border rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/70 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-right">Amount ({currency})</th>
                    <th className="p-3.5 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {finLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                        Loading financial history...
                      </td>
                    </tr>
                  ) : finEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">
                        No financial entries found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    finEntries.map((entry) => {
                      const isEditing = finEditingId === entry.id;
                      if (isEditing) {
                        return (
                          <tr key={entry.id} className="bg-teal-50/50 dark:bg-teal-950/20">
                            <td className="p-2">
                              <input
                                type="date"
                                value={finEditDate}
                                onChange={(e) => setFinEditDate(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-stone-900 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={finEditType}
                                onChange={(e) => setFinEditType(e.target.value as any)}
                                className="w-full p-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-stone-900 text-xs"
                              >
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                value={finEditCategory}
                                onChange={(e) => setFinEditCategory(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-stone-900 text-xs"
                              >
                                {COMMON_FINANCE_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={finEditDescription}
                                onChange={(e) => setFinEditDescription(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-stone-900 text-xs"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={finEditAmount}
                                onChange={(e) => setFinEditAmount(e.target.value)}
                                className="w-24 p-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-stone-900 text-xs text-right font-mono"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveFinEdit(entry.id)}
                                  disabled={finSavingEdit}
                                  className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
                                  title="Save Changes"
                                >
                                  {finSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => setFinEditingId(null)}
                                  className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 transition"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const isIncome = entry.type === 'income';
                      return (
                        <tr key={entry.id} className="hover:bg-stone-50 dark:hover:bg-stone-850/50 transition">
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">{entry.date}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isIncome
                                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                              }`}
                            >
                              {entry.type}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-stone-900 dark:text-stone-100">{entry.category}</td>
                          <td className="p-3.5 text-stone-600 dark:text-stone-400 max-w-xs truncate">
                            {entry.description || '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold">
                            <span className={isIncome ? 'text-teal-600 dark:text-teal-400' : 'text-stone-900 dark:text-stone-100'}>
                              {isIncome ? '+' : '-'}
                              {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setFinEditingId(entry.id);
                                  setFinEditDate(entry.date);
                                  setFinEditType(entry.type);
                                  setFinEditCategory(entry.category);
                                  setFinEditAmount(entry.amount.toString());
                                  setFinEditDescription(entry.description || '');
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFinEntry(entry.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {finTotalPages > 1 && (
              <div className="p-3.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-500">
                  Page {finPage} of {finTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFinPage((p) => Math.max(1, p - 1))}
                    disabled={finPage === 1}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFinPage((p) => Math.min(finTotalPages, p + 1))}
                    disabled={finPage === finTotalPages}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 2: STUDY HISTORY                                         */}
      {/* ------------------------------------------------------------ */}
      {activeTab === 'study' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <select
                value={studySubjectFilter}
                onChange={(e) => {
                  setStudySubjectFilter(e.target.value);
                  setStudyPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">All Subjects</option>
                {COMMON_STUDY_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={studyStartDate}
                  onChange={(e) => {
                    setStudyStartDate(e.target.value);
                    setStudyPage(1);
                  }}
                  className="px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-stone-400">to</span>
                <input
                  type="date"
                  value={studyEndDate}
                  onChange={(e) => {
                    setStudyEndDate(e.target.value);
                    setStudyPage(1);
                  }}
                  className="px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>

              {(studySubjectFilter || studyStartDate || studyEndDate) && (
                <button
                  onClick={() => {
                    setStudySubjectFilter('');
                    setStudyStartDate('');
                    setStudyEndDate('');
                    setStudyPage(1);
                  }}
                  className="px-2.5 py-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <span className="text-stone-500 font-medium">
              Showing {studySessions.length} of {studyTotal} sessions
            </span>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-hidden border rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/70 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Assessment Score</th>
                    <th className="p-3.5">Notes</th>
                    <th className="p-3.5 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {studyLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading study history...
                      </td>
                    </tr>
                  ) : studySessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">
                        No study sessions found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    studySessions.map((session) => {
                      const isEditing = studyEditingId === session.id;
                      if (isEditing) {
                        return (
                          <tr key={session.id} className="bg-indigo-50/50 dark:bg-indigo-950/20">
                            <td className="p-2">
                              <input
                                type="date"
                                value={studyEditDate}
                                onChange={(e) => setStudyEditDate(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-stone-900 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={studyEditSubject}
                                onChange={(e) => setStudyEditSubject(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-stone-900 text-xs"
                              >
                                {COMMON_STUDY_SUBJECTS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.5"
                                value={studyEditHours}
                                onChange={(e) => setStudyEditHours(e.target.value)}
                                className="w-20 p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-stone-900 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="%"
                                value={studyEditScore}
                                onChange={(e) => setStudyEditScore(e.target.value)}
                                className="w-20 p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-stone-900 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={studyEditNotes}
                                onChange={(e) => setStudyEditNotes(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-stone-900 text-xs"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveStudyEdit(session.id)}
                                  disabled={studySavingEdit}
                                  className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                  title="Save Changes"
                                >
                                  {studySavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => setStudyEditingId(null)}
                                  className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 transition"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={session.id} className="hover:bg-stone-50 dark:hover:bg-stone-850/50 transition">
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">{session.date}</td>
                          <td className="p-3.5 font-medium text-stone-900 dark:text-stone-100">{session.subject}</td>
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">{session.hours} hrs</td>
                          <td className="p-3.5 font-mono font-bold">
                            {session.score !== null && session.score !== undefined ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] ${
                                  session.score >= 80
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : session.score >= 65
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {session.score}%
                              </span>
                            ) : (
                              <span className="text-stone-400 font-normal">Unrated</span>
                            )}
                          </td>
                          <td className="p-3.5 text-stone-600 dark:text-stone-400 max-w-xs truncate">{session.notes || '—'}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setStudyEditingId(session.id);
                                  setStudyEditDate(session.date);
                                  setStudyEditSubject(session.subject);
                                  setStudyEditHours(session.hours.toString());
                                  setStudyEditScore(session.score?.toString() || '');
                                  setStudyEditNotes(session.notes || '');
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudySession(session.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {studyTotalPages > 1 && (
              <div className="p-3.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-500">
                  Page {studyPage} of {studyTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStudyPage((p) => Math.max(1, p - 1))}
                    disabled={studyPage === 1}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setStudyPage((p) => Math.min(studyTotalPages, p + 1))}
                    disabled={studyPage === studyTotalPages}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 3: HABITS HISTORY                                        */}
      {/* ------------------------------------------------------------ */}
      {activeTab === 'habits' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <select
                value={habitFilter}
                onChange={(e) => {
                  setHabitFilter(e.target.value);
                  setHabitPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">All Habits</option>
                {COMMON_HABITS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={habitStartDate}
                  onChange={(e) => {
                    setHabitStartDate(e.target.value);
                    setHabitPage(1);
                  }}
                  className="px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-stone-400">to</span>
                <input
                  type="date"
                  value={habitEndDate}
                  onChange={(e) => {
                    setHabitEndDate(e.target.value);
                    setHabitPage(1);
                  }}
                  className="px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>

              {(habitFilter || habitStartDate || habitEndDate) && (
                <button
                  onClick={() => {
                    setHabitFilter('');
                    setHabitStartDate('');
                    setHabitEndDate('');
                    setHabitPage(1);
                  }}
                  className="px-2.5 py-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <span className="text-stone-500 font-medium">
              Showing {habitLogs.length} of {habitTotal} logs
            </span>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-hidden border rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/70 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Habit</th>
                    <th className="p-3.5">Completed</th>
                    <th className="p-3.5">Sleep (hrs)</th>
                    <th className="p-3.5">Exercise (mins)</th>
                    <th className="p-3.5">Mood</th>
                    <th className="p-3.5 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {habitLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Loading habits history...
                      </td>
                    </tr>
                  ) : habitLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-500">
                        No habit logs found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    habitLogs.map((log) => {
                      const isEditing = habitEditingId === log.id;
                      if (isEditing) {
                        return (
                          <tr key={log.id} className="bg-amber-50/50 dark:bg-amber-950/20">
                            <td className="p-2">
                              <input
                                type="date"
                                value={habitEditDate}
                                onChange={(e) => setHabitEditDate(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={habitEditHabit}
                                onChange={(e) => setHabitEditHabit(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-xs"
                              >
                                {COMMON_HABITS.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={habitEditDone}
                                onChange={(e) => setHabitEditDone(e.target.checked)}
                                className="w-4 h-4 text-amber-600 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.1"
                                value={habitEditSleep}
                                onChange={(e) => setHabitEditSleep(e.target.value)}
                                className="w-16 p-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={habitEditExercise}
                                onChange={(e) => setHabitEditExercise(e.target.value)}
                                className="w-16 p-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={habitEditMood}
                                onChange={(e) => setHabitEditMood(parseInt(e.target.value, 10))}
                                className="w-24 p-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-xs"
                              >
                                {[1, 2, 3, 4, 5].map((m) => (
                                  <option key={m} value={m}>
                                    {m} - {MOOD_LABELS[m]?.text}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveHabitEdit(log.id)}
                                  disabled={habitSavingEdit}
                                  className="p-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
                                  title="Save Changes"
                                >
                                  {habitSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => setHabitEditingId(null)}
                                  className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 transition"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-850/50 transition">
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">{log.date}</td>
                          <td className="p-3.5 font-medium text-stone-900 dark:text-stone-100">{log.habit}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                log.done
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700'
                              }`}
                            >
                              {log.done ? 'Done' : 'Missed'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">
                            {log.sleep_hours !== null && log.sleep_hours !== undefined ? `${log.sleep_hours}h` : '—'}
                          </td>
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">
                            {log.exercise_minutes !== null && log.exercise_minutes !== undefined ? `${log.exercise_minutes}m` : '—'}
                          </td>
                          <td className="p-3.5">
                            {log.mood ? (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${MOOD_LABELS[log.mood]?.color || ''}`}>
                                {MOOD_LABELS[log.mood]?.text || `Mood ${log.mood}`}
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setHabitEditingId(log.id);
                                  setHabitEditDate(log.date);
                                  setHabitEditHabit(log.habit);
                                  setHabitEditDone(log.done);
                                  setHabitEditSleep(log.sleep_hours?.toString() || '');
                                  setHabitEditExercise(log.exercise_minutes?.toString() || '');
                                  setHabitEditMood(log.mood || 3);
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHabitLog(log.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {habitTotalPages > 1 && (
              <div className="p-3.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-500">
                  Page {habitPage} of {habitTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setHabitPage((p) => Math.max(1, p - 1))}
                    disabled={habitPage === 1}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHabitPage((p) => Math.min(habitTotalPages, p + 1))}
                    disabled={habitPage === habitTotalPages}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 4: LOGIN HISTORY                                         */}
      {/* ------------------------------------------------------------ */}
      {activeTab === 'logins' && (
        <div className="space-y-4">
          {/* Privacy Note Banner */}
          <div className="glass-panel p-4 flex items-center justify-between gap-4 border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900 dark:text-stone-100">
                  Account Access & Security Logs
                </p>
                <p className="text-stone-600 dark:text-stone-400 mt-0.5">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">Only you can see this.</span> IP addresses are privacy-truncated (last IPv4 octet masked or IPv6 /48) to safeguard your confidentiality while monitoring unauthorized access.
                </p>
              </div>
            </div>

            <button
              onClick={fetchLoginHistory}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition whitespace-nowrap font-medium"
            >
              Refresh Logs
            </button>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-hidden border rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/70 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">Device & Environment</th>
                    <th className="p-3.5">Truncated IP</th>
                    <th className="p-3.5">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {loginLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-stone-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading login history...
                      </td>
                    </tr>
                  ) : loginEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-stone-500">
                        No login events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginEvents.map((event) => {
                      const isSuccess = event.success;
                      const isDemo = event.method === 'demo-login';
                      const formattedTime = new Date(event.created_at).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <tr key={event.id} className="hover:bg-stone-50 dark:hover:bg-stone-850/50 transition">
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap">
                            {formattedTime}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isSuccess
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isSuccess ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-rose-600" />}
                              <span>{isSuccess ? 'Success' : 'Failed Attempt'}</span>
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-stone-900 dark:text-stone-100">
                            <div className="flex items-center gap-2">
                              <Laptop className="w-3.5 h-3.5 text-stone-400" />
                              <span>{event.browser_os}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-stone-400" />
                              <span>{event.ip_address}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isDemo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
                                <Sparkles className="w-3 h-3" />
                                <span>Demo Login</span>
                              </span>
                            ) : (
                              <span className="text-stone-600 dark:text-stone-400 font-medium">
                                Password
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <span>Loading historical audit logs...</span>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
