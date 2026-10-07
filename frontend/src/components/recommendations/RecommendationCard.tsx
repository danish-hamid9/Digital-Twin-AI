'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { RecommendationItem } from '@/lib/types';
import { api } from '@/lib/api';

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  onDismiss?: (id: string) => void;
  onActSuccess?: (planTitle: string) => void;
  compact?: boolean;
}

export default function RecommendationCard({
  recommendation,
  onDismiss,
  onActSuccess,
  compact = false,
}: RecommendationCardProps) {
  const {
    id,
    domain,
    priority,
    category,
    title,
    explanation,
    action_text,
    action_link,
    user_metric_name,
    user_metric_value,
    threshold_value,
  } = recommendation;

  const [expandedWhy, setExpandedWhy] = useState(false);
  const [acting, setActing] = useState(false);
  const [acted, setActed] = useState(false);

  const isWin = category === 'positive_reinforcement' || priority === 'low';

  // Domain Styling
  const getDomainBadge = () => {
    switch (domain) {
      case 'finance':
        return {
          label: 'Finance',
          className: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
        };
      case 'study':
        return {
          label: 'Study',
          className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
        };
      case 'habits':
        return {
          label: 'Habits',
          className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        };
      default:
        return {
          label: 'General',
          className: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20',
        };
    }
  };

  // Severity Chip
  const getSeverityChip = () => {
    if (isWin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>Healthy Win</span>
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span>High Priority</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
        <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        <span>Medium Priority</span>
      </span>
    );
  };

  // Calculate Gauge Ratio
  const calculateGaugePercent = () => {
    const userNum = parseFloat(user_metric_value.replace(/[^0-9.-]/g, ''));
    const threshNum = parseFloat(threshold_value.replace(/[^0-9.-]/g, ''));

    if (isNaN(userNum) || isNaN(threshNum) || threshNum === 0) {
      return isWin ? 100 : 50;
    }
    const ratio = (userNum / threshNum) * 100;
    return Math.min(100, Math.max(8, Math.round(ratio)));
  };

  const gaugePercent = calculateGaugePercent();
  const domainBadge = getDomainBadge();

  // Handle "Act" Button Click
  const handleAct = async () => {
    if (acted) return;
    setActing(true);
    try {
      const planTitle = action_text || `Action: ${title}`;
      await api.createPlan({
        title: planTitle,
        description: `Generated from Recommendation: ${explanation} (Metric: ${user_metric_name} = ${user_metric_value} vs Threshold ${threshold_value})`,
        domain: domain,
        status: 'in_progress',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
      setActed(true);
      if (onActSuccess) {
        onActSuccess(planTitle);
      }
    } catch (err: any) {
      console.error('Failed to create plan from recommendation:', err);
      alert(err.message || 'Failed to create plan');
    } finally {
      setActing(false);
    }
  };

  return (
    <div
      className={`bento-card flex flex-col justify-between transition-all duration-200 border ${
        isWin
          ? 'border-emerald-500/30 bg-emerald-500/[0.02] hover:border-emerald-500/50'
          : priority === 'high'
          ? 'border-rose-500/30 bg-rose-500/[0.015] hover:border-rose-500/50'
          : 'border-amber-500/20 bg-amber-500/[0.01] hover:border-amber-500/40'
      } ${compact ? 'p-4' : 'p-5'}`}
    >
      <div>
        {/* Top Header Chips */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {getSeverityChip()}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${domainBadge.className}`}
            >
              {domainBadge.label}
            </span>
          </div>

          {onDismiss && (
            <button
              onClick={() => onDismiss(id)}
              title="Dismiss suggestion"
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-2 leading-snug">
          {title}
        </h3>

        {/* Explanation */}
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-4">
          {explanation}
        </p>

        {/* Metric vs Threshold Gauge */}
        <div className="p-3 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] mb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-stone-600 dark:text-stone-400">
              {user_metric_name}
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {user_metric_value}
              </span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-500 dark:text-stone-400">
                {threshold_value}
              </span>
            </div>
          </div>

          {/* Visual Gauge Bar */}
          <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isWin
                  ? 'bg-emerald-500'
                  : priority === 'high'
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${gaugePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
            <span>Current: <strong className="text-stone-800 dark:text-stone-200 font-mono">{user_metric_value}</strong></span>
            <span>Target: <strong className="text-stone-800 dark:text-stone-200 font-mono">{threshold_value}</strong></span>
          </div>
        </div>

        {/* Expandable "Why this?" Accordion */}
        <div className="mb-4">
          <button
            onClick={() => setExpandedWhy(!expandedWhy)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition py-1"
          >
            <span>Why this recommendation?</span>
            {expandedWhy ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {expandedWhy && (
            <div className="mt-2 p-3 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] text-[11px] text-stone-600 dark:text-stone-300 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Observed Metric:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">{user_metric_value}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Required Benchmark:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">{threshold_value}</span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 pt-1 border-t border-[#E6DFD3] dark:border-[#2D2721] leading-relaxed">
                Deterministic rule derived from multi-domain telemetry and personal targets. Not financial, medical, or academic advice.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] flex items-center justify-between gap-2">
        {action_link ? (
          <Link
            href={action_link}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition"
          >
            <span>Inspect Data</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        ) : (
          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Automated Heuristic</span>
          </span>
        )}

        <button
          onClick={handleAct}
          disabled={acting || acted}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
            acted
              ? 'bg-emerald-600 text-white cursor-default'
              : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white'
          } disabled:opacity-80`}
        >
          {acted ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Plan Created</span>
            </>
          ) : acting ? (
            <span>Creating...</span>
          ) : (
            <>
              <span>Act</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
