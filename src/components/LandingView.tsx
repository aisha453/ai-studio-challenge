import { useState } from 'react';
import { ShieldCheck, Sparkles, Lock, ArrowRight, BookOpen, Database, Cpu } from 'lucide-react';

interface LandingViewProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  authError: string | null;
}

export function LandingView({ onSignIn, isLoading, authError }: LandingViewProps) {
  const [attempting, setAttempting] = useState(false);

  const handleLoginClick = async () => {
    try {
      setAttempting(true);
      await onSignIn();
    } finally {
      setAttempting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative">
      <div className="w-full max-w-2xl text-center">
        {/* Security badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 text-slate-700 text-xs font-medium mb-6 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-slate-600" />
          <span>Private, Encrypted & User-Isolated Workspace</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
          A calm space for thoughtful multi-turn reflections.
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          Write freely, converse deeply with Gemini 3.6 Flash, and uncover constructive
          perspectives. Your journal entries and interaction history are strictly isolated to your
          private Firestore records.
        </p>

        {/* Error notification if any */}
        {authError && (
          <div
            id="auth-error-banner"
            className="mt-6 p-4 rounded-xl bg-rose-50/80 backdrop-blur-md border border-rose-200/80 text-rose-800 text-xs sm:text-sm text-left flex items-start gap-2.5 shadow-2xs"
          >
            <div className="h-5 w-5 rounded-full bg-rose-200/80 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
              !
            </div>
            <div>
              <p className="font-medium">Authentication Failed</p>
              <p className="text-rose-700 mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        {/* Call to action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="google-signin-btn"
            onClick={handleLoginClick}
            disabled={isLoading || attempting}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer backdrop-blur-md border border-white/20"
          >
            {/* Google G SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.94H1.3v3.13C3.32 21.36 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.33 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.61H1.3C.47 8.24 0 10.07 0 12s.47 3.76 1.3 5.39l4.03-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.37 0 3.32 2.64 1.3 6.61l4.03 3.13c.94-2.84 3.57-4.97 6.67-4.97z"
              />
            </svg>
            <span>
              {isLoading || attempting ? 'Authenticating with Google...' : 'Sign in with Google'}
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Feature Cards Grid (Single view, clean, high contrast) */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-white/65 backdrop-blur-xl border border-white/70 shadow-[0_4px_24px_0_rgba(15,23,42,0.04)] hover:bg-white/75 transition-all">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Firestore Isolation</h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Rules strictly restrict reads and writes to <code className="text-slate-800 bg-white/60 px-1 py-0.5 rounded border border-white/60">/users/{'{uid}'}</code>. No other user can query or see your journal entries.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/65 backdrop-blur-xl border border-white/70 shadow-[0_4px_24px_0_rgba(15,23,42,0.04)] hover:bg-white/75 transition-all">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Gemini 3.6 Flash</h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Multi-turn reflection engine with automated 4-model fallback ladder and status-code resilience for zero downtime.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/65 backdrop-blur-xl border border-white/70 shadow-[0_4px_24px_0_rgba(15,23,42,0.04)] hover:bg-white/75 transition-all">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Multi-Turn History</h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Seamlessly continue past reflections, generate executive summaries, and track recurring personal growth insights.
            </p>
          </div>
        </div>

        {/* Security pledge footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Zero password storage — identity delegated to secure Google OAuth</span>
        </div>
      </div>
    </div>
  );
}
