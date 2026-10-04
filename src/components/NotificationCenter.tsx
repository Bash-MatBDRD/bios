import React from 'react';
import { 
  AlertTriangle, 
  Flame, 
  CheckCircle2, 
  Info, 
  X, 
  ArrowRight
} from 'lucide-react';
import { PushNotification } from '../types/efi';

interface NotificationCenterProps {
  notifications: PushNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        const isCritical = notif.severity === 'critical';
        const isWarning = notif.severity === 'warning';
        const isSuccess = notif.severity === 'success';

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out translate-x-0 opacity-100 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl border ${
              isCritical
                ? 'bg-red-950/70 border-red-500/40 text-red-100 shadow-[0_12px_40px_rgba(220,38,38,0.35)]'
                : isWarning
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-100 shadow-[0_12px_40px_rgba(245,158,11,0.3)]'
                : isSuccess
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-100 shadow-[0_12px_40px_rgba(16,185,129,0.25)]'
                : 'bg-slate-900/80 border-white/20 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
            }`}
          >
            {/* Header row: App Name / macOS style header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] font-medium tracking-wide">
              <div className="flex items-center gap-1.5 opacity-90">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold">GOLDENGATE HARDWARE MONITOR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60 font-mono text-[10px]">Maintenant</span>
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity"
                  aria-label="Fermer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content row */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {isCritical ? (
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Flame className="w-4 h-4 animate-bounce" />
                  </div>
                ) : isWarning ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : isSuccess ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold tracking-tight">{notif.title}</h4>
                <p className="text-[11px] mt-0.5 leading-relaxed opacity-90 line-clamp-2">
                  {notif.message}
                </p>

                {/* Action button if provided */}
                {notif.actionLabel && notif.onAction && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        notif.onAction?.();
                        onDismiss(notif.id);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center gap-1"
                    >
                      <span>{notif.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDismiss(notif.id)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
                    >
                      Ignorer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
