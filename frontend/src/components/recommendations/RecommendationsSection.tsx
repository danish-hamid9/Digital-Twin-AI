'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { RecommendationResponse, RecommendationItem } from '@/lib/types';
import RecommendationCard from '@/components/recommendations/RecommendationCard';

export default function RecommendationsSection() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterDomain, setFilterDomain] = useState<string>('all');

  useEffect(() => {
    // Load previously dismissed IDs from localStorage if available
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
  };

  const handleRestoreDismissed = () => {
    setDismissedIds(new Set());
    try {
      localStorage.removeItem('dismissed_recommendation_ids');
    } catch (e) {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-slate-800/50 rounded-xl" />
          <div className="h-44 bg-slate-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || data.recommendations.length === 0) {
    return null;
  }

  // Filter out dismissed items
  const activeRecs = data.recommendations.filter((r) => !dismissedIds.has(r.id));
  const filteredRecs = filterDomain === 'all' ? activeRecs : activeRecs.filter((r) => r.domain === filterDomain);

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Actionable Behavioral Recommendations
            </h3>
            {data.high_priority_count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {data.high_priority_count} High Priority
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded automated heuristics calculated directly from your logged personal data and life thresholds.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-800 self-start sm:self-auto text-xs">
          {['all', 'finance', 'study', 'habits'].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDomain(d)}
              className={`px-2.5 py-1 rounded-lg font-medium capitalize transition ${
                filterDomain === d
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Educational Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-amber-300">Automated Heuristic Notice: </span>
          {data.disclaimer}
        </p>
      </div>

      {/* Cards Grid */}
      {filteredRecs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecs.map((rec: RecommendationItem) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
          <p className="text-xs text-slate-300">
            {dismissedIds.size > 0
              ? 'All active recommendations have been dismissed.'
              : 'No alerts match this filter.'}
          </p>
          {dismissedIds.size > 0 && (
            <button
              onClick={handleRestoreDismissed}
              className="text-xs text-sky-400 hover:text-sky-300 underline pt-1 font-medium"
            >
              Restore dismissed suggestions ({dismissedIds.size})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
