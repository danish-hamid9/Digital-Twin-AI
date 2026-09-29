'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { FinanceEntry } from '@/lib/types';
import {
  Wallet,
  Plus,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle
} from 'lucide-react';

const COMMON_CATEGORIES = [
  'Housing/Rent',
  'Groceries',
  'Dining Out',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Salary',
  'Miscellaneous'
];

export default function FinancePage() {
  const { profile } = useAuth();
  const currency = profile?.currency || 'USD';

  // Entries & Pagination state
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // New Entry Form State
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newCategory, setNewCategory] = useState('Groceries');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFinanceEntries({
        page,
        page_size: pageSize,
        type: typeFilter || undefined,
        category: categoryFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setEntries(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      console.error('Failed to load finance entries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, categoryFilter, startDate, endDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = parseFloat(newAmount);

    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createFinanceEntry({
        date: newDate,
        type: newType,
        category: newCategory,
        amount: amt,
        description: newDescription,
      });
      setNewAmount('');
      setNewDescription('');
      setShowForm(false);
      setPage(1);
      await fetchEntries();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const startInlineEdit = (entry: FinanceEntry) => {
    setEditingId(entry.id);
    setEditDate(entry.date);
    setEditType(entry.type);
    setEditCategory(entry.category);
    setEditAmount(entry.amount.toString());
    setEditDescription(entry.description || '');
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  const saveInlineEdit = async (id: string) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Amount must be positive.');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateFinanceEntry(id, {
        date: editDate,
        type: editType,
        category: editCategory,
        amount: amt,
        description: editDescription,
      });
      setEditingId(null);
      await fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to update entry');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this finance entry?')) return;
    try {
      await api.deleteFinanceEntry(id);
      await fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Personal Finance Ledger
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Finance Entries & Budget</h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged transactions in user currency: <span className="font-semibold text-emerald-400 font-mono">{currency}</span>
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel Entry' : 'Log New Transaction'}</span>
        </button>
      </div>

      {/* Entry Form Modal / Collapsible */}
      {showForm && (
        <form onSubmit={handleCreateEntry} className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white">Record Transaction</h2>
            <span className="text-xs text-slate-500 font-mono">Currency: {currency}</span>
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('expense')}
                  className={`py-2 text-xs font-medium rounded-xl border transition ${
                    newType === 'expense'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('income')}
                  className={`py-2 text-xs font-medium rounded-xl border transition ${
                    newType === 'income'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {COMMON_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Weekly grocery stock up at Trader Joe's"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Entry</span>
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

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none"
          >
            <option value="">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>

          <input
            type="text"
            placeholder="Search category..."
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
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
          Total: <span className="text-white font-semibold">{total}</span> entries
        </div>
      </div>

      {/* Data Table with Inline Editing */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount ({currency})</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Loading ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="text-sm">No transactions match the selected criteria.</p>
                    <p className="text-xs mt-1 text-slate-600">Click &ldquo;Log New Transaction&rdquo; above to record your first entry.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const isIncome = (isEditing ? editType : entry.type) === 'income';

                  return (
                    <tr
                      key={entry.id}
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
                          entry.date
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as any)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              entry.type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {entry.type === 'income' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span className="capitalize">{entry.type}</span>
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 font-medium text-white">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-32"
                          />
                        ) : (
                          entry.category
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-full"
                          />
                        ) : (
                          entry.description || '—'
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white w-24 text-right"
                          />
                        ) : (
                          <span className={isIncome ? 'text-emerald-400' : 'text-slate-200'}>
                            {isIncome ? '+' : '-'} {currency} {Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveInlineEdit(entry.id)}
                              disabled={savingEdit}
                              title="Save Changes"
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
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
                              onClick={() => startInlineEdit(entry)}
                              title="Edit Row Inline"
                              className="text-slate-400 hover:text-indigo-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
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

        {/* Pagination Controls */}
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
