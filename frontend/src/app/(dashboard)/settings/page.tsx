'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { api } from '@/lib/api';
import Toast from '@/components/ui/Toast';
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  Monitor,
  ShieldCheck,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar (USD - $)' },
  { code: 'EUR', name: 'Euro (EUR - €)' },
  { code: 'GBP', name: 'British Pound (GBP - £)' },
  { code: 'INR', name: 'Indian Rupee (INR - ₹)' },
  { code: 'CAD', name: 'Canadian Dollar (CAD - CA$)' },
  { code: 'AUD', name: 'Australian Dollar (AUD - AU$)' },
  { code: 'JPY', name: 'Japanese Yen (JPY - ¥)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
];

export default function SettingsPage() {
  const { profile, refreshProfile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Section 1: Profile
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');

  // Section 2: Targets
  const [targetSavings, setTargetSavings] = useState(profile?.monthly_target_savings || 500);
  const [targetStudyHours, setTargetStudyHours] = useState(profile?.target_study_hours_week || 15);
  const [targetSleep, setTargetSleep] = useState(profile?.target_sleep_hours || 7.5);

  // Appearance selection
  const [appearanceMode, setAppearanceMode] = useState<'light' | 'dark' | 'system'>(
    isDark ? 'dark' : 'light'
  );

  // State management
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOccupation(profile.occupation || '');
      setCurrency(profile.currency || 'USD');
      setTargetSavings(profile.monthly_target_savings || 500);
      setTargetStudyHours(profile.target_study_hours_week || 15);
      setTargetSleep(profile.target_sleep_hours || 7.5);
    }
  }, [profile]);

  useEffect(() => {
    const saved = localStorage.getItem('user_appearance_preference');
    if (saved === 'system') {
      setAppearanceMode('system');
    } else {
      setAppearanceMode(isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  // Handle Theme Switching
  const handleSelectTheme = (mode: 'light' | 'dark' | 'system') => {
    setAppearanceMode(mode);
    localStorage.setItem('user_appearance_preference', mode);

    if (mode === 'light') {
      if (isDark) toggleTheme();
    } else if (mode === 'dark') {
      if (!isDark) toggleTheme();
    } else {
      // System mode
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark !== isDark) {
        toggleTheme();
      }
    }
    setToastMessage(`Theme updated to ${mode.toUpperCase()}.`);
    setToastType('success');
  };

  // Handle Save Profile & Targets
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const sleepVal = Number(targetSleep);
    if (isNaN(sleepVal) || sleepVal < 4.0 || sleepVal > 10.0) {
      setError('Target sleep must be between 4.0 and 10.0 hours per night');
      setToastMessage('Target sleep must be between 4.0 and 10.0 hours per night');
      setToastType('error');
      setSaving(false);
      return;
    }

    try {
      await api.updateProfile({
        full_name: fullName,
        occupation: occupation,
        currency: currency,
        monthly_target_savings: Number(targetSavings),
        target_study_hours_week: Number(targetStudyHours),
        target_sleep_hours: sleepVal,
      });
      await refreshProfile();
      setToastMessage('Settings and targets saved successfully!');
      setToastType('success');
    } catch (err: any) {
      const msg = err.message || 'Failed to update settings';
      setError(msg);
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Data Export
  const handleExportData = async () => {
    setExporting(true);
    setError(null);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `digital_twin_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMessage('Complete GDPR data export downloaded.');
      setToastType('success');
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
      setToastMessage(err.message || 'Failed to export data');
      setToastType('error');
    } finally {
      setExporting(false);
    }
  };

  // Handle Typed Delete
  const handleDeleteData = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteData();
      logout();
    } catch (err: any) {
      const msg = err.message || 'Failed to delete data';
      setError(msg);
      setToastMessage(msg);
      setToastType('error');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header (4.5:1 Contrast Fixed) */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 dark:bg-stone-800 border border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300 text-xs font-bold uppercase tracking-wider mb-2">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>System &amp; Account Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2.5">
          User Settings &amp; Preferences
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
          Customize digital twin domain targets, interface themes, and GDPR sovereign data rights.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* ------------------------------------------------------------ */}
        {/* SECTION 1: PROFILE                                           */}
        {/* ------------------------------------------------------------ */}
        <div className="bento-card p-6 space-y-5 border border-[#E6DFD3] dark:border-[#2D2721]">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E6DFD3] dark:border-[#2D2721]">
            <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Profile &amp; Personal Context
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="w-full px-3.5 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Occupation / Field
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Computer Science Student / Engineer"
                className="w-full px-3.5 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Preferred Currency (Ledger &amp; Simulations)
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* SECTION 2: TARGETS (Sliders with Inline Hints)                */}
        {/* ------------------------------------------------------------ */}
        <div className="bento-card p-6 space-y-6 border border-[#E6DFD3] dark:border-[#2D2721]">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E6DFD3] dark:border-[#2D2721]">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Domain Targets &amp; Benchmarks
            </h2>
          </div>

          <div className="space-y-6">
            {/* Target 1: Monthly Savings */}
            <div className="p-4 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                    Monthly Target Savings ({currency})
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Emergency fund accumulation &amp; cash surplus reserve
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-teal-600 dark:text-teal-400">
                    {currency} {targetSavings.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="5000"
                step="25"
                value={targetSavings}
                onChange={(e) => setTargetSavings(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>{currency} 0 / mo</span>
                <span>{currency} 2,500</span>
                <span>{currency} 5,000+ / mo</span>
              </div>

              {/* Inline Hint */}
              <p className="text-[11px] text-stone-600 dark:text-stone-400 bg-white dark:bg-[#201D1A] p-2 rounded-lg border border-[#E6DFD3] dark:border-[#2D2721] leading-relaxed">
                💡 <span className="font-semibold text-stone-800 dark:text-stone-200">Rule of thumb:</span> Aim to save 15%–20% of net monthly income to maintain a minimum 3-month emergency runway.
              </p>
            </div>

            {/* Target 2: Weekly Study Hours */}
            <div className="p-4 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                    Target Study Hours (Weekly)
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Dedicated focus blocks and academic development
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {targetStudyHours} hrs / wk
                  </span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={targetStudyHours}
                onChange={(e) => setTargetStudyHours(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>0 hrs</span>
                <span>25 hrs</span>
                <span>50 hrs / wk</span>
              </div>

              {/* Inline Hint */}
              <p className="text-[11px] text-stone-600 dark:text-stone-400 bg-white dark:bg-[#201D1A] p-2 rounded-lg border border-[#E6DFD3] dark:border-[#2D2721] leading-relaxed">
                💡 <span className="font-semibold text-stone-800 dark:text-stone-200">Focus recommendation:</span> 12–20 hours/week provides strong retention without triggering cognitive fatigue.
              </p>
            </div>

            {/* Target 3: Sleep Hours */}
            <div className="p-4 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                    Target Sleep (Hours / Night)
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Restorative circadian baseline (validated 4.0h - 10.0h)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                    {targetSleep} hrs / night
                  </span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="4.0"
                max="10.0"
                step="0.25"
                value={targetSleep}
                onChange={(e) => setTargetSleep(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>4.0 hrs</span>
                <span>7.0 hrs (Baseline)</span>
                <span>10.0 hrs</span>
              </div>

              {/* Inline Hint */}
              <p className="text-[11px] text-stone-600 dark:text-stone-400 bg-white dark:bg-[#201D1A] p-2 rounded-lg border border-[#E6DFD3] dark:border-[#2D2721] leading-relaxed">
                💡 <span className="font-semibold text-stone-800 dark:text-stone-200">Sleep architecture:</span> CDC &amp; sleep scientists recommend 7.0–8.5 hours for memory consolidation and burnout reduction.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile &amp; Targets</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 3: APPEARANCE (Light / Dark / System Preview Cards)  */}
      {/* ------------------------------------------------------------ */}
      <div className="bento-card p-6 space-y-4 border border-[#E6DFD3] dark:border-[#2D2721]">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E6DFD3] dark:border-[#2D2721]">
          <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
            Interface Appearance &amp; Theme
          </h2>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Select your visual environment. Preferences take effect instantly and persist across sessions.
        </p>

        {/* 3 Preview Cards Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Light Mode */}
          <button
            type="button"
            id="settings-light-mode-btn"
            onClick={() => handleSelectTheme('light')}
            className={`p-4 rounded-2xl border text-left transition relative group ${
              appearanceMode === 'light'
                ? 'border-amber-500 ring-2 ring-amber-500/30 bg-[#F7F5EE] shadow-sm'
                : 'border-[#E6DFD3] dark:border-[#2D2721] bg-[#FAF7F0] dark:bg-[#181614] hover:border-amber-400'
            }`}
          >
            {/* Miniature UI Mockup */}
            <div className="w-full h-16 rounded-xl bg-[#F7F5EE] border border-[#E6DFD3] p-2 mb-3 shadow-inner flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-2 rounded bg-stone-300" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
              </div>
              <div className="w-full h-6 rounded-lg bg-white border border-[#E6DFD3] p-1 flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md bg-teal-500" />
                <div className="w-12 h-1.5 rounded bg-stone-200" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Light Theme
                </span>
              </div>
              {appearanceMode === 'light' && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                  ✓
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
              Warm ivory canvas with high contrast typography
            </span>
          </button>

          {/* Card 2: Dark Mode */}
          <button
            type="button"
            id="settings-dark-mode-btn"
            onClick={() => handleSelectTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition relative group ${
              appearanceMode === 'dark'
                ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-[#161412] shadow-sm'
                : 'border-[#E6DFD3] dark:border-[#2D2721] bg-[#FAF7F0] dark:bg-[#181614] hover:border-indigo-400'
            }`}
          >
            {/* Miniature UI Mockup */}
            <div className="w-full h-16 rounded-xl bg-[#141210] border border-[#2D2721] p-2 mb-3 shadow-inner flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-2 rounded bg-stone-700" />
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
              </div>
              <div className="w-full h-6 rounded-lg bg-[#1C1A17] border border-[#2D2721] p-1 flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md bg-teal-400" />
                <div className="w-12 h-1.5 rounded bg-stone-700" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Dark Theme
                </span>
              </div>
              {appearanceMode === 'dark' && (
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black">
                  ✓
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
              Obsidian and deep espresso low-glare surface
            </span>
          </button>

          {/* Card 3: System Mode */}
          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`p-4 rounded-2xl border text-left transition relative group ${
              appearanceMode === 'system'
                ? 'border-teal-500 ring-2 ring-teal-500/30 bg-[#FAF7F0] dark:bg-[#181614] shadow-sm'
                : 'border-[#E6DFD3] dark:border-[#2D2721] bg-[#FAF7F0] dark:bg-[#181614] hover:border-teal-400'
            }`}
          >
            {/* Miniature UI Mockup */}
            <div className="w-full h-16 rounded-xl bg-gradient-to-r from-[#F7F5EE] to-[#141210] border border-[#E6DFD3] dark:border-[#2D2721] p-2 mb-3 shadow-inner flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-2 rounded bg-stone-400 dark:bg-stone-600" />
                <Laptop className="w-3 h-3 text-stone-500 dark:text-stone-400" />
              </div>
              <div className="w-full h-6 rounded-lg bg-white/70 dark:bg-[#1C1A17]/80 border border-stone-300 dark:border-stone-700 p-1 flex items-center justify-center text-[9px] font-mono font-bold text-stone-700 dark:text-stone-300">
                AUTO SYNC
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  System Sync
                </span>
              </div>
              {appearanceMode === 'system' && (
                <span className="w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-black">
                  ✓
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
              Synchronize automatically with your OS preference
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 4: DATA & PRIVACY (GDPR Export, Typed Delete, Logins) */}
      {/* ------------------------------------------------------------ */}
      <div className="bento-card p-6 space-y-6 border border-[#E6DFD3] dark:border-[#2D2721]">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E6DFD3] dark:border-[#2D2721]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
            Data Sovereignty, Security &amp; Privacy (GDPR / CCPA)
          </h2>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          You retain full sovereignty over your digital twin telemetry. You can download an offline archive of all your personal records, inspect authenticated login events, or execute permanent cascade deletion.
        </p>

        {/* Link to Login History Tab Card */}
        <div className="p-4 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Security &amp; Login Event Ledger
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                Review your recent authenticated sessions, device OS versions, and truncated IP history.
              </p>
            </div>
          </div>

          <Link
            href="/history?tab=logins"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#201D1A] border border-[#E6DFD3] dark:border-[#2D2721] text-xs font-bold text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800 transition whitespace-nowrap shadow-sm"
          >
            <span>View Login History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Export & Delete Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-[#E6DFD3] dark:border-[#2D2721] text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>Export My Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationInput('');
              setShowDeleteModal(true);
            }}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Delete My Data Permanently</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL WITH TYPED CONFIRMATION            */}
      {/* ------------------------------------------------------------ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1A17] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Permanently Delete Account &amp; Digital Twin?
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                This operation is irreversible. All your financial entries, study sessions, habit logs, predictions, simulations, action plans, and security login records will be purged immediately.
              </p>
            </div>

            {/* Typed Confirmation Input */}
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
              <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                To confirm permanent deletion, please type <strong className="text-rose-600 font-mono">DELETE</strong> below:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 bg-white dark:bg-[#181614] border border-rose-300 dark:border-rose-900/60 rounded-lg text-xs font-mono text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteData}
                disabled={deleting || deleteConfirmationInput !== 'DELETE'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Delete Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
