import React, { useState } from 'react';
import {
  Cloud, ShieldCheck, X, AlertCircle, Sparkles
} from 'lucide-react';
import { useFinHub } from '../context/FinHubContext';

export default function ConnectDriveModal({ isOpen, onClose }) {
  const { loginWithGoogle, syncStatus } = useFinHub();
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleConnect = () => {
    setErrorMsg('');
    loginWithGoogle(
      () => {
        onClose();
      },
      (err) => {
        setErrorMsg(err.message || 'Login failed. Please try again.');
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-scaleUp">

        {/* Top Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 text-white text-center relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Cloud className="w-8 h-8 text-emerald-400" />
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">Connect to Google Drive</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Sync your transactions, bank accounts, and loans between your phone app and this website automatically.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">100% Private & Direct</span>
                <p className="text-slate-500 mt-0.5">
                  Your financial data stays inside your private Google Drive folder (<strong>My Fin Hub</strong>). Zero external servers or data tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900">Seamless Two-Way Sync</span>
                <p className="text-emerald-800/80 mt-0.5">
                  Add an expense on your phone &rarr; view it here. Update your balance on web &rarr; view it on your phone!
                </p>
              </div>
            </div>
          </div>

          {/* 1-Click Sign in with Google */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleConnect}
              disabled={syncStatus === 'syncing'}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold text-sm py-3 px-4 rounded-2xl shadow-lg transition-all"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{syncStatus === 'syncing' ? 'Connecting to Drive...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
          >
            Cancel
          </button>
          <span className="text-[11px] text-slate-400">My Fin Hub</span>
        </div>

      </div>
    </div>
  );
}
