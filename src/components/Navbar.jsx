import React from 'react';
import { useFinHub } from '../context/FinHubContext';
import {
  BookOpen,
  Landmark,
  BarChart3,
  Settings,
  Cloud,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenBankAccounts, onOpenSettings, onOpenConnectDrive }) {
  const {
    user,
    syncStatus,
    syncMessage,
    lastSyncTime,
    syncWithDrive,
    logoutFromGoogle
  } = useFinHub();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  My Fin Hub
                </h1>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Web
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>100% Private • Stored on Google Drive</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/70 shadow-inner">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Accounts Book</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          </nav>

          {/* Right Actions: Sync, Profile, Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync Button (if logged in) */}
            {user && (
              <button
                onClick={() => syncWithDrive()}
                disabled={syncStatus === 'syncing'}
                title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleDateString()}` : 'Sync with Drive'}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-slate-700 text-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
                </span>
              </button>
            )}

            {/* Google User Profile or Connect Button */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/90 pl-2 pr-1.5 py-1 rounded-full border border-slate-700 text-xs">
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-6 h-6 rounded-full border border-emerald-500/40" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0">
                    {(user.name || user.email)?.[0] || 'G'}
                  </div>
                )}
                <span
                  title={user.email ? `${user.name || 'User'} (${user.email})` : user.name}
                  className="font-semibold text-slate-200 max-w-[180px] sm:max-w-[220px] truncate text-xs"
                >
                  {user.email || user.name || 'Google Account'}
                </span>
                <button
                  onClick={logoutFromGoogle}
                  title="Sign out from Google"
                  className="p-1 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-red-400"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenConnectDrive || onOpenSettings}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect Google Drive</span>
                <span className="sm:hidden">Drive</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              title="Settings & Cloud Backup"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus !== 'idle' && (
        <div className={`px-4 py-1 text-xs text-center font-semibold transition-all ${
          syncStatus === 'syncing' ? 'bg-blue-600 text-white' :
          syncStatus === 'success' ? 'bg-emerald-600 text-white' :
          'bg-rose-600 text-white'
        }`}>
          {syncMessage}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex border-t border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'dashboard' ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Accounts Book</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'reports' ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reports</span>
        </button>
      </div>
    </header>
  );
}
