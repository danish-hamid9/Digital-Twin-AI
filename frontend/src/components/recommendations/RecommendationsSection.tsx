'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Filter,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  HeartPulse,
  Layers,
  X,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { RecommendationResponse, RecommendationItem } from '@/lib/types';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import Toast from '@/components/ui/Toast';

export default function RecommendationsSection() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [showDismissedDrawer, setShowDismissedDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed_recommendation_ids');
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      // ignore
    }

    const loadRecommendations = async () => {
      try {
        const res = await api.getRecommendations();
        setData(res);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecommendations();
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('dismissed_recommendation_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        // ignore
      }
      return next;
    });
    setToastMessage('Recommendation dismissed. You can undo in Dismissed Drawer.');
  };

  const handleUndoDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      try {
        localStorage.setItem('dismissed_recommendation_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleRestoreAll = () => {
    setDismissedIds(new Set());
    try {
      localStorage.removeItem('dismissed_recommendation_ids');
    } catch (e) {
      // ignore
    }
    setShowDismissedDrawer(false);
    setToastMessage('All dismissed recommendations restored.');
  };

  const handleActSuccess = (planTitle: string) => {
    setToastMessage(`Action plan "${planTitle}" created successfully! Check the Plans tab.`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bento-card p-6 h-36" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bento-card p-6 h-64" />
          <div className="bento-card p-6 h-64" />
          <div className="bento-card p-6 h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const allRecs = data.recommendations || [];
  const highPriorityList = allRecs.filter((r) => r.priority === 'high');
  const mediumPriorityList = allRecs.filter((r) => r.priority === 'medium');
  const winsList = allRecs.filter((r) => r.category === 'positive_reinforcement' || r.priority === 'low');

  const highCount = highPriorityList.length;
  const mediumCount = mediumPriorityList.length;
  const winsCount = winsList.length;

  // Twin Health Calculation (0 to 100)
  const healthScore = Math.max(
    25,
    Math.min(
      100,
      100 - highCount * 25 - mediumCount * 12 + (winsCount > 0 ? 8 : 0)
    )
  );

  // SVG Ring Calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const healthColor =
    healthScore >= 80
      ? 'text-teal-600 dark:text-teal-400 stroke-teal-500'
      : healthScore >= 55
      ? 'text-amber-600 dark:text-amber-400 stroke-amber-500'
      : 'text-rose-600 dark:text-rose-400 stroke-rose-500';

  const healthLabel =
    healthScore >= 80
      ? 'Optimal Stability'
      : healthScore >= 55
      ? 'Attention Recommended'
      : 'Action Required';

  // Active / Filtered Items
  const activeRecs = allRecs.filter((r) => !dismissedIds.has(r.id));
  const dismissedList = allRecs.filter((r) => dismissedIds.has(r.id));

  const filteredRecs = activeRecs.filter((r) => {
    if (filterDomain === 'all') return true;
    if (filterDomain === 'wins') return r.category === 'positive_reinforcement' || r.priority === 'low';
    return r.domain === filterDomain;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ------------------------------------------------------------ */}
      {/* 1. HERO WITH COUNTS BY PRIORITY & TWIN HEALTH RING          */}
      {/* ------------------------------------------------------------ */}
      <div className="bento-card p-6 sm:p-7 border border-[#E6DFD3] dark:border-[#2D2721]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Title & Overview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Heuristics &amp; Insights</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Actionable Intelligence &amp; Tips
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl">
              Cross-domain diagnostics continuously assessing personal runway, academic consistency, and recovery reserves against deterministic thresholds.
            </p>

            {/* Quick Priority Counters */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{highCount} High Priority</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{mediumCount} Medium Priority</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{winsCount} Healthy Wins</span>
              </div>
            </div>
          </div>

          {/* Right Column: Twin-Health Ring Gauge */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex items-center gap-5 shadow-sm">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-stone-200 dark:stroke-stone-800"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className={`${healthColor} transition-all duration-1000 ease-out`}
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black font-mono text-stone-900 dark:text-stone-100">
                    {healthScore}%
                  </span>
                  <span className="text-[9px] font-semibold uppercase text-stone-500 dark:text-stone-400">
                    Health
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Twin Health Score</span>
                </div>
                <div className={`text-xs font-bold ${healthColor.split(' ')[0]}`}>
                  {healthLabel}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-[170px] leading-tight">
                  Aggregated index based on cross-domain rule clearances and risk metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. FILTER CHIPS & DISMISSED DRAWER TRIGGER                   */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'finance', label: 'Finance' },
            { id: 'study', label: 'Study' },
            { id: 'habits', label: 'Habits' },
            { id: 'wins', label: 'Healthy Wins' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterDomain(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                filterDomain === tab.id
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-sm'
                  : 'bg-white dark:bg-[#1C1A17] border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300 hover:border-stone-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {dismissedList.length > 0 && (
          <button
            onClick={() => setShowDismissedDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[#E6DFD3] dark:border-[#2D2721] text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Dismissed ({dismissedList.length})</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 3. BENTO GRID OF RECOMMENDATIONS & WINS                      */}
      {/* ------------------------------------------------------------ */}
      {filteredRecs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecs.map((rec: RecommendationItem) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onDismiss={handleDismiss}
              onActSuccess={handleActSuccess}
            />
          ))}
        </div>
      ) : (
        <div className="bento-card p-12 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            No Active Suggestions
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
            {dismissedIds.size > 0
              ? 'All suggestions in this category have been dismissed.'
              : 'All your current telemetry parameters meet or exceed reference health baselines!'}
          </p>
          {dismissedIds.size > 0 && (
            <button
              onClick={handleRestoreAll}
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline pt-2 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore all dismissed suggestions ({dismissedIds.size})</span>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* 4. DISMISSED DRAWER WITH UNDO                                */}
      {/* ------------------------------------------------------------ */}
      {showDismissedDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-md h-full bg-white dark:bg-[#1C1A17] border-l border-[#E6DFD3] dark:border-[#2D2721] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E6DFD3] dark:border-[#2D2721] mb-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-stone-500" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Dismissed Recommendations ({dismissedList.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowDismissedDrawer(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {dismissedList.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-0.5">
                        {rec.domain}
                      </span>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {rec.title}
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 mt-1">
                        {rec.explanation}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUndoDismiss(rec.id)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#201D1A] border border-[#E6DFD3] dark:border-[#2D2721] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition whitespace-nowrap shadow-sm"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between gap-3">
              <button
                onClick={handleRestoreAll}
                className="w-full py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Restore All Suggestions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* 5. SMALL FOOTER DISCLAIMER (Instead of large banner)         */}
      {/* ------------------------------------------------------------ */}
      <div className="pt-6 border-t border-[#E6DFD3] dark:border-[#2D2721] text-center">
        <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed">
          <span className="font-semibold text-stone-700 dark:text-stone-300">Automated Heuristic Notice: </span>
          {data.disclaimer ||
            'Recommendations are generated algorithmically by deterministic multi-domain thresholds. Not certified financial, academic, or healthcare advice.'}
        </p>
      </div>
    </div>
  );
}
