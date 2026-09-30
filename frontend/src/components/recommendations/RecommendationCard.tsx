'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  ShieldCheck,
  TrendingDown,
  Clock,
  Compass,
} from 'lucide-react';
import { RecommendationItem } from '@/lib/types';

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

export default function RecommendationCard({
  recommendation,
  onDismiss,
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

  // Domain & Priority Accents
  const getPriorityBadge = () => {
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-400 border border-rose-800/80">
          <AlertTriangle className="w-3 h-3" />
          High Priority
        </span>
      );
    }
    if (priority === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800/80">
          <AlertCircle className="w-3 h-3" />
          Medium Priority
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
        <CheckCircle2 className="w-3 h-3" />
        Positive Status
      </span>
    );
  };

  const getDomainColor = () => {
    switch (domain) {
      case 'finance':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/10';
      case 'study':
        return 'text-indigo-400 border-indigo-500/30 bg-indigo-950/10';
      case 'habits':
        return 'text-amber-400 border-amber-500/30 bg-amber-950/10';
      default:
        return 'text-sky-400 border-sky-500/30 bg-sky-950/10';
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 relative group overflow-hidden ${
        priority === 'high'
          ? 'bg-slate-900/90 border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/10'
          : priority === 'medium'
          ? 'bg-slate-900/80 border-amber-500/20 hover:border-amber-500/40'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      } ${compact ? 'p-4' : 'p-5'}`}
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {getPriorityBadge()}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getDomainColor()}`}
          >
            {domain}
          </span>
        </div>

        {onDismiss && (
          <button
            onClick={() => onDismiss(id)}
            title="Dismiss suggestion"
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-white tracking-tight mb-2 group-hover:text-slate-100">
        {title}
      </h4>

      {/* Grounded Explanation with Citing Numbers */}
      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        {explanation}
      </p>

      {/* Metrics Citation Tag */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] mb-4">
        <div className="flex-1">
          <span className="text-slate-500 block text-[10px]">{user_metric_name}</span>
          <span className="font-mono font-bold text-slate-200">{user_metric_value}</span>
        </div>
        <div className="w-px h-6 bg-slate-800" />
        <div className="flex-1">
          <span className="text-slate-500 block text-[10px]">Reference Threshold</span>
          <span className="font-mono text-slate-400">{threshold_value}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pr-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="line-clamp-1">{action_text}</span>
        </div>

        {action_link && (
          <Link
            href={action_link}
            className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300 shrink-0 transition"
          >
            <span>Act</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
