'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CashFlowDataPoint } from '@/lib/types';
import { TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  currency?: string;
  savingsRate?: number;
}

const CustomTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (active && payload && payload.length) {
    const inc = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
    const exp = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
    const net = payload.find((p: any) => p.dataKey === 'net_savings')?.value || (inc - exp);
    const rate = inc > 0 ? ((net / inc) * 100).toFixed(1) : '0.0';

    return (
      <div className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-stone-800 dark:text-stone-200 border-b border-stone-100 dark:border-stone-800 pb-1 font-mono">
          {label}
        </div>
        <div className="flex items-center justify-between text-teal-700 dark:text-teal-400">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Income:
          </span>
          <span className="font-mono font-medium">
            {currency} {Number(inc).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
          <span className="flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Expenses:
          </span>
          <span className="font-mono font-medium">
            {currency} {Number(exp).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border-t border-stone-100 dark:border-stone-800/80 pt-1 flex items-center justify-between">
          <span className="text-stone-500 dark:text-stone-400">Net Savings:</span>
          <span className={`font-mono font-bold ${net >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600'}`}>
            {currency} {Number(net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
          <span>Savings Rate:</span>
          <span className="font-mono font-semibold">{rate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CashFlowChart({
  data,
  currency = 'USD',
  savingsRate = 0,
}: CashFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-stone-50/60 dark:bg-stone-900/30 border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col items-center justify-center p-6 text-center text-stone-500 text-xs">
        <TrendingUp className="w-8 h-8 text-stone-400 mb-2 stroke-1" />
        <p>No financial entries recorded in this time range.</p>
        <p className="text-[11px] text-stone-400 mt-0.5">Log income and expenses to view the cash flow trajectory.</p>
      </div>
    );
  }

  // Format short date for X-Axis (e.g. "Sep 15" or "09/15")
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.date.length > 5 ? d.date.slice(5) : d.date,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0F766E" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA580C" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#C2410C" stopOpacity={0.65} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#E6DFD3" strokeOpacity={0.6} strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="displayDate"
            stroke="#A8A29E"
            tick={{ fill: '#A8A29E', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#E6DFD3' }}
          />
          <YAxis
            stroke="#A8A29E"
            tick={{ fill: '#A8A29E', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />

          <Tooltip content={<CustomTooltip currency={currency} />} />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#78716C' }}
          />

          <Bar
            dataKey="income"
            name="Income"
            fill="url(#incomeGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="url(#expenseGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Line
            type="monotone"
            dataKey="net_savings"
            name="Net Savings"
            stroke="#4F46E5"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#4F46E5', stroke: '#312E81', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#818CF8' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
