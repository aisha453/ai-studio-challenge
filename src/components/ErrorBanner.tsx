import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      id="app-error-banner"
      className="p-3 sm:p-4 rounded-xl bg-rose-50/80 backdrop-blur-md border border-rose-200/80 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-2xs"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="truncate">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            id="error-retry-btn"
            onClick={onRetry}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-rose-500 hover:text-rose-800 hover:bg-rose-100/80 transition-colors cursor-pointer"
          aria-label="Dismiss error notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
