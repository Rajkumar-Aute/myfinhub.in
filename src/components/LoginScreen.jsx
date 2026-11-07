import React, { useState } from 'react';
import {
  Cloud, ShieldCheck, ArrowRight, BookOpen, Sparkles, AlertCircle, ExternalLink, Key
} from 'lucide-react';
import { useFinHub } from '../context/FinHubContext';
import { driveService } from '../services/driveService';

export default function LoginScreen({ onContinueOffline }) {
  const { loginWithGoogle, syncStatus, saveClientId } = useFinHub();
  const [errorMsg, setErrorMsg] = useState('');
  const [tempClientId, setTempClientId] = useState('');

  const handleGoogleSignInClick = () => {
    setErrorMsg('');
    loginWithGoogle(
      (profile) => {
        // Successfully authenticated via Google!
      },
      (err) => {
        setErrorMsg(err.message || 'Google Sign-in failed.');
      }
    );
  };

  const handleSaveClientIdAndRetry = (e) => {
    e.preventDefault();
    if (!tempClientId.trim()) return;
    saveClientId(tempClientId.trim());
    setErrorMsg('');
    loginWithGoogle(
      (profile) => {
        // Success!
      },
      (err) => {
        setErrorMsg(err.message || 'Google Sign-in failed.');
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white relative select-none overflow-hidden">
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full space-y-5">
        {/* App Logo & Title */}
        <div className="text-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl text-emerald-400">
            <BookOpen className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            My Fin Hub
          </h1>
          <p className="text-xs text-slate-300 font-medium">
            Personal Accounts Book to Record Daily Expenses & Income
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>100% Private • Stored in Your Personal Google Drive</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Error / One-Time Configuration Banner */}
          {errorMsg && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Web Client ID Needed to Trigger Google Popup</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                To show Google's official sign-in & password popup on a website, Google requires the app developer to provide an <strong>OAuth Web Client ID</strong>. Paste it below once (or add to <code>.env</code>):
              </p>

              <form onSubmit={handleSaveClientIdAndRetry} className="flex gap-2">
                <input
                  type="text"
                  placeholder="xxxx.apps.googleusercontent.com"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Save & Connect
                </button>
              </form>

              <div className="pt-1 flex items-center justify-end text-[11px]">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Google Cloud Credentials</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Single-Click Google Sign-in Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={syncStatus === 'syncing'}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-bold text-sm py-3.5 px-4 rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              {/* Official Google Multicolored G Logo */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{syncStatus === 'syncing' ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>

          {/* Key Google Drive Privacy Highlight Card */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white">Your Data, Your Google Drive</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded font-bold uppercase tracking-wider">Zero Server</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                All records stay strictly inside your own private Google Drive account. We operate zero databases — 100% private to you.
              </p>
            </div>
          </div>

          {/* Privacy Value Props */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>100% Private — stored only in your personal Google Drive</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Automatic real-time sync with Google Drive & mobile</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          My Fin Hub • Private & Secure
        </p>
      </div>
    </div>
  );
}
