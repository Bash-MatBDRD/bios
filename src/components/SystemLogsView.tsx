import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Flame, 
  Info, 
  Search, 
  Trash2, 
  Download, 
  ChevronRight, 
  X, 
  Copy, 
  Check,
  Terminal
} from 'lucide-react';
import { SystemErrorLog } from '../types/efi';
import { soundEngine } from '../utils/audio';

interface SystemLogsViewProps {
  logs: SystemErrorLog[];
  onClearLogs: () => void;
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({
  logs,
  onClearLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [subsystemFilter, setSubsystemFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SystemErrorLog | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
      const matchSubsystem = subsystemFilter === 'all' || log.subsystem === subsystemFilter;
      const matchSearch =
        searchTerm === '' ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.subsystem.toLowerCase().includes(searchTerm.toLowerCase());

      return matchSeverity && matchSubsystem && matchSearch;
    });
  }, [logs, severityFilter, subsystemFilter, searchTerm]);

  const copyStackTrace = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundEngine.playNotification();
    setTimeout(() => setCopied(false), 2000);
  };

  const exportLogs = () => {
    const content = logs.map((l) => `[${l.timestamp}] [${l.severity.toUpperCase()}] [${l.subsystem}] ${l.code}: ${l.message}\n${l.details || ''}\n${l.stackTrace || ''}\n---`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_diagnostic_logs_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl liquid-glass border border-white/15">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Historique des Erreurs Systèmes & Journal EFI
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Traçabilité intégrale des paniques du noyau (Kernel Panics), interruptions ACPI et défaillances matérielles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportLogs}
            className="px-3.5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors flex items-center gap-1.5"
            title="Exporter le journal complet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter le journal (.log)</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-3.5 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors flex items-center gap-1.5"
            title="Effacer le journal d'erreurs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl liquid-glass border border-white/10">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par code d'erreur, mot-clé ou sous-système..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Severity selector */}
          <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg transition-colors capitalize ${
                  severityFilter === sev
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev === 'all' ? 'Toutes' : sev === 'critical' ? 'Critiques' : sev === 'warning' ? 'Avertissements' : 'Infos'}
              </button>
            ))}
          </div>

          {/* Subsystem filter */}
          <select
            value={subsystemFilter}
            onChange={(e) => setSubsystemFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tous les sous-systèmes</option>
            <option value="KERNEL">KERNEL (Darwin)</option>
            <option value="ACPI">ACPI / EC</option>
            <option value="THERMAL">THERMAL</option>
            <option value="PCIE">PCIE / Bus</option>
            <option value="NVRAM">NVRAM / SPI</option>
            <option value="GOP">GOP / Vidéo</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl liquid-glass border border-white/10 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Info className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">Aucun événement correspondant</h4>
            <p className="text-xs">Le journal est vierge pour ces critères de recherche.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => {
              const isCrit = log.severity === 'critical';
              const isWarn = log.severity === 'warning';

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 sm:p-5 hover:bg-white/[0.03] transition-colors cursor-pointer flex items-start justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="shrink-0 mt-0.5">
                      {isCrit ? (
                        <div className="w-7 h-7 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                          <Flame className="w-4 h-4" />
                        </div>
                      ) : isWarn ? (
                        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Info className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isCrit
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {log.code}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">[{log.subsystem}]</span>
                        <span className="text-[11px] text-slate-500 font-mono">· {log.timestamp}</span>
                      </div>

                      <h4 className="text-xs font-semibold text-white tracking-tight line-clamp-1">
                        {log.message}
                      </h4>
                      {log.details && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center text-slate-500 group-hover:text-white transition-colors">
                    <span className="text-xs hidden sm:inline text-slate-400">Détails</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full p-6 rounded-3xl liquid-glass border border-white/20 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  selectedLog.severity === 'critical'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : selectedLog.severity === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {selectedLog.code}
                </span>
                <span className="text-xs font-mono text-slate-400">[{selectedLog.subsystem}]</span>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              <div>
                <span className="text-[11px] text-slate-500 font-mono block">Horodatage:</span>
                <span className="text-xs text-slate-300 font-mono">{selectedLog.timestamp}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-mono block">Message de panne :</span>
                <p className="text-xs text-white font-medium mt-0.5 leading-relaxed">
                  {selectedLog.message}
                </p>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-[11px] text-slate-500 font-mono block">Détails matériels :</span>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    {selectedLog.details}
                  </p>
                </div>
              )}

              {selectedLog.stackTrace && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500 font-mono">Trace de pile noyau (Kernel Backtrace) :</span>
                    <button
                      onClick={() => copyStackTrace(selectedLog.stackTrace || '')}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-2xl bg-black/70 border border-white/10 text-emerald-400 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
