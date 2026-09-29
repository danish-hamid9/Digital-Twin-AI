'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { StudySession } from '@/lib/types';
import {
  GraduationCap,
  Plus,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Award
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
  'General Reading'
];

export default function StudyPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSubject, setNewSubject] = useState(COMMON_SUBJECTS[0]);
  const [newHours, setNewHours] = useState('2.0');
  const [newScore, setNewScore] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editScore, setEditScore] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getStudySessions({
        page,
        page_size: pageSize,
        subject: subjectFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setSessions(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      console.error('Failed to load study sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, subjectFilter, startDate, endDate]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const hrs = parseFloat(newHours);
    const scr = newScore.trim() ? parseFloat(newScore) : undefined;

    if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
      setFormError('Study hours must be strictly between 0 and 24 hours.');
      return;
    }
    if (scr !== undefined && (isNaN(scr) || scr < 0 || scr > 100)) {
      setFormError('Score must be between 0 and 100%.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createStudySession({
        date: newDate,
        subject: newSubject,
        hours: hrs,
        score: scr,
        notes: newNotes,
      });
      setNewHours('2.0');
      setNewScore('');
      setNewNotes('');
      setShowForm(false);
      setPage(1);
      await fetchSessions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record study session.');
    } finally {
      setSubmitting(false);
    }
  };

  const startInlineEdit = (s: StudySession) => {
    setEditingId(s.id);
    setEditDate(s.date);
    setEditSubject(s.subject);
    setEditHours(s.hours.toString());
    setEditScore(s.score !== undefined && s.score !== null ? s.score.toString() : '');
    setEditNotes(s.notes || '');
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  const saveInlineEdit = async (id: string) => {
    const hrs = parseFloat(editHours);
    const scr = editScore.trim() ? parseFloat(editScore) : undefined;

    if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
      alert('Hours must be between 0 and 24.');
      return;
    }
    if (scr !== undefined && (isNaN(scr) || scr < 0 || scr > 100)) {
      alert('Score must be between 0 and 100.');
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateStudySession(id, {
        date: editDate,
        subject: editSubject,
        hours: hrs,
        score: scr,
        notes: editNotes,
      });
      setEditingId(null);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to update study session');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study session?')) return;
    try {
      await api.deleteStudySession(id);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete session');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Study & Academic Performance
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Study Sessions & Assessments</h1>
          <p className="text-xs text-slate-400 mt-1">
            Log focused deep work sessions and quiz/exam scores to inform your cognitive trajectory.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel Session' : 'Record Study Session'}</span>
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <form onSubmit={handleCreateSession} className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white">Log Study Session</h2>
            <span className="text-xs text-slate-500 font-mono">Cognitive Analytics Input</span>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject</label>
              <input
                type="text"
                list="subjects-list"
                required
                placeholder="e.g. Mathematics"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <datalist id="subjects-list">
                {COMMON_SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Study Duration (Hours)</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                required
                placeholder="e.g. 2.5"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Quiz / Exam Score (0-100%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="Optional score"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Session Notes / Focus Area</label>
            <input
              type="text"
              placeholder="e.g. Solved problem sets 4 to 8, high retention with Pomodoro technique"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Session</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <input
            type="text"
            placeholder="Search subject..."
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none"
          />

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none"
            />
          </div>
        </div>

        <div className="text-slate-400 font-mono">
          Total: <span className="text-white font-semibold">{total}</span> sessions
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading sessions...</span>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="text-sm">No study sessions recorded yet.</p>
                    <p className="text-xs mt-1 text-slate-600">Click &ldquo;Record Study Session&rdquo; above to log your focus time.</p>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const isEditing = editingId === s.id;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isEditing ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white"
                          />
                        ) : (
                          s.date
                        )}
                      </td>

                      {/* Subject */}
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-36"
                          />
                        ) : (
                          s.subject
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.25"
                            value={editHours}
                            onChange={(e) => setEditHours(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-20 text-center"
                          />
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                            {s.hours} hrs
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            value={editScore}
                            placeholder="Score"
                            onChange={(e) => setEditScore(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-20 text-center"
                          />
                        ) : s.score !== null && s.score !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <Award className="w-3 h-3" />
                            <span>{s.score}%</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-full"
                          />
                        ) : (
                          s.notes || '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveInlineEdit(s.id)}
                              disabled={savingEdit}
                              title="Save Changes"
                              className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              title="Cancel"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startInlineEdit(s)}
                              title="Edit Row"
                              className="text-slate-400 hover:text-indigo-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(s.id)}
                              title="Delete Row"
                              className="text-slate-400 hover:text-rose-400 transition"
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
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
