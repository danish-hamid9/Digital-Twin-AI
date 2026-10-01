'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { api } from '@/lib/api';
import {
  Settings as SettingsIcon,
  Coins,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Sun,
  Moon,
  Monitor,
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
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [targetSavings, setTargetSavings] = useState(profile?.monthly_target_savings || 500);
  const [targetStudyHours, setTargetStudyHours] = useState(profile?.target_study_hours_week || 15);
  const [targetSleep, setTargetSleep] = useState(profile?.target_sleep_hours || 7.5);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await api.updateProfile({
        full_name: fullName,
        occupation: occupation,
        currency: currency,
        monthly_target_savings: Number(targetSavings),
        target_study_hours_week: Number(targetStudyHours),
        target_sleep_hours: Number(targetSleep),
      });
      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

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
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteData = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteData();
      logout();
    } catch (err: any) {
      setError(err.message || 'Failed to delete data');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-400" />
          User Settings & Preferences
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal digital twin targets, currency settings, and data rights.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile & Settings Form */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <h2 className="text-base font-semibold text-white">General & Domain Targets</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Occupation / Field
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Software Engineer / Student"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Preferred Currency (User Setting)
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Monthly Target Savings ({currency})
            </label>
            <input
              type="number"
              step="10"
              value={targetSavings}
              onChange={(e) => setTargetSavings(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Target Study Hours (Weekly)
            </label>
            <input
              type="number"
              step="0.5"
              value={targetStudyHours}
              onChange={(e) => setTargetStudyHours(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Target Sleep (Hours / Night)
            </label>
            <input
              type="number"
              step="0.25"
              value={targetSleep}
              onChange={(e) => setTargetSleep(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved successfully!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>

      {/* Appearance */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          Appearance
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Choose your preferred interface theme. Setting is saved locally and takes effect immediately.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            id="settings-light-mode-btn"
            onClick={() => { if (isDark) toggleTheme(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition ${
              !isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            id="settings-dark-mode-btn"
            onClick={() => { if (!isDark) toggleTheme(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition ${
              isDark
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
        </div>
      </div>

      {/* GDPR Data Rights Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          Data Rights & Privacy (GDPR / CCPA)
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          You retain full sovereignty over your digital twin data. You can download an offline archive of all your personal records, or execute a hard permanent cascade deletion.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Export My Data (JSON)</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium transition flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete My Data Permanently</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Permanently Delete Account & Twin?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action cannot be undone. All your finance entries, study sessions, habit logs, ML predictions, simulation snapshots, plans, and chat transcripts will be immediately purged.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
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
