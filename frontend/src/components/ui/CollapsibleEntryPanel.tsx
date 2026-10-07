'use client';

import React, { useEffect } from 'react';
import { X, Sparkles, PlusCircle } from 'lucide-react';

interface CollapsibleEntryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  colorScheme?: 'teal' | 'indigo' | 'amber';
  children: React.ReactNode;
}

export default function CollapsibleEntryPanel({
  isOpen,
  onClose,
  title,
  badge,
  colorScheme = 'teal',
  children,
}: CollapsibleEntryPanelProps) {
  // Listen for Escape key to close the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const borderStyles =
    colorScheme === 'teal'
      ? 'border-teal-500/30 bg-teal-500/[0.04]'
      : colorScheme === 'indigo'
      ? 'border-indigo-500/30 bg-indigo-500/[0.04]'
      : 'border-amber-500/30 bg-amber-500/[0.04]';

  const iconStyles =
    colorScheme === 'teal'
      ? 'text-teal-600 dark:text-teal-400'
      : colorScheme === 'indigo'
      ? 'text-indigo-600 dark:text-indigo-400'
      : 'text-amber-600 dark:text-amber-400';

  return (
    <div
      role="region"
      aria-label={title}
      className={`bento-card mb-6 p-4 border rounded-2xl shadow-md transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-3 ${borderStyles}`}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/70 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <PlusCircle className={`w-4 h-4 ${iconStyles}`} />
          <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            {title}
          </h2>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full inner-panel text-stone-500 font-mono">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-stone-400 font-mono">
            Press Esc to cancel
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition"
            aria-label="Close entry form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
