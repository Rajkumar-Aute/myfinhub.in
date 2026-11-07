import React, { useState } from 'react';
import {
  X, Cloud, Download, Upload, RefreshCw,
  Check, AlertTriangle, LogOut, CheckCircle, ShieldCheck
} from 'lucide-react';
import { useFinHub } from '../context/FinHubContext';

export default function SettingsModal({ isOpen, onClose }) {
  const {
    user,
    syncStatus,
    loginWithGoogle,
    logoutFromGoogle,
    syncWithDrive,
    exportBackupJson,
    importBackupJson,
    currencySymbol,
    currencyCode,
    updateCurrency,
    lastSyncTime
  } = useFinHub();

  const [importStatus, setImportStatus] = useState('');

  if (!isOpen) return null;

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const res = importBackupJson(text);
        if (res.success) {
          setImportStatus(`Success! Imported ${res.txCount} transactions and ${res.accCount} accounts.`);
        } else {
          setImportStatus(`Error: ${res.error}`);
        }
      } catch (err) {
        setImportStatus('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Settings & Cloud Sync</h2>
              <p className="text-xs text-gray-500">Google Drive & Local Data Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Section 1: Google Drive Sync */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                Google Drive Synchronization
              </span>
              {user ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">Offline mode</span>
              )}
            </div>

            {user ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-10 h-10 rounded-full border border-emerald-300" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {lastSyncTime && (
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Last synced: {new Date(lastSyncTime).toLocaleDateString()} {new Date(lastSyncTime).toLocaleTimeString ? new Date(lastSyncTime).toLocaleTimeString() : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => syncWithDrive()}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Sync with Drive Now'}</span>
                  </button>
                  <button
                    onClick={logoutFromGoogle}
                    className="py-2 px-3 text-red-600 hover:bg-red-50 border border-red-200 text-xs font-bold rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="text-xs text-gray-600">
                  Connect your Google account to sync transactions automatically between your phone app and this website via your personal Google Drive folder (<strong>My Fin Hub</strong>).
                </p>
                <button
                  onClick={() => loginWithGoogle()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Connect Google Drive</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Currency Preference */}
          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
            <span className="font-bold text-gray-800 text-xs block">Currency Preference</span>
            <div className="flex gap-2 flex-wrap">
              {['₹ (INR)', '$ (USD)', '€ (EUR)', '£ (GBP)', 'AED'].map((curr) => {
                const sym = curr.split(' ')[0];
                const code = curr.includes('(') ? curr.split('(')[1].replace(')', '') : 'AED';
                const isSelected = currencySymbol === sym;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => updateCurrency(sym, code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {curr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Offline JSON Backup & Restore */}
          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
            <div>
              <span className="font-bold text-purple-950 text-xs uppercase tracking-wider block">
                Independent Backup & Restore (Offline)
              </span>
              <p className="text-xs text-purple-900/80 mt-0.5">
                Transfer records directly between your phone and computer without any cloud account.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={exportBackupJson}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-purple-100/70 text-purple-900 border border-purple-300 font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-purple-700" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <p className={`text-xs font-semibold p-2 rounded-lg ${
                importStatus.startsWith('Error')
                  ? 'bg-red-100 text-red-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {importStatus}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
