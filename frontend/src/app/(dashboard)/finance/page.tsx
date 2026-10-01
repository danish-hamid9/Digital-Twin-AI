'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { FinanceEntry, FinanceAnalytics, FinancePredictionResponse } from '@/lib/types';
import CashFlowChart from '@/components/charts/CashFlowChart';
import ExpenseCategoryDonut from '@/components/charts/ExpenseCategoryDonut';
import FinanceForecastFanChart from '@/components/charts/FinanceForecastFanChart';
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
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
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

  // Analytics state
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  // Prediction state
  const [prediction, setPrediction] = useState<FinancePredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionHorizon, setPredictionHorizon] = useState(3);

  const fetchPrediction = useCallback(async (horizon: number = 3) => {
    setLoadingPrediction(true);
    try {
      const data = await api.getFinancePredictions(horizon);
      setPrediction(data);
    } catch (err) {
      console.error('Failed to load finance predictions:', err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.getFinanceAnalytics({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load finance analytics:', err);
    }
  }, [startDate, endDate]);

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
    fetchAnalytics();
    fetchPrediction(predictionHorizon);
  }, [fetchEntries, fetchAnalytics, fetchPrediction, predictionHorizon]);

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
      await fetchAnalytics();
      fetchPrediction(predictionHorizon);
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
      await fetchAnalytics();
      fetchPrediction(predictionHorizon);
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
      await fetchAnalytics();
      fetchPrediction(predictionHorizon);
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Personal Finance Ledger
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Finance Entries & Budget</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Logged transactions in user currency: <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">{currency}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
            <span>{showCharts ? 'Hide Visuals' : 'Show Visuals'}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 text-teal-400 dark:text-teal-600" />
            <span>{showForm ? 'Cancel Entry' : 'Log New Transaction'}</span>
          </button>
        </div>
      </div>

      {/* Finance Analytics & Bento KPI Cards */}
      {analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bento-card bento-finance p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Net Savings</span>
              <span className={`text-xl font-black font-mono mt-1 block ${analytics.net_savings >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600'}`}>
                {analytics.net_savings >= 0 ? '+' : ''}{currency} {Number(analytics.net_savings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bento-card bento-finance p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Savings Rate</span>
              <span className="text-xl font-black font-mono text-teal-700 dark:text-teal-400 mt-1 block">
                {analytics.savings_rate}%
              </span>
            </div>
            <div className="bento-card p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Total Inflow</span>
              <span className="text-xl font-black font-mono text-stone-900 dark:text-stone-100 mt-1 block">
                {currency} {Number(analytics.total_income).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bento-card p-5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-semibold uppercase tracking-wider">Total Outflow</span>
              <span className="text-xl font-black font-mono text-stone-900 dark:text-stone-100 mt-1 block">
                {currency} {Number(analytics.total_expenses).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">Cash Flow Trajectory</h3>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                    {currency}
                  </span>
                </div>
                <CashFlowChart
                  data={analytics.cash_flow_trend}
                  currency={currency}
                  savingsRate={analytics.savings_rate}
                />
              </div>

              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
                      <PieIcon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">Expense Distribution</h3>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                    {analytics.category_distribution.length} categories
                  </span>
                </div>
                <ExpenseCategoryDonut
                  data={analytics.category_distribution}
                  currency={currency}
                  totalExpenses={analytics.total_expenses}
                />
              </div>
            </div>
          )}

          {/* Machine Learning Fan Chart Forecast Bento Card */}
          {prediction && (
            <div className="bento-card bento-finance p-6">
              <FinanceForecastFanChart
                prediction={prediction}
                currency={currency}
                onHorizonChange={(h) => {
                  setPredictionHorizon(h);
                  fetchPrediction(h);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Entry Form Modal / Collapsible */}
      {showForm && (
        <form onSubmit={handleCreateEntry} className="bento-card bento-finance p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#2D2721] pb-3">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Record Transaction</h2>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">Currency: {currency}</span>
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
                className="w-full px-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('expense')}
                  className={`py-2 text-xs font-medium rounded-xl border transition ${
                    newType === 'expense'
                      ? 'bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300 font-semibold'
                      : 'bg-[#FAF7F0] dark:bg-[#181614] border-[#E6DFD3] dark:border-[#2D2721] text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('income')}
                  className={`py-2 text-xs font-medium rounded-xl border transition ${
                    newType === 'income'
                      ? 'bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300 font-semibold'
                      : 'bg-[#FAF7F0] dark:bg-[#181614] border-[#E6DFD3] dark:border-[#2D2721] text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {COMMON_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Weekly grocery stock up at Trader Joe's"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
            />
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
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Transaction</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="bento-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Filter:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 outline-none"
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
          Total: <span className="text-stone-900 dark:text-stone-100 font-semibold">{total}</span> entries
        </div>
      </div>

      {/* Data Table with Inline Editing */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4EFE6] dark:bg-[#151311] text-stone-600 dark:text-stone-400 border-b border-[#E6DFD3] dark:border-[#2D2721] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount ({currency})</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD3] dark:divide-[#2D2721]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />
                      <span>Loading ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <p className="text-sm">No transactions match the selected criteria.</p>
                    <p className="text-xs mt-1 text-stone-400">Click &ldquo;Log New Transaction&rdquo; above to record your first entry.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const isIncome = (isEditing ? editType : entry.type) === 'income';

                  return (
                    <tr
                      key={entry.id}
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
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-teal-500 rounded text-xs text-stone-900 dark:text-stone-100"
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
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-teal-500 rounded text-xs text-stone-900 dark:text-stone-100"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              entry.type === 'income'
                                ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30'
                                : 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/30'
                            }`}
                          >
                            {entry.type === 'income' ? (
                              <TrendingUp className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                            )}
                            <span className="capitalize">{entry.type}</span>
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-teal-500 rounded text-xs text-stone-900 dark:text-stone-100 w-32"
                          />
                        ) : (
                          entry.category
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-400 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-teal-500 rounded text-xs text-stone-900 dark:text-stone-100 w-full"
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
                            className="px-2 py-1 bg-[#FAF7F0] dark:bg-[#181614] border border-teal-500 rounded text-xs text-stone-900 dark:text-stone-100 w-24 text-right"
                          />
                        ) : (
                          <span className={isIncome ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-stone-900 dark:text-stone-100'}>
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
                              className="p-1 rounded bg-teal-600 hover:bg-teal-700 text-white transition"
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
                              onClick={() => startInlineEdit(entry)}
                              title="Edit Row Inline"
                              className="text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
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

        {/* Pagination Controls */}
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
