'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { FinanceAnalytics, FinancePredictionResponse } from '@/lib/types';
import CashFlowChart from '@/components/charts/CashFlowChart';
import ExpenseCategoryDonut from '@/components/charts/ExpenseCategoryDonut';
import FinanceForecastFanChart from '@/components/charts/FinanceForecastFanChart';
import Toast from '@/components/ui/Toast';
import CollapsibleEntryPanel from '@/components/ui/CollapsibleEntryPanel';
import {
  Wallet,
  ArrowRight,
  TrendingUp,
  Loader2,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  Check,
  Plus,
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
  'Miscellaneous',
];

export default function FinancePage() {
  const { profile } = useAuth();
  const currency = profile?.currency || 'USD';

  // Quick-Add Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newCategory, setNewCategory] = useState('Groceries');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

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
      const data = await api.getFinanceAnalytics({});
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load finance analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchPrediction(predictionHorizon);
  }, [fetchAnalytics, fetchPrediction, predictionHorizon]);

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

      // Show toast
      setToastMessage('Transaction recorded successfully!');
      setToastType('success');

      // Collapse entry panel
      setIsAddOpen(false);

      // Refresh KPIs and charts
      await fetchAnalytics();
      fetchPrediction(predictionHorizon);

      // Reset form
      setNewAmount('');
      setNewDescription('');

      // Focus first field
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setFormError(err.message || 'Failed to record entry.');
      setToastMessage(err.message || 'Failed to record entry.');
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Personal Finance Ledger
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Finance Overview & Forecasts</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Currency: <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">{currency}</span>
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add transaction</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Collapsible Entry Form Panel (Hidden by default, expands)    */}
      {/* ------------------------------------------------------------ */}
      <CollapsibleEntryPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Quick-Add Transaction"
        badge="1-click ledger"
        colorScheme="teal"
      >
        <form onSubmit={handleCreateEntry} className="space-y-2">
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
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* 2. Type */}
            <div>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            {/* 3. Category */}
            <div>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Amount */}
            <div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-stone-400 font-mono text-xs">{currency}</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full pl-12 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Description */}
            <div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* 6. Submit Button */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Transaction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </CollapsibleEntryPanel>

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
    </div>
  );
}
