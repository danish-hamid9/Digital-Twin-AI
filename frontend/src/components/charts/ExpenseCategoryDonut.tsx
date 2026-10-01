'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { CategoryDistribution } from '@/lib/types';
import { PieChart as PieIcon } from 'lucide-react';

interface ExpenseCategoryDonutProps {
  data: CategoryDistribution[];
  currency?: string;
  totalExpenses?: number;
}

const COLORS = [
  '#EA580C', // Terracotta
  '#0D9488', // Mineral Teal
  '#4F46E5', // Royal Indigo
  '#D97706', // Warm Amber
  '#BE185D', // Deep Rose
  '#7C3AED', // Deep Violet
  '#2563EB', // Sapphire Blue
  '#059669', // Forest Green
  '#78716C', // Warm Stone
  '#475569', // Slate
];

const CustomTooltip = ({ active, payload, currency = 'USD' }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="p-2.5 bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl shadow-xl text-xs space-y-1">
        <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: payload[0].color }}
          />
          <span>{item.category}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-stone-600 dark:text-stone-300">
          <span className="text-stone-400 dark:text-stone-500">Amount:</span>
          <span className="font-mono font-medium">
            {currency} {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-stone-600 dark:text-stone-300">
          <span className="text-stone-400 dark:text-stone-500">Share:</span>
          <span className="font-mono font-semibold text-[#0D9488] dark:text-[#2DD4BF]">{item.percentage}%</span>
        </div>
        <div className="text-[10px] text-stone-400 dark:text-stone-500 text-right">
          {item.count} transaction{item.count !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }
  return null;
};

export default function ExpenseCategoryDonut({
  data,
  currency = 'USD',
  totalExpenses = 0,
}: ExpenseCategoryDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-stone-50/60 dark:bg-stone-900/30 border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col items-center justify-center p-6 text-center text-stone-500 text-xs">
        <PieIcon className="w-8 h-8 text-stone-400 mb-2 stroke-1" />
        <p>No categorized expenses in this date range.</p>
        <p className="text-[11px] text-stone-400 mt-0.5">Categorized expense entries will populate this chart.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      {/* Donut Chart */}
      <div className="relative w-full h-56 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  stroke="#FAF7F0"
                  strokeWidth={2}
                  className="transition-opacity duration-200 cursor-pointer dark:stroke-[#181614]"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Central Overlay Indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Total Spent</span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">
            {currency} {Number(totalExpenses).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Category List & Progress Bars */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {data.slice(0, 6).map((item, idx) => {
          const color = COLORS[idx % COLORS.length];
          const isSelected = activeIndex === idx;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`p-2 rounded-xl transition ${
                isSelected ? 'bg-stone-100 dark:bg-stone-800/80 shadow-sm' : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-stone-800 dark:text-stone-200 font-medium truncate">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-mono text-stone-800 dark:text-stone-200 font-semibold">
                    {currency} {Number(item.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="font-mono text-[11px] text-stone-400 w-9 text-right font-medium">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Mini Percentage Bar */}
              <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
