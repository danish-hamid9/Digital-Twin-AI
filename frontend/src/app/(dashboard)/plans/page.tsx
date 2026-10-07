'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Plan, PlanCreate } from '@/lib/types';
import Toast from '@/components/ui/Toast';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Tag,
  Filter,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  User,
  Bot,
  Compass,
  ChevronRight,
  Flame,
} from 'lucide-react';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);

  // Quick-Add form state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickDomain, setQuickDomain] = useState<'finance' | 'study' | 'habit' | 'general'>('general');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickStatus, setQuickStatus] = useState<'pending' | 'in_progress'>('pending');
  const [quickSource, setQuickSource] = useState<'You' | 'Chat' | 'Recommendation'>('You');
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Derive source tag
  const getPlanSource = (plan: Plan): 'You' | 'Chat' | 'Recommendation' => {
    const text = `${plan.title} ${plan.description || ''}`.toLowerCase();
    if (text.includes('recommendation') || text.includes('heuristic') || text.includes('metric:')) {
      return 'Recommendation';
    }
    if (text.includes('chat') || text.includes('proposed') || text.includes('assistant') || plan.status === 'proposed') {
      return 'Chat';
    }
    return 'You';
  };

  const isOverdue = (dueDateStr?: string, status?: string): boolean => {
    if (!dueDateStr || status === 'completed') return false;
    const today = new Date().toISOString().slice(0, 10);
    return dueDateStr < today;
  };

  // Header statistics
  const activePlansCount = plans.filter((p) => p.status === 'pending' || p.status === 'in_progress').length;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const completedThisWeekCount = plans.filter(
    (p) => p.status === 'completed' && (!p.due_date || p.due_date >= oneWeekAgo)
  ).length;

  const overdueCount = plans.filter((p) => isOverdue(p.due_date, p.status)).length;

  // Chat-proposed plans requiring confirmation
  const proposedPlans = plans.filter((p) => p.status === 'proposed');

  // Handle Quick Add
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setSubmittingQuick(true);
    try {
      const sourcePrefix = quickSource !== 'You' ? `[Source: ${quickSource}] ` : '';
      await api.createPlan({
        title: quickTitle.trim(),
        description: quickDescription.trim() ? `${sourcePrefix}${quickDescription.trim()}` : sourcePrefix ? sourcePrefix.trim() : '',
        domain: quickDomain,
        status: quickStatus,
        due_date: quickDueDate || undefined,
      });

      setToastMessage('New action plan added successfully!');
      setToastType('success');
      setQuickTitle('');
      setQuickDescription('');
      setQuickDueDate('');
      setQuickStatus('pending');
      await fetchPlans();

      setTimeout(() => {
        quickInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to create plan');
      setToastType('error');
    } finally {
      setSubmittingQuick(false);
    }
  };

  // Status updates
  const handleUpdateStatus = async (planId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      await api.updatePlan(planId, { status: newStatus });
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, status: newStatus } : p))
      );
      setToastMessage(`Plan moved to ${newStatus.replace('_', ' ')}.`);
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to update plan status');
      setToastType('error');
    }
  };

  // Delete plan
  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this action plan?')) return;
    try {
      await api.deletePlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      setToastMessage('Plan deleted.');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to delete plan');
      setToastType('error');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (planId: string) => {
    setDraggedPlanId(planId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!draggedPlanId) return;
    const targetPlan = plans.find((p) => p.id === draggedPlanId);
    if (targetPlan && targetPlan.status !== newStatus) {
      await handleUpdateStatus(draggedPlanId, newStatus);
    }
    setDraggedPlanId(null);
  };

  // Filter plans
  const filteredPlans = plans.filter((p) => {
    if (filterDomain === 'all') return true;
    return p.domain === filterDomain;
  });

  const pendingList = filteredPlans.filter((p) => p.status === 'pending');
  const inProgressList = filteredPlans.filter((p) => p.status === 'in_progress');
  const completedList = filteredPlans.filter((p) => p.status === 'completed');

  const getDomainStyle = (domain: string) => {
    switch (domain) {
      case 'finance':
        return 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/20';
      case 'study':
        return 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20';
      case 'habit':
      case 'habits':
        return 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-stone-700 dark:text-stone-300 bg-stone-500/10 border-stone-500/20';
    }
  };

  const getSourceIcon = (source: 'You' | 'Chat' | 'Recommendation') => {
    switch (source) {
      case 'Chat':
        return <Bot className="w-3 h-3 text-indigo-500" />;
      case 'Recommendation':
        return <Compass className="w-3 h-3 text-amber-500" />;
      default:
        return <User className="w-3 h-3 text-stone-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ------------------------------------------------------------ */}
      {/* 1. HEADER & KPI STAT TILES                                  */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Action Board &amp; Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Action Plans Board
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Structured Kanban roadmap executing your behavioral recommendations and AI twin interventions.
          </p>
        </div>

        {/* Domain Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          >
            <option value="all">All Domains</option>
            <option value="finance">Finance</option>
            <option value="study">Study</option>
            <option value="habit">Habit</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Header Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
              Active Plans
            </span>
            <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
              {activePlansCount}
            </span>
          </div>
        </div>

        <div className="bento-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
              Completed This Week
            </span>
            <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
              {completedThisWeekCount}
            </span>
          </div>
        </div>

        <div className="bento-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
              Overdue Milestones
            </span>
            <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {overdueCount}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. CHAT-PROPOSED PLANS CONFIRMATION BANNER                  */}
      {/* ------------------------------------------------------------ */}
      {proposedPlans.length > 0 && (
        <div className="bento-card p-5 border-amber-500/30 bg-amber-500/[0.03] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                Assistant Proposed Plans ({proposedPlans.length} Pending Review)
              </h3>
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              Generated via Chat Assistant
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {proposedPlans.map((prop) => (
              <div
                key={prop.id}
                className="p-3.5 rounded-xl bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getDomainStyle(prop.domain)}`}>
                      {prop.domain}
                    </span>
                    {prop.due_date && (
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        Due: {prop.due_date}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {prop.title}
                  </h4>
                  {prop.description && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                      {prop.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6DFD3] dark:border-[#2D2721]">
                  <button
                    onClick={() => handleDeletePlan(prop.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(prop.id, 'in_progress')}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Confirm &amp; Activate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* 3. COMPACT QUICK-ADD BAR                                     */}
      {/* ------------------------------------------------------------ */}
      <div className="bento-card p-4 border border-teal-500/20 bg-teal-500/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Quick-Add Action Plan
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400">
            Define steps and target completion date
          </span>
        </div>

        <form onSubmit={handleQuickAdd} className="space-y-2">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5">
            {/* Title */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Plan Title *
              </label>
              <input
                ref={quickInputRef}
                type="text"
                required
                placeholder="e.g. Build $1,500 emergency savings buffer"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Domain */}
            <div className="w-full lg:w-32 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Domain
              </label>
              <select
                value={quickDomain}
                onChange={(e) => setQuickDomain(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="finance">Finance</option>
                <option value="study">Study</option>
                <option value="habit">Habit</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Target Due Date */}
            <div className="w-full lg:w-36 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={quickDueDate}
                onChange={(e) => setQuickDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-mono"
              />
            </div>

            {/* Initial Status */}
            <div className="w-full lg:w-32 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Status
              </label>
              <select
                value={quickStatus}
                onChange={(e) => setQuickStatus(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>

            {/* Source */}
            <div className="w-full lg:w-32 flex-shrink-0">
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Source Tag
              </label>
              <select
                value={quickSource}
                onChange={(e) => setQuickSource(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-lg text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="You">You</option>
                <option value="Chat">Chat</option>
                <option value="Recommendation">Recommendation</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="w-full lg:w-auto flex-shrink-0">
              <button
                type="submit"
                disabled={submittingQuick}
                className="w-full lg:w-auto px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 h-[34px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Plan</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4. KANBAN BOARD: PENDING, IN PROGRESS, COMPLETED             */}
      {/* ------------------------------------------------------------ */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 dark:text-stone-400">Loading action board...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Pending */}
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop('pending')}
            className="p-4 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] space-y-3 flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3] dark:border-[#2D2721]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Pending
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white dark:bg-[#201D1A] border border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300">
                {pendingList.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 min-h-[140px]">
              {pendingList.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 border border-dashed border-stone-300 dark:border-stone-800 rounded-xl text-center text-xs text-stone-400">
                  Drop items here or use Quick-Add
                </div>
              ) : (
                pendingList.map((plan) => renderPlanCard(plan, 'pending'))
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop('in_progress')}
            className="p-4 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] space-y-3 flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3] dark:border-[#2D2721]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  In Progress
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white dark:bg-[#201D1A] border border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300">
                {inProgressList.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 min-h-[140px]">
              {inProgressList.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 border border-dashed border-stone-300 dark:border-stone-800 rounded-xl text-center text-xs text-stone-400">
                  No plans currently active
                </div>
              ) : (
                inProgressList.map((plan) => renderPlanCard(plan, 'in_progress'))
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop('completed')}
            className="p-4 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] space-y-3 flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3] dark:border-[#2D2721]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Completed
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white dark:bg-[#201D1A] border border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300">
                {completedList.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 min-h-[140px]">
              {completedList.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 border border-dashed border-stone-300 dark:border-stone-800 rounded-xl text-center text-xs text-stone-400">
                  Completed items appear here
                </div>
              ) : (
                completedList.map((plan) => renderPlanCard(plan, 'completed'))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render individual card
  function renderPlanCard(plan: Plan, currentColumn: 'pending' | 'in_progress' | 'completed') {
    const overdue = isOverdue(plan.due_date, plan.status);
    const source = getPlanSource(plan);

    return (
      <div
        key={plan.id}
        draggable={true}
        onDragStart={() => handleDragStart(plan.id)}
        className="bento-card p-4 space-y-3 cursor-grab active:cursor-grabbing border border-[#E6DFD3] dark:border-[#2D2721] bg-white dark:bg-[#1C1A17] shadow-sm hover:shadow-md transition"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getDomainStyle(
                plan.domain
              )}`}
            >
              {plan.domain}
            </span>

            {/* Source Tag */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[#E6DFD3] dark:border-[#2D2721]">
              {getSourceIcon(source)}
              <span>{source}</span>
            </span>
          </div>

          <button
            onClick={() => handleDeletePlan(plan.id)}
            className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
            title="Delete Plan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-snug">
          {plan.title}
        </h4>

        {/* Description */}
        {plan.description && (
          <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2">
            {plan.description}
          </p>
        )}

        {/* Due Date & Overdue Highlighting */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          {plan.due_date ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] border ${
                overdue
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold'
                  : 'bg-[#FAF7F0] dark:bg-[#181614] text-stone-600 dark:text-stone-400 border-[#E6DFD3] dark:border-[#2D2721]'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{plan.due_date}</span>
              {overdue && <span className="uppercase text-[9px] font-black">Overdue</span>}
            </span>
          ) : (
            <span className="text-[10px] text-stone-400">No deadline</span>
          )}
        </div>

        {/* Quick Column Movement Buttons */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#E6DFD3] dark:border-[#2D2721]">
          {currentColumn !== 'pending' && (
            <button
              onClick={() => handleUpdateStatus(plan.id, 'pending')}
              className="px-2 py-1 rounded bg-[#FAF7F0] dark:bg-[#181614] hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[#E6DFD3] dark:border-[#2D2721] text-[10px] font-semibold transition"
            >
              Pending
            </button>
          )}
          {currentColumn !== 'in_progress' && (
            <button
              onClick={() => handleUpdateStatus(plan.id, 'in_progress')}
              className="px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 text-[10px] font-semibold transition"
            >
              In Progress
            </button>
          )}
          {currentColumn !== 'completed' && (
            <button
              onClick={() => handleUpdateStatus(plan.id, 'completed')}
              className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-semibold transition flex items-center gap-1"
            >
              <Check className="w-2.5 h-2.5" />
              <span>Complete</span>
            </button>
          )}
        </div>
      </div>
    );
  }
}
