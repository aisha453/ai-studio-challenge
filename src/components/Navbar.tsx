import { UserProfile } from '../types';
import { BookOpen, LogOut, Plus, ShieldCheck, History, Sparkles } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  isSaving?: boolean;
}

export function Navbar({
  user,
  onSignOut,
  onNewEntry,
  onToggleHistory,
  isHistoryOpen,
  isSaving,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/60 bg-white/65 backdrop-blur-xl shadow-[0_4px_20px_0_rgba(15,23,42,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900/95 text-white flex items-center justify-center shadow-xs border border-white/20 backdrop-blur-md">
            <BookOpen className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-base tracking-tight">
                Reflections
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-md text-slate-800 border border-white/80 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                Gemini 3.6 Flash
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Isolated Firestore</span>
              {isSaving && (
                <span className="text-amber-700 animate-pulse font-medium ml-2">
                  • Syncing...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right actions */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="history-toggle-btn"
              onClick={onToggleHistory}
              aria-label="Toggle past journal entries history"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all border backdrop-blur-md shadow-2xs ${
                isHistoryOpen
                  ? 'bg-slate-900/90 text-white border-slate-800'
                  : 'bg-white/60 text-slate-700 border-white/70 hover:bg-white/90'
              }`}
            >
              <History className={`w-4 h-4 ${isHistoryOpen ? 'text-slate-300' : 'text-slate-600'}`} />
              <span className="hidden sm:inline">Past Entries</span>
            </button>

            <button
              id="new-entry-navbar-btn"
              onClick={onNewEntry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-950 text-white transition-all shadow-xs border border-white/20 backdrop-blur-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-300" />
              <span>New Entry</span>
            </button>

            {/* User details */}
            <div className="h-6 w-px bg-white/60 hidden sm:block" />

            <div className="flex items-center gap-2.5 pl-1 bg-white/40 backdrop-blur-md border border-white/60 rounded-xl px-2 py-1 shadow-2xs">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  className="w-7 h-7 rounded-full border border-white/80 object-cover shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 border border-white/80 flex items-center justify-center font-semibold text-xs shadow-2xs">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-900 truncate max-w-[120px]">
                  {user.displayName || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email || 'Authenticated'}
                </span>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign out of account"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50/70 rounded-lg transition-colors cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
